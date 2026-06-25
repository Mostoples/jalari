/* ============================================================
   JALARI — ESP32-CAM Stream Server + Firebase IP Reporter
   ============================================================
   Fitur:
   1. Koneksi WiFi
   2. Inisialisasi kamera ESP32-CAM (AI-Thinker)
   3. MJPEG stream di port 81 (multi-client)
   4. Endpoint HTTP di port 80:
      - /          → halaman info
      - /cam.jpg   → single JPEG frame
      - /capture   → capture & simpan snapshot
      - /snapshot   → ambil snapshot terakhir
   5. Kirim IP ke Firebase RTDB saat boot
   ============================================================ */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include "esp_camera.h"

// ===== WiFi =====
const char* ssid     = "jalari";
const char* password = "jalari567348";

// ===== Firebase RTDB =====
String databaseURL = "https://jalari-eac18-default-rtdb.asia-southeast1.firebasedatabase.app/esp32cam.json";

// ===== CAMERA PINS (AI-Thinker ESP32-CAM) =====
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ===== SERVERS =====
WebServer server(80);
WiFiServer streamServer(81);

// ===== MJPEG STREAM =====
#define PART_BOUNDARY "jalariframe"
#define MAX_STREAM_CLIENTS 3
WiFiClient streamClients[MAX_STREAM_CLIENTS];

// ===== SNAPSHOT =====
static uint8_t* snapshotBuf = NULL;
static size_t   snapshotLen = 0;

// ===== IP global =====
String myIP = "";

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== JALARI ESP32-CAM ===");

  // ---- Init camera ----
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_LATEST;

  // Deteksi PSRAM → resolusi lebih tinggi
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 10;
    config.fb_count     = 2;
    Serial.println("PSRAM ditemukan → VGA, fb=2");
  } else {
    config.frame_size   = FRAMESIZE_QVGA;   // 320x240
    config.jpeg_quality = 14;
    config.fb_count     = 1;
    Serial.println("Tanpa PSRAM → QVGA, fb=1");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init GAGAL: 0x%x\n", err);
    Serial.println("Pastikan board = AI-Thinker ESP32-CAM");
    return;
  }
  Serial.println("Camera init OK");

  // Tweak sensor untuk kualitas lebih baik
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_vflip(s, 0);
    s->set_hmirror(s, 0);
    s->set_brightness(s, 1);
    s->set_saturation(s, 0);
  }

  // ---- WiFi ----
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi GAGAL! Restart...");
    ESP.restart();
  }
  Serial.println("\nWiFi Connected!");
  myIP = WiFi.localIP().toString();
  Serial.printf("IP: %s\n", myIP.c_str());

  // ---- HTTP Endpoints (port 80) ----
  setupHTTPRoutes();
  server.begin();
  Serial.printf("HTTP server: http://%s/\n", myIP.c_str());

  // ---- MJPEG Stream Server (port 81) ----
  streamServer.begin();
  Serial.printf("MJPEG stream: http://%s:81/stream\n", myIP.c_str());

  // ---- Kirim IP ke Firebase ----
  sendIPToFirebase(myIP);

  Serial.println("=== READY ===\n");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  server.handleClient();
  handleStreamClients();
  delay(1);
}

// ============================================================
//  HTTP ROUTES (port 80)
// ============================================================
void setupHTTPRoutes() {

  // Root → halaman info sederhana
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
      "<meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<title>JALARI ESP32-CAM</title>"
      "<style>body{font-family:sans-serif;background:#0c1f12;color:#e2f0e8;padding:20px;}"
      "a{color:#4ade80;} h2{color:#16a34a;} .box{background:#112616;padding:16px;"
      "border-radius:10px;margin:10px 0;} img{max-width:100%;border-radius:8px;}</style></head>"
      "<body><h2>🌿 JALARI ESP32-CAM</h2>"
      "<div class='box'><b>IP:</b> " + myIP + "<br>"
      "<b>Stream:</b> <a href='http://" + myIP + ":81/stream'>MJPEG Stream</a><br>"
      "<b>Snapshot:</b> <a href='/cam.jpg'>Single Frame</a></div>"
      "<div class='box'><h3>Live Preview</h3>"
      "<img src='http://" + myIP + ":81/stream' alt='Live Stream'></div>"
      "</body></html>";
    server.send(200, "text/html", html);
  });

  // Single JPEG frame
  server.on("/cam.jpg", HTTP_GET, []() {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      server.send(500, "text/plain", "Camera error");
      return;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
  });

  // Capture → simpan snapshot + return JPEG
  server.on("/capture", HTTP_GET, []() {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      server.send(500, "text/plain", "Camera error");
      return;
    }
    // Simpan ke buffer
    if (snapshotBuf) free(snapshotBuf);
    snapshotBuf = (uint8_t*)malloc(fb->len);
    if (snapshotBuf) {
      memcpy(snapshotBuf, fb->buf, fb->len);
      snapshotLen = fb->len;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
  });

  // Ambil snapshot terakhir
  server.on("/snapshot", HTTP_GET, []() {
    if (snapshotBuf && snapshotLen > 0) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send_P(200, "image/jpeg", (const char*)snapshotBuf, snapshotLen);
    } else {
      server.send(404, "text/plain", "Belum ada snapshot. Hit /capture dulu.");
    }
  });
}

// ============================================================
//  MJPEG STREAM (port 81 — multi-client)
// ============================================================
void handleStreamClients() {
  // Accept new client
  if (streamServer.hasClient()) {
    bool accepted = false;
    for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
      if (!streamClients[i] || !streamClients[i].connected()) {
        streamClients[i] = streamServer.available();
        // Kirim HTTP response header untuk MJPEG
        streamClients[i].println("HTTP/1.1 200 OK");
        streamClients[i].println("Access-Control-Allow-Origin: *");
        streamClients[i].println("Content-Type: multipart/x-mixed-replace; boundary=" PART_BOUNDARY);
        streamClients[i].println();
        Serial.printf("Stream client #%d connected\n", i);
        accepted = true;
        break;
      }
    }
    if (!accepted) {
      WiFiClient reject = streamServer.available();
      reject.println("HTTP/1.1 503 Too many clients");
      reject.println();
      reject.stop();
    }
  }

  // Cek apakah ada client yang aktif
  bool hasClient = false;
  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (streamClients[i] && streamClients[i].connected()) {
      hasClient = true;
      break;
    }
  }
  if (!hasClient) return; // Tidak perlu grab frame kalau tidak ada viewer

  // Grab satu frame, kirim ke semua client
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) return;

  char headerBuf[128];
  int headerLen = snprintf(headerBuf, sizeof(headerBuf),
    "\r\n--" PART_BOUNDARY "\r\n"
    "Content-Type: image/jpeg\r\n"
    "Content-Length: %d\r\n\r\n", fb->len);

  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (!streamClients[i] || !streamClients[i].connected()) continue;

    WiFiClient& cl = streamClients[i];

    // Kirim boundary header
    size_t written = cl.write((uint8_t*)headerBuf, headerLen);
    if (written == 0) { cl.stop(); continue; }

    // Kirim JPEG data dalam chunk
    uint8_t* buf = fb->buf;
    size_t remain = fb->len;
    while (remain > 0) {
      size_t chunk = (remain > 4096) ? 4096 : remain;
      size_t w = cl.write(buf, chunk);
      if (w == 0) break;
      buf    += w;
      remain -= w;
    }
    if (remain > 0) {
      // Gagal kirim semua → disconnect
      cl.stop();
      Serial.printf("Stream client #%d disconnected (write fail)\n", i);
    }
  }

  esp_camera_fb_return(fb);
}

// ============================================================
//  FIREBASE — kirim IP ke Realtime Database
// ============================================================
void sendIPToFirebase(String ip) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi putus, skip Firebase");
    return;
  }
  HTTPClient http;
  http.begin(databaseURL);
  http.addHeader("Content-Type", "application/json");

  // Payload: {"ip":"192.168.x.x","stream":"http://192.168.x.x:81/stream"}
  String payload = "{\"ip\":\"" + ip + "\","
                   "\"stream\":\"http://" + ip + ":81/stream\","
                   "\"capture\":\"http://" + ip + "/capture\","
                   "\"still\":\"http://" + ip + "/cam.jpg\"}";

  Serial.println("Kirim ke Firebase RTDB...");
  int code = http.PUT(payload);
  if (code > 0) {
    Serial.printf("Firebase OK: %d\n", code);
    Serial.println(http.getString());
  } else {
    Serial.printf("Firebase ERROR: %d\n", code);
  }
  http.end();
}