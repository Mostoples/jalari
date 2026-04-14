# DOKUMEN PERENCANAAN PROYEK
## Sistem Monitoring Limbah Program Makan Bergizi Gratis (MBG)
## Berbasis AIoT sebagai Dasar Pengelolaan Limbah dan Energi Berkelanjutan

**Nama Tim:** Adelio Fahri Faradish & Rafael Maruli Errando Sinaga  
**Institusi:** SMA Negeri 3 Yogyakarta  
**Kompetisi:** OPSI 2026 — Bidang FTR / Sistem Pengukuran & Monitoring Cerdas  
**Stack:** HTML · CSS · Vanilla JS · Firebase (Firestore + RTDB + Hosting + Auth)  
**Tanggal Dokumen:** April 2026

---

## SISTEMATIKA LITERATUR REVIEW
### (Menggunakan Konektor: WebSearch / IEEE Xplore / PubMed / MDPI / ScienceDirect / ResearchGate)

### A. Protokol Pencarian
| Parameter         | Nilai                                                                                  |
|-------------------|----------------------------------------------------------------------------------------|
| Database          | IEEE Xplore, MDPI Sensors, ScienceDirect, PMC/PubMed, ResearchGate, Frontiers         |
| Periode           | 2020 – 2026                                                                            |
| Kata Kunci Utama  | "AIoT waste monitoring", "IoT food waste", "smart waste dashboard Firebase", "circular economy waste IoT" |
| Inklusi           | Peer-reviewed / preprint, full-text tersedia, relevan dengan IoT/AI/waste monitoring   |
| Ekslusi           | Artikel duplikat, scope non-teknis, tahun < 2020                                       |

### B. Matriks Literatur Terpilih

| No | Judul & Sumber | Temuan Utama | Metodologi | Relevansi |
|----|----------------|--------------|------------|-----------|
| 1 | *IoT-Enabled Real-Time Monitoring of Urban Garbage Levels Using Time-of-Flight Sensing Technology* — MDPI Sensors 2025 | VL53L8CX + ESP32-S3; akurasi fill-level ±3.2%, latency 2.1 detik, uptime 98.7% | Eksperimen hardware + cloud | Desain sensor ultrasonik & threshold alert pada sistem ini |
| 2 | *Smart Waste Management and Classification System Using Advanced IoT and AI Technologies* — PMC 2025 | CNN + SVM untuk klasifikasi organik/anorganik; WSN multi-node; integrasi cloud dashboard | R&D IoT + ML | Dasar modul klasifikasi limbah AI pada sistem ini |
| 3 | *Artificial Intelligence and IoT Driven System Architecture for Municipality Waste Management in Smart Cities: A Review* — ScienceDirect 2024 | Review 120 artikel; AIoT mengurangi biaya pengangkutan sampah 30-40%; arsitektur 4-layer (sensor → gateway → cloud → dashboard) | Systematic review | Kerangka arsitektur 4-layer yang diadopsi pada sistem ini |
| 4 | *Cloud-Enabled IoT System for Real-Time Environmental Monitoring and Remote Device Control Using Firebase* — arXiv 2025 | Firebase RTDB + ESP32 + DHT22 + HC-SR04; sukses rate transmisi 99.2%, kontrol latensi <1.5s | Eksperimen cloud-IoT | Dasar integrasi Firebase RTDB untuk streaming sensor |
| 5 | *Using Circular Economy to Manage Organic and Inorganic Waste with IoT-Based Monitoring System* — IIETA I2M 2025 | Model ekonomi sirkular berbasis IoT; penghematan biaya pengelolaan limbah organik 28% | Implementasi sistem | Dasar kalkulasi nilai ekonomi & energi sirkular |
| 6 | *Towards Data-Driven Smart Composting Techniques and Control Systems* — ScienceDirect 2025 | IoT sensor suhu, kelembapan, pH untuk optimasi kompos; prediksi waktu panen kompos menggunakan LSTM | Eksperimen IoT + ML | Dasar fitur konversi energi biogas/kompos |
| 7 | *Food Waste Valorisation for Biogas-Based Bioenergy Production in Circular Bioeconomy* — Frontiers in Energy Research 2022 | Anaerobic digestion food waste → biogas; 1 kg limbah organik ≈ 0.4–0.6 m³ biogas | Review biokimia | Rumus konversi potensi energi biogas pada dashboard |
| 8 | *Advancing Sustainability Through an IoT-Driven Smart Waste Management System* — MDPI Sustainability 2025 | End-to-end sistem IoT + dashboard; notifikasi real-time; integrasi multi-stakeholder | Pengembangan sistem | Referensi fitur notifikasi & multi-role user |
| 9 | *A Low-Cost IoT System Based on ESP32 for Monitoring Anaerobic Biogas Reactor* — MDPI Applied Sciences 2025 | ESP32 + MQ-4 + sensor pH + suhu; monitoring biogas reaktor skala kecil, biaya <$50 | Rancang bangun | Konfigurasi sensor MQ-4 dan pH pada hardware |
| 10 | *Wireless Sensor Network Machine Learning Framework for Smart Cities in Intelligent Waste Management* — PMC 2024 | WSN + Random Forest classifier; akurasi klasifikasi 94.3%; integrasi kota | ML + WSN | Validasi pendekatan klasifikasi berbasis ML |

### C. Kesenjangan Penelitian (Research Gap)
Dari 10 literatur di atas, **tidak ada** penelitian yang secara spesifik:
1. Mengintegrasikan monitoring limbah dengan konteks **Program Makan Bergizi Gratis (MBG)** Indonesia
2. Menyajikan **kalkulasi nilai ekonomi-energi sirkular** dari data sensor secara real-time di dashboard web
3. Menggunakan **Firebase** sebagai platform cloud sekaligus hosting untuk SPA monitoring limbah pangan institusional

**Novelty penelitian ini:** Sistem AIoT + SPA Firebase yang menjembatani data sensor lapangan MBG → dashboard analitik → rekomendasi pengelolaan limbah & energi berkelanjutan dalam satu platform terpadu.

---

---

# BATCH PAGE 1 — OVERVIEW PROYEK & ARSITEKTUR SISTEM

## 1.1 Deskripsi Proyek

Sistem **JALARI** (**J**alur **A**nalitik **L**imbah **A**rtificial Intelligence & **R**eal-time **I**oT) adalah Single Page Application berbasis web yang berfungsi sebagai:

1. **Dashboard monitoring real-time** — menampilkan data sensor dari perangkat IoT (ESP32) yang dipasang di titik SPPG / sekolah pelaksana MBG
2. **Platform analitik limbah** — mengklasifikasikan, menghitung volume & berat limbah organik/anorganik secara otomatis
3. **Kalkulator energi berkelanjutan** — mengonversi data limbah menjadi estimasi potensi biogas, kompos, dan nilai ekonomi
4. **Pusat pelaporan** — menghasilkan laporan harian/mingguan/bulanan yang dapat diunduh

## 1.2 Tujuan Teknis Sistem

```
Input  → Sensor IoT (ESP32) membaca berat, volume, gas, pH, suhu
         ↓
Stream → Firebase Realtime Database (RTDB) via MQTT over HTTP/REST
         ↓
Store  → Firestore (data historis terstruktur)
         ↓
Process → Logika AI/analitik di sisi klien (JS)
         ↓
Output → Dashboard SPA (HTML/CSS/JS) di Firebase Hosting
         ↓
Action → Notifikasi, laporan, rekomendasi pengelolaan
```

## 1.3 Arsitektur 4-Layer (Mengacu Literatur No. 3)

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — PRESENTATION (SPA Firebase Hosting)              │
│  HTML + CSS + Vanilla JS                                     │
│  Dashboard · Charts · Alerts · Reports                       │
└────────────────────────┬────────────────────────────────────┘
                         │ Firebase SDK (JS)
┌────────────────────────▼────────────────────────────────────┐
│  LAYER 3 — CLOUD PLATFORM (Firebase)                        │
│  Firebase Auth · Firestore · RTDB · Storage · Hosting        │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / Firebase REST
┌────────────────────────▼────────────────────────────────────┐
│  LAYER 2 — GATEWAY / EDGE                                   │
│  ESP32 Dev Board (Wi-Fi onboard)                            │
│  Arduino firmware → HTTP PUT ke Firebase RTDB               │
└────────────────────────┬────────────────────────────────────┘
                         │ I2C / SPI / Analog
┌────────────────────────▼────────────────────────────────────┐
│  LAYER 1 — SENSOR NODE                                      │
│  Load Cell + HX711 · HC-SR04 · MQ-4 · pH Sensor · DS18B20  │
└─────────────────────────────────────────────────────────────┘
```

## 1.4 Stack Teknologi

| Komponen       | Teknologi                        | Alasan Pemilihan                              |
|----------------|----------------------------------|-----------------------------------------------|
| Frontend       | HTML5 + CSS3 + Vanilla JS (ES6+) | Ringan, tanpa framework, mudah deploy         |
| Charting       | Chart.js v4                      | Open-source, ringan, real-time support        |
| Icons          | Lucide Icons (CDN)               | Konsisten, SVG native                         |
| Database RT    | Firebase Realtime Database       | Low-latency streaming sensor data             |
| Database Store | Cloud Firestore                  | Query kompleks, histori, laporan              |
| Auth           | Firebase Authentication          | Multi-role login (admin/operator/viewer)      |
| Hosting        | Firebase Hosting                 | CDN global, HTTPS otomatis, CI/CD mudah       |
| Storage        | Firebase Storage                 | Simpan file laporan PDF/CSV                   |
| Notifikasi     | Firebase Cloud Messaging (FCM)   | Push notif browser (alert threshold)          |

## 1.5 Alur Data Real-Time

```
ESP32                Firebase RTDB              SPA Dashboard
  │                       │                          │
  ├─ Baca sensor ─────────►                          │
  │  (setiap 5 detik)      │                          │
  │                        ├─ onValue() listener ────►│
  │                        │                          ├─ Update chart
  │                        │                          ├─ Update angka
  │                        │                          ├─ Cek threshold
  │                        │                          └─ Simpan ke Firestore
```

## 1.6 Struktur Direktori Proyek

```
jalari/
├── public/
│   ├── index.html          ← Entry point SPA
│   ├── css/
│   │   ├── main.css        ← Base styles + CSS variables
│   │   ├── dashboard.css   ← Dashboard layout
│   │   ├── charts.css      ← Chart wrappers
│   │   ├── sidebar.css     ← Navigation sidebar
│   │   └── responsive.css  ← Media queries
│   ├── js/
│   │   ├── app.js          ← Router + init
│   │   ├── firebase.js     ← Firebase config & init
│   │   ├── auth.js         ← Authentication logic
│   │   ├── realtime.js     ← RTDB listeners
│   │   ├── firestore.js    ← Firestore CRUD
│   │   ├── charts.js       ← Chart.js instances
│   │   ├── analytics.js    ← Kalkulasi AI/energi
│   │   ├── notifications.js← Alert & FCM
│   │   ├── reports.js      ← Generate laporan
│   │   └── utils.js        ← Helper functions
│   ├── pages/
│   │   ├── dashboard.html  ← Halaman utama
│   │   ├── sensors.html    ← Detail sensor
│   │   ├── analytics.html  ← AI & Energi
│   │   ├── history.html    ← Data historis
│   │   ├── reports.html    ← Laporan
│   │   ├── settings.html   ← Pengaturan
│   │   └── login.html      ← Login
│   └── assets/
│       ├── icons/
│       └── images/
├── firebase.json           ← Firebase Hosting config
├── .firebaserc             ← Project alias
├── firestore.rules         ← Security rules
├── database.rules.json     ← RTDB security rules
└── firestore.indexes.json  ← Composite indexes
```

---

# BATCH PAGE 2 — DESAIN UI/UX & KOMPONEN ANTARMUKA

## 2.1 Filosofi Desain

Sistem JALARI mengikuti prinsip **"Data-First Dashboard"** — setiap elemen visual dirancang untuk menyampaikan informasi sensor secepat mungkin, dengan hierarki visual yang jelas:

1. **Status real-time** (angka besar, warna status) → paling mencolok
2. **Tren historis** (grafik) → konteks temporal
3. **Rekomendasi AI** (card insight) → actionable output
4. **Detail & laporan** → accessible tapi tidak mengganggu

## 2.2 Sistem Warna (CSS Custom Properties)

```css
/* Palet utama — identitas hijau keberlanjutan */
--color-primary:       #16a34a;   /* Hijau utama */
--color-primary-dark:  #15803d;
--color-primary-light: #bbf7d0;
--color-secondary:     #0284c7;   /* Biru IoT */
--color-accent:        #d97706;   /* Kuning warning */
--color-danger:        #dc2626;   /* Merah alert */

/* Sensor status */
--color-organic:       #16a34a;   /* Limbah organik */
--color-inorganic:     #2563eb;   /* Limbah anorganik */
--color-biogas:        #7c3aed;   /* Potensi biogas */
--color-energy:        #d97706;   /* Energi */

/* Backgrounds */
--bg-primary:    #f0fdf4;
--bg-card:       #ffffff;
--bg-sidebar:    #052e16;
--bg-dark:       #14532d;

/* Typography */
--font-main:     'Inter', sans-serif;
--font-mono:     'JetBrains Mono', monospace; /* Untuk angka sensor */
```

## 2.3 Layout Grid Utama (CSS Grid)

```
┌──────────────────────────────────────────────────────────────┐
│  TOPBAR  — Logo | SPPG Name | Status | User | Notif | Time  │
├──────────┬───────────────────────────────────────────────────┤
│          │  BREADCRUMB + PAGE TITLE                         │
│ SIDEBAR  ├───────────────────────────────────────────────────┤
│  (240px) │  STAT CARDS ROW (4 kartu ringkasan)              │
│          ├───────────────────────────────────────────────────┤
│  Nav:    │  MAIN CONTENT AREA (grid 2 kolom)                │
│  • Home  │  ┌─────────────────┐  ┌────────────────────────┐ │
│  • Sensor│  │  Real-time      │  │  7-Day Trend Chart     │ │
│  • AI    │  │  Weight Chart   │  │  (Line Chart)          │ │
│  • Hist  │  └─────────────────┘  └────────────────────────┘ │
│  • Report│  ┌─────────────────┐  ┌────────────────────────┐ │
│  • Set   │  │  Waste Donut    │  │  AI Recommendations    │ │
│          │  │  (Org vs Inorg) │  │  Card                  │ │
│          │  └─────────────────┘  └────────────────────────┘ │
│          ├───────────────────────────────────────────────────┤
│          │  SENSOR TABLE — Status semua sensor               │
└──────────┴───────────────────────────────────────────────────┘
```

## 2.4 Komponen UI — Daftar Lengkap

### 2.4.1 Stat Card
```
┌─────────────────────────┐
│  [Icon]   Berat Organik │
│                         │
│  47.2 kg               │
│  ████████░░  82%        │
│  ↑ +3.2 kg dari kemarin│
└─────────────────────────┘
```
Digunakan untuk: Total berat organik, total berat anorganik, potensi biogas hari ini, potensi nilai ekonomi

### 2.4.2 Sensor Status Row
```
┌────────┬────────┬───────────┬──────────┬──────────┐
│ Load   │ HC-SR04│ MQ-4 Gas  │ pH Meter │ Suhu     │
│ Cell   │ Level  │ Biogas    │          │ DS18B20  │
│ 47.2kg │  82%   │  OK (0.3%)│  6.8     │  37°C    │
│ ● Live │ ● Live │ ● Live    │ ● Live   │ ● Live   │
└────────┴────────┴───────────┴──────────┴──────────┘
```

### 2.4.3 Real-Time Line Chart (Chart.js)
- X-axis: waktu (rolling window 60 menit terakhir)
- Y-axis: berat (kg) dual — organik (hijau) & anorganik (biru)
- Update interval: setiap 5 detik via RTDB listener

### 2.4.4 Waste Composition Donut
- Persentase organik vs anorganik hari ini
- Center label: total kg
- Animasi re-draw saat data baru masuk

### 2.4.5 Alert Banner
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ PERINGATAN: Tempat sampah organik mencapai 90% kapasitas│
│  Kapasitas: 52.2 kg / 60 kg  [Lihat Detail] [Abaikan]      │
└─────────────────────────────────────────────────────────────┘
```

### 2.4.6 AI Insight Card
```
┌─────────────────────────────────────┐
│  🤖 Rekomendasi AI                  │
│                                     │
│  Berdasarkan 7 hari terakhir:       │
│  • Puncak limbah: Senin 11:00–13:00 │
│  • Potensi biogas minggu ini: 18 m³ │
│  • Estimasi kompos: 24 kg/minggu    │
│  • Nilai ekonomi: Rp 42.000/minggu  │
│                                     │
│  [Lihat Analisis Lengkap →]         │
└─────────────────────────────────────┘
```

## 2.5 Navigasi SPA (Client-Side Router)

```javascript
routes = {
  '/'           → halaman Dashboard (home)
  '/sensors'    → halaman Detail Sensor
  '/analytics'  → halaman AI & Energi
  '/history'    → halaman Data Historis
  '/reports'    → halaman Laporan
  '/settings'   → halaman Pengaturan
  '/login'      → halaman Login
}
// Routing via hash (#/) atau History API
// Setiap page-change: destroy chart lama, init chart baru
```

## 2.6 Responsivitas

| Breakpoint    | Layout                                          |
|---------------|-------------------------------------------------|
| ≥1280px       | Sidebar tetap + grid 2 kolom                   |
| 768–1279px    | Sidebar collapsible + grid 2 kolom             |
| <768px        | Sidebar sebagai bottom nav + grid 1 kolom      |

## 2.7 Aksesibilitas & UX Detail
- Semua chart memiliki `aria-label` deskriptif
- Warna status selalu disertai ikon (tidak hanya warna)
- Sensor offline ditampilkan dengan badge "OFFLINE" merah + timestamp terakhir
- Skeleton loading saat data sedang di-fetch
- Dark mode opsional (toggle di settings, disimpan di localStorage)

---

# BATCH PAGE 3 — SKEMA DATABASE FIREBASE & AUTENTIKASI

## 3.1 Firebase Realtime Database (RTDB)
### Fungsi: Streaming data sensor real-time (low-latency)

```json
// Struktur RTDB — /jalari-eac18-default-rtdb.firebaseio.com/
{
  "devices": {
    "sppg-sman3-yk": {
      "info": {
        "name": "SPPG SMAN 3 Yogyakarta",
        "location": "Jl. Yos Sudarso No.7, Yogyakarta",
        "status": "online",
        "last_seen": 1744000000000
      },
      "sensors": {
        "load_cell_organic": {
          "value": 47.2,
          "unit": "kg",
          "status": "normal",
          "timestamp": 1744000000000
        },
        "load_cell_inorganic": {
          "value": 12.8,
          "unit": "kg",
          "status": "normal",
          "timestamp": 1744000000000
        },
        "ultrasonic_organic": {
          "value": 82,
          "unit": "%",
          "status": "warning",
          "timestamp": 1744000000000
        },
        "ultrasonic_inorganic": {
          "value": 43,
          "unit": "%",
          "status": "normal",
          "timestamp": 1744000000000
        },
        "mq4_biogas": {
          "value": 0.3,
          "unit": "%CH4",
          "status": "normal",
          "timestamp": 1744000000000
        },
        "ph_sensor": {
          "value": 6.8,
          "unit": "pH",
          "status": "normal",
          "timestamp": 1744000000000
        },
        "temperature": {
          "value": 37.0,
          "unit": "°C",
          "status": "normal",
          "timestamp": 1744000000000
        }
      },
      "thresholds": {
        "load_cell_organic_max": 60,
        "load_cell_inorganic_max": 30,
        "ultrasonic_warning": 80,
        "ultrasonic_critical": 95,
        "mq4_warning": 1.0,
        "ph_min": 5.5,
        "ph_max": 8.5,
        "temp_max": 60
      }
    }
  }
}
```

## 3.2 Cloud Firestore
### Fungsi: Penyimpanan data historis, laporan, konfigurasi

```
firestore/
├── Collection: sppg_profiles
│   └── Doc: sppg-sman3-yk
│       ├── name: "SPPG SMAN 3 Yogyakarta"
│       ├── address: "..."
│       ├── coordinator: "..."
│       ├── capacity_organic_kg: 60
│       ├── capacity_inorganic_kg: 30
│       └── created_at: Timestamp
│
├── Collection: sensor_logs
│   └── Doc: auto-id
│       ├── device_id: "sppg-sman3-yk"
│       ├── timestamp: Timestamp
│       ├── load_cell_organic: 47.2
│       ├── load_cell_inorganic: 12.8
│       ├── ultrasonic_organic: 82
│       ├── ultrasonic_inorganic: 43
│       ├── mq4_biogas: 0.3
│       ├── ph: 6.8
│       └── temperature: 37.0
│       // Ditulis setiap 5 menit (bukan setiap detik)
│
├── Collection: daily_summaries
│   └── Doc: "sppg-sman3-yk_2026-04-14"
│       ├── device_id: "sppg-sman3-yk"
│       ├── date: "2026-04-14"
│       ├── total_organic_kg: 47.2
│       ├── total_inorganic_kg: 12.8
│       ├── avg_ph: 6.7
│       ├── avg_temperature: 36.8
│       ├── peak_hour: 12
│       ├── biogas_potential_m3: 2.83
│       ├── compost_potential_kg: 3.78
│       ├── economic_value_idr: 8470
│       └── created_at: Timestamp
│
├── Collection: alerts
│   └── Doc: auto-id
│       ├── device_id: "sppg-sman3-yk"
│       ├── type: "threshold_exceeded"
│       ├── sensor: "ultrasonic_organic"
│       ├── value: 90
│       ├── threshold: 80
│       ├── severity: "warning" | "critical"
│       ├── message: "Tempat sampah organik mencapai 90%"
│       ├── acknowledged: false
│       └── timestamp: Timestamp
│
├── Collection: reports
│   └── Doc: auto-id
│       ├── device_id: "sppg-sman3-yk"
│       ├── type: "daily" | "weekly" | "monthly"
│       ├── period_start: Timestamp
│       ├── period_end: Timestamp
│       ├── total_organic_kg: 235.4
│       ├── total_inorganic_kg: 64.2
│       ├── total_biogas_m3: 14.12
│       ├── total_economic_value_idr: 42350
│       ├── generated_by: "user-uid"
│       └── created_at: Timestamp
│
└── Collection: users
    └── Doc: user-uid
        ├── email: "..."
        ├── name: "..."
        ├── role: "admin" | "operator" | "viewer"
        ├── sppg_id: "sppg-sman3-yk"
        └── created_at: Timestamp
```

## 3.3 Security Rules — Firestore

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuth() {
      return request.auth != null;
    }
    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isAdmin() {
      return isAuth() && getRole() == 'admin';
    }
    function isOperator() {
      return isAuth() && (getRole() == 'admin' || getRole() == 'operator');
    }

    // Users — hanya bisa baca data diri sendiri
    match /users/{userId} {
      allow read: if isAuth() && request.auth.uid == userId;
      allow write: if isAdmin();
    }

    // SPPG profiles — semua role bisa baca
    match /sppg_profiles/{sppgId} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }

    // Sensor logs — operator & admin bisa tulis, semua bisa baca
    match /sensor_logs/{logId} {
      allow read: if isAuth();
      allow create: if isOperator();
    }

    // Daily summaries — read only untuk viewer
    match /daily_summaries/{summaryId} {
      allow read: if isAuth();
      allow write: if isOperator();
    }

    // Alerts — operator bisa update (acknowledge), admin bisa hapus
    match /alerts/{alertId} {
      allow read: if isAuth();
      allow create: if isOperator();
      allow update: if isOperator();
      allow delete: if isAdmin();
    }

    // Reports — semua role bisa baca & buat
    match /reports/{reportId} {
      allow read: if isAuth();
      allow create: if isOperator();
      allow delete: if isAdmin();
    }
  }
}
```

## 3.4 Security Rules — RTDB

```json
// database.rules.json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "info": {
          ".read": "auth != null",
          ".write": false
        },
        "sensors": {
          ".read": "auth != null",
          ".write": "auth != null && (
            root.child('users').child(auth.uid).child('role').val() == 'admin' ||
            root.child('users').child(auth.uid).child('role').val() == 'operator'
          )"
        },
        "thresholds": {
          ".read": "auth != null",
          ".write": "auth != null &&
            root.child('users').child(auth.uid).child('role').val() == 'admin'"
        }
      }
    }
  }
}
```

## 3.5 Firebase Authentication — Multi-Role System

```
Roles:
├── admin    → Akses penuh: konfigurasi, hapus data, kelola user
├── operator → Monitoring + input manual + generate laporan
└── viewer   → Hanya lihat dashboard & download laporan
```

**Flow Login:**
```
1. User buka /login → masukkan email + password
2. Firebase Auth signInWithEmailAndPassword()
3. Sukses → ambil doc users/{uid} dari Firestore → cek role
4. Simpan role di localStorage (cache)
5. Redirect ke /dashboard
6. Setiap route change → cek auth.currentUser → jika null redirect /login
```

## 3.6 Firestore Composite Indexes

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "sensor_logs",
      "fields": [
        {"fieldPath": "device_id", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "daily_summaries",
      "fields": [
        {"fieldPath": "device_id", "order": "ASCENDING"},
        {"fieldPath": "date", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "alerts",
      "fields": [
        {"fieldPath": "device_id", "order": "ASCENDING"},
        {"fieldPath": "acknowledged", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    }
  ]
}
```

---

# BATCH PAGE 4 — FITUR CORE: MONITORING REAL-TIME

## 4.1 Daftar Fitur Halaman Dashboard (/)

### Fitur 4.1.1 — Stat Cards (4 kartu utama)
| Card | Data Source | Kalkulasi | Update |
|------|-------------|-----------|--------|
| Berat Limbah Organik | RTDB load_cell_organic | Nilai langsung | Real-time |
| Berat Limbah Anorganik | RTDB load_cell_inorganic | Nilai langsung | Real-time |
| Kapasitas Terpakai | RTDB ultrasonic | (value/max)*100 | Real-time |
| Potensi Biogas Hari Ini | Firestore daily_summary | Akumulasi harian | Per 5 menit |

### Fitur 4.1.2 — Real-Time Multi-Line Chart
```
Konfigurasi Chart.js:
- type: 'line'
- datasets: [organik (hijau), anorganik (biru)]
- Data: rolling 60 titik terakhir (= 5 jam @ interval 5 menit)
- xAxis: label waktu HH:MM
- plugins: zoom (drag zoom), tooltip detail
- animation: false (agar tidak lag saat update cepat)
- Update method: chart.data.datasets[i].data.push(newVal),
                 chart.data.labels.push(newTime),
                 jika length > 60 → shift(), chart.update('none')
```

### Fitur 4.1.3 — Donut Chart Komposisi Limbah
```
- type: 'doughnut'
- datasets: [organik, anorganik]
- Center plugin: tampilkan total kg dengan font monospace
- Update: setiap ada data baru dari RTDB
```

### Fitur 4.1.4 — Sensor Status Table
```
Kolom: Nama Sensor | Nilai | Satuan | Status | Last Update
Status indicator: ● Hijau (normal) | ● Kuning (warning) | ● Merah (critical) | ○ Abu (offline)
Offline detection: jika timestamp > 30 detik yang lalu → tandai offline
```

### Fitur 4.1.5 — Alert Panel
```
Logic threshold:
- ultrasonic >= 80%  → WARNING: "Segera kosongkan tempat sampah"
- ultrasonic >= 95%  → CRITICAL: "PENUH — Hentikan pengisian"
- mq4 >= 1.0%       → WARNING: "Deteksi gas metana — ventilasi area"
- mq4 >= 2.0%       → CRITICAL: "Gas berbahaya — evakuasi"
- ph < 5.5 || > 8.5 → WARNING: "pH di luar batas normal"
- temperature > 60°C → WARNING: "Suhu tinggi — periksa digester"

Setiap alert baru:
1. Tampilkan banner di dashboard
2. Simpan ke Firestore collection alerts
3. Kirim FCM notification (jika diizinkan browser)
```

## 4.2 Halaman Detail Sensor (/sensors)

### Fitur 4.2.1 — 6 Panel Sensor Individual
Setiap sensor memiliki panel sendiri dengan:
```
┌─────────────────────────────────────────┐
│  [Ikon] Nama Sensor          ● NORMAL  │
│                                         │
│       47.2 kg                          │
│  (nilai besar, font monospace)          │
│                                         │
│  ──────────────────────────────         │
│  Grafik historis 24 jam terakhir        │
│  (Bar chart per jam)                    │
│                                         │
│  Min: 0 kg  |  Max: 52.4 kg  | Avg: 31│
└─────────────────────────────────────────┘
```

### Fitur 4.2.2 — Input Manual Override
Untuk keperluan kalibrasi atau jika sensor offline:
```
Tombol [Input Manual] → modal form:
- Pilih sensor
- Masukkan nilai
- Catatan alasan
- Submit → tulis ke Firestore sensor_logs dengan flag manual: true
```

### Fitur 4.2.3 — Sensor Health History
Tabel log status sensor 7 hari terakhir (online/offline/warning per jam)

## 4.3 Komponen JavaScript Kunci

### firebase.js
```javascript
// Inisialisasi Firebase
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = { /* config dari .env atau inline */ };
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
```

### realtime.js
```javascript
// Listener RTDB — streaming sensor data
import { ref, onValue } from "firebase/database";
import { db } from "./firebase.js";

export function subscribeToSensors(deviceId, callback) {
  const sensorsRef = ref(db, `devices/${deviceId}/sensors`);
  return onValue(sensorsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
    checkThresholds(data);        // cek alert
    logToFirestore(deviceId, data); // simpan setiap 5 menit
  });
  // Kembalikan unsubscribe function
}
```

### charts.js
```javascript
// Manajemen semua instance Chart.js
const chartInstances = {};

export function initRealtimeChart(canvasId, labels, datasets) { ... }
export function updateChart(chartId, newLabel, newValues) { ... }
export function destroyChart(chartId) { ... }
export function initDonut(canvasId, organic, inorganic) { ... }
export function initBarChart(canvasId, hourlyData) { ... }
```

---

# BATCH PAGE 5 — FITUR AI & ANALITIK ENERGI BERKELANJUTAN

## 5.1 Halaman AI & Energi (/analytics)

Halaman ini merupakan **nilai tambah utama** penelitian — mengonversi data sensor mentah menjadi insight pengelolaan limbah & energi.

### 5.1.1 Kalkulasi Potensi Biogas
**Dasar ilmiah:** Berdasarkan Literatur No.7 (Frontiers in Energy Research, 2022):
```
1 kg limbah organik basah ≈ 0.4–0.6 m³ biogas
Nilai tengah: 0.5 m³/kg

Potensi Biogas (m³) = Berat Organik (kg) × 0.5
Potensi Energi (kWh) = Potensi Biogas × 5.5 kWh/m³ (nilai kalor metana rata-rata)
```

### 5.1.2 Kalkulasi Potensi Kompos
```
Organik → Kompos: rasio 0.3–0.4 (shrinkage moisture loss)
Potensi Kompos (kg) = Berat Organik (kg) × 0.35
Nilai Jual Kompos    = Potensi Kompos × Rp 2.000/kg (harga pasar pupuk organik)
```

### 5.1.3 Kalkulasi Nilai Ekonomi Limbah Anorganik
```
Plastik  = 40% dari anorganik × Rp 800/kg  (harga pengepul)
Kertas   = 35% dari anorganik × Rp 1.200/kg
Lainnya  = 25% dari anorganik × Rp 300/kg
Total Nilai Anorganik = Σ (porsi × harga)
```

### 5.1.4 Total Nilai Ekonomi Sirkular
```
Nilai Total = Nilai Kompos + Nilai Anorganik + (Potensi Energi × Rp 1.400/kWh)
```

**Implementasi JavaScript:**
```javascript
// analytics.js
export const CONVERSION = {
  biogas_per_kg_organic: 0.5,       // m³/kg
  energy_per_m3_biogas: 5.5,        // kWh/m³
  compost_ratio: 0.35,              // kg kompos / kg organik
  compost_price_per_kg: 2000,       // IDR
  plastic_ratio: 0.40,
  plastic_price: 800,               // IDR/kg
  paper_ratio: 0.35,
  paper_price: 1200,
  other_ratio: 0.25,
  other_price: 300,
  electricity_price: 1400           // IDR/kWh (tarif PLN)
};

export function calcBiogas(organicKg) {
  return {
    volume_m3:   organicKg * CONVERSION.biogas_per_kg_organic,
    energy_kwh:  organicKg * CONVERSION.biogas_per_kg_organic * CONVERSION.energy_per_m3_biogas
  };
}

export function calcCompost(organicKg) {
  const kg  = organicKg * CONVERSION.compost_ratio;
  return { kg, value_idr: kg * CONVERSION.compost_price_per_kg };
}

export function calcInorganicValue(inorganicKg) {
  const plastic = inorganicKg * CONVERSION.plastic_ratio * CONVERSION.plastic_price;
  const paper   = inorganicKg * CONVERSION.paper_ratio   * CONVERSION.paper_price;
  const other   = inorganicKg * CONVERSION.other_ratio   * CONVERSION.other_price;
  return plastic + paper + other;
}

export function calcTotalEconomicValue(organicKg, inorganicKg) {
  const compost    = calcCompost(organicKg);
  const inorganic  = calcInorganicValue(inorganicKg);
  const biogas     = calcBiogas(organicKg);
  const energyVal  = biogas.energy_kwh * CONVERSION.electricity_price;
  return {
    compost_value:    compost.value_idr,
    inorganic_value:  inorganic,
    energy_value:     energyVal,
    total:            compost.value_idr + inorganic + energyVal
  };
}
```

## 5.2 Fitur Prediksi Pola (Simple ML di sisi klien)

### 5.2.1 Moving Average Prediksi Besok
```javascript
// Menggunakan data 7 hari terakhir dari Firestore daily_summaries
export function predictNextDay(last7Days) {
  // Simple weighted moving average (hari terakhir bobot lebih besar)
  const weights = [1, 1, 1, 2, 2, 3, 4]; // total = 14
  let sumOrganic = 0, sumInorganic = 0;
  last7Days.forEach((day, i) => {
    sumOrganic    += day.total_organic_kg    * weights[i];
    sumInorganic  += day.total_inorganic_kg  * weights[i];
  });
  return {
    predicted_organic_kg:    sumOrganic    / 14,
    predicted_inorganic_kg:  sumInorganic  / 14
  };
}
```

### 5.2.2 Deteksi Peak Hours
```javascript
// Dari data sensor_logs, hitung rata-rata berat per jam dalam 7 hari
export function calcPeakHours(sensorLogs) {
  const hourBuckets = Array(24).fill(0).map(() => ({ sum: 0, count: 0 }));
  sensorLogs.forEach(log => {
    const hour = new Date(log.timestamp.toMillis()).getHours();
    hourBuckets[hour].sum   += log.load_cell_organic;
    hourBuckets[hour].count += 1;
  });
  return hourBuckets.map((b, h) => ({
    hour: h,
    avg: b.count > 0 ? b.sum / b.count : 0
  }));
}
```

### 5.2.3 Anomaly Detection
```javascript
// Flag jika nilai sensor melebihi mean + 2 stddev
export function detectAnomaly(currentValues, historicalMean, historicalStd) {
  return Object.entries(currentValues).filter(([key, val]) =>
    Math.abs(val - historicalMean[key]) > 2 * historicalStd[key]
  );
}
```

## 5.3 Visualisasi Halaman Analytics

### Panel A — Gauge Chart Energi
```
Menampilkan: Potensi energi biogas hari ini
Visual: Gauge 0–100 kWh (target harian)
Warna: Merah → Kuning → Hijau sesuai persentase target
```

### Panel B — Stacked Bar — Nilai Ekonomi Mingguan
```
X-axis: 7 hari terakhir
Y-axis: IDR (Rupiah)
Stack: [Kompos | Anorganik | Energi Biogas]
Total label di atas setiap bar
```

### Panel C — Radar Chart — Indikator Keberlanjutan
```
6 dimensi:
- Efisiensi Pengumpulan (% dari kapasitas)
- Potensi Biogas (vs target)
- Potensi Kompos (vs target)
- Nilai Ekonomi (vs baseline)
- Ketepatan Pemilahan (rasio organik/anorganik ideal = 70:30)
- Konsistensi Laporan (% hari terlapor dalam sebulan)
```

### Panel D — Timeline Rekomendasi AI
```
Berdasarkan analitik, sistem menghasilkan card rekomendasi:
• "Tingkatkan kapasitas pengangkutan pada hari Senin (puncak 11:00–13:00)"
• "Potensi biogas minggu ini: 18 m³ — siapkan digester cadangan"
• "Rasio organik/anorganik minggu ini 78:22 — mendekati ideal"
• "Estimasi kompos tersedia: Rabu depan, 24 kg"
```

---

# BATCH PAGE 6 — FITUR PELAPORAN & MANAJEMEN DATA

## 6.1 Halaman History (/history)

### Fitur 6.1.1 — Tabel Data Historis
```
Filter: [SPPG] [Tanggal Mulai] [Tanggal Akhir] [Tipe Data]
Kolom tabel:
  Tanggal | Waktu | Organik(kg) | Anorganik(kg) | Biogas Pot.(m³) | Nilai Ekonomi | Status
Pagination: 50 baris per halaman
Export: tombol "Export CSV"

Query Firestore:
  collection('sensor_logs')
  .where('device_id', '==', selectedSppg)
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .orderBy('timestamp', 'desc')
  .limit(50)
```

### Fitur 6.1.2 — Kalender Heatmap
```
Visual: Kalender 1 tahun (GitHub-style heatmap)
Warna: Intensitas hijau = total limbah hari tersebut
Klik tanggal → tampilkan ringkasan hari itu dalam modal
Library: custom CSS grid calendar
```

### Fitur 6.1.3 — Grafik Tren Jangka Panjang
```
Toggle: Mingguan / Bulanan
Chart type: Area chart dengan gradien
Datasets: Organik, Anorganik, Nilai Ekonomi (dual Y-axis)
```

## 6.2 Halaman Laporan (/reports)

### Fitur 6.2.1 — Generate Laporan Otomatis
```
Form input:
├── Jenis laporan: [Harian | Mingguan | Bulanan]
├── Periode: Date range picker
├── SPPG: dropdown
└── Tombol [Generate Laporan]

Proses:
1. Query Firestore daily_summaries untuk periode yang dipilih
2. Agregasi: total organik, anorganik, biogas, kompos, nilai ekonomi
3. Kalkulasi rata-rata, min, max, persentase perubahan vs periode sebelumnya
4. Tampilkan preview di halaman
5. Tombol [Download CSV] dan [Download JSON]
```

### Fitur 6.2.2 — Template Laporan untuk OPSI
```
Laporan standar yang dihasilkan mengikuti format monitoring penelitian:
Bagian 1: Identitas SPPG & periode
Bagian 2: Ringkasan statistik sensor
Bagian 3: Analisis potensi energi & nilai ekonomi
Bagian 4: Tren & anomali
Bagian 5: Rekomendasi tindak lanjut
```

### Fitur 6.2.3 — Export CSV
```javascript
// reports.js
export function exportToCSV(data, filename) {
  const headers = ['Tanggal', 'Organik(kg)', 'Anorganik(kg)',
                   'Biogas(m3)', 'Kompos(kg)', 'NilaiEkonomi(IDR)'];
  const rows = data.map(d => [
    d.date, d.total_organic_kg, d.total_inorganic_kg,
    calcBiogas(d.total_organic_kg).volume_m3.toFixed(2),
    calcCompost(d.total_organic_kg).kg.toFixed(2),
    calcTotalEconomicValue(d.total_organic_kg, d.total_inorganic_kg).total.toFixed(0)
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename + '.csv';
  a.click();
}
```

## 6.3 Halaman Settings (/settings)

### Fitur 6.3.1 — Konfigurasi Threshold Sensor
```
Form (hanya admin):
├── Load Cell Organik Max (kg): [input number]
├── Load Cell Anorganik Max (kg): [input number]
├── Warning Level (%): [slider 50–90]
├── Critical Level (%): [slider 80–99]
├── MQ-4 Warning (%): [input]
├── pH Min: [input]  pH Max: [input]
└── [Simpan ke RTDB]
```

### Fitur 6.3.2 — Manajemen User
```
Tabel user (hanya admin):
  Email | Nama | Role | SPPG | Aksi
Aksi: [Edit Role] [Hapus]
Tambah user baru → kirim invitation email via Firebase Auth
```

### Fitur 6.3.3 — Konfigurasi Notifikasi
```
Toggle per jenis alert:
☑ Warning threshold exceeded
☑ Critical threshold exceeded
☑ Sensor offline > 30 menit
☑ Laporan harian otomatis (pukul 23:00)
☐ Email digest mingguan
```

### Fitur 6.3.4 — Profil SPPG
```
Edit:
├── Nama SPPG
├── Alamat
├── Koordinator
├── Kapasitas tempat sampah
└── Upload foto lokasi → Firebase Storage
```

---

# BATCH PAGE 7 — DEPLOYMENT, INTEGRASI IoT & OPTIMASI

## 7.1 Konfigurasi Firebase Hosting

```json
// firebase.json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self' https://*.firebase.googleapis.com https://*.firebaseio.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "database": {
    "rules": "database.rules.json"
  }
}
```

## 7.2 Prosedur Deployment

```bash
# 1. Login Firebase (sudah dikonfigurasi via service account)
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/service-account.json"
cd ~/jalari

# 2. Set project aktif
firebase use jalari-eac18

# 3. Deploy pertama kali (semua services)
firebase deploy

# 4. Deploy hanya hosting (update frontend)
firebase deploy --only hosting

# 5. Deploy hanya rules
firebase deploy --only firestore:rules,database

# 6. Preview sebelum deploy (generate preview URL)
firebase hosting:channel:deploy preview-$(date +%Y%m%d)
```

## 7.3 Integrasi IoT — Arduino/ESP32 ke Firebase

### 7.3.1 Firmware Flow (ESP32 Arduino)
```
Loop setiap 5 detik:
1. Baca HX711 (load cell organik & anorganik)
2. Baca HC-SR04 (ultrasonic level organik & anorganik)
3. Baca MQ-4 analog → konversi ke % CH4
4. Baca DS18B20 (suhu)
5. Baca pH sensor (analog ADS1115)
6. Serialisasi ke JSON
7. HTTP PUT ke Firebase RTDB REST API:
   PUT https://jalari-eac18-default-rtdb.firebaseio.com/devices/sppg-sman3-yk/sensors.json
   Authorization: Bearer {Firebase ID Token atau Database Secret}
   Body: { load_cell_organic: 47.2, ... timestamp: millis() }
8. Handle error + retry (max 3x)
9. Deep sleep 5 detik (atau delay)
```

### 7.3.2 Struktur Payload ESP32 → Firebase
```json
{
  "load_cell_organic":    {"value": 47.2, "unit": "kg", "status": "normal", "timestamp": 1744000000000},
  "load_cell_inorganic":  {"value": 12.8, "unit": "kg", "status": "normal", "timestamp": 1744000000000},
  "ultrasonic_organic":   {"value": 82,   "unit": "%",  "status": "warning","timestamp": 1744000000000},
  "ultrasonic_inorganic": {"value": 43,   "unit": "%",  "status": "normal", "timestamp": 1744000000000},
  "mq4_biogas":           {"value": 0.3,  "unit": "%CH4","status":"normal", "timestamp": 1744000000000},
  "ph_sensor":            {"value": 6.8,  "unit": "pH", "status": "normal", "timestamp": 1744000000000},
  "temperature":          {"value": 37.0, "unit": "°C", "status": "normal", "timestamp": 1744000000000}
}
```

### 7.3.3 Simulasi Data (Testing tanpa hardware)
Karena hardware masih dalam pengembangan, dashboard perlu dapat berjalan dengan **data simulasi**:
```javascript
// utils.js — Simulator Mode
export function startSimulator(deviceId) {
  let baseOrganic    = 20;
  let baseInorganic  = 8;

  setInterval(() => {
    // Simulasi penambahan limbah + noise
    baseOrganic   += (Math.random() - 0.3) * 0.5;
    baseInorganic += (Math.random() - 0.3) * 0.2;
    baseOrganic    = Math.max(0, Math.min(60, baseOrganic));
    baseInorganic  = Math.max(0, Math.min(30, baseInorganic));

    const payload = {
      load_cell_organic:    { value: +baseOrganic.toFixed(1),    unit:"kg", status:"normal",  timestamp: Date.now() },
      load_cell_inorganic:  { value: +baseInorganic.toFixed(1),  unit:"kg", status:"normal",  timestamp: Date.now() },
      ultrasonic_organic:   { value: +(baseOrganic/60*100).toFixed(0), unit:"%", status: baseOrganic>48?"warning":"normal", timestamp: Date.now() },
      ultrasonic_inorganic: { value: +(baseInorganic/30*100).toFixed(0),unit:"%", status:"normal", timestamp: Date.now() },
      mq4_biogas:           { value: +(0.2 + Math.random()*0.3).toFixed(2), unit:"%CH4", status:"normal", timestamp: Date.now() },
      ph_sensor:            { value: +(6.5 + Math.random()*0.6).toFixed(1), unit:"pH",   status:"normal", timestamp: Date.now() },
      temperature:          { value: +(35  + Math.random()*5).toFixed(1),   unit:"°C",   status:"normal", timestamp: Date.now() }
    };

    // Tulis langsung ke RTDB
    writeToRTDB(`devices/${deviceId}/sensors`, payload);
  }, 5000);
}
```

## 7.4 Optimasi Performa

### 7.4.1 Strategi Data Loading
```
1. RTDB listener: hanya aktif di halaman yang membutuhkan
   → unsubscribe saat route change (mencegah memory leak)

2. Firestore pagination: gunakan startAfter() cursor
   → tidak load semua data sekaligus

3. Firestore caching: gunakan enableIndexedDbPersistence()
   → data tersedia saat offline

4. Chart throttling: update chart max 1x per detik meski data masuk lebih cepat

5. CSS: gunakan CSS transform (GPU-accelerated) untuk animasi
   → tidak trigger reflow

6. JS modules: gunakan ES modules native (modern browser)
   → tidak perlu bundler
```

### 7.4.2 Cost Optimization Firebase
```
RTDB Reads: hanya 1 listener persistent per sesi user (bukan polling)
Firestore Reads:
  - sensor_logs: ditulis 1x per 5 menit (bukan per 5 detik)
  - Gunakan Firestore batched writes untuk multiple docs
  - daily_summaries: proses di sisi klien dari sensor_logs, bukan query terpisah
  - Gunakan Firestore cache untuk data yang sering dibaca (sppg_profiles, thresholds)

Estimasi penggunaan gratis (Spark Plan):
  - RTDB: ~1.44 MB download/hari per user (well within 10 GB/bulan free)
  - Firestore: ~288 reads/hari per user (< 50.000/hari free limit)
```

### 7.4.3 PWA Readiness
```
Tambahkan manifest.json:
{
  "name": "JALARI — Monitoring Limbah MBG",
  "short_name": "JALARI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#052e16",
  "theme_color": "#16a34a",
  "icons": [{ "src": "assets/icons/icon-192.png", "sizes": "192x192" }]
}

Service Worker (sw.js):
- Cache semua aset statis saat install
- Strategi: Cache-first untuk aset, Network-first untuk data Firebase
- Offline fallback: tampilkan data terakhir dari cache
```

---

# RINGKASAN 7 BATCH PAGE PENGERJAAN

| Batch | Fokus Pengerjaan | File Utama yang Dibuat | Estimasi |
|-------|-----------------|------------------------|----------|
| **1** | Setup Firebase + Struktur Proyek + Router SPA | `index.html`, `app.js`, `firebase.js`, `firebase.json`, `firestore.rules`, `database.rules.json` | Dasar |
| **2** | Login Page + Auth System + CSS Variables + Sidebar | `login.html`, `auth.js`, `main.css`, `sidebar.css` | Auth |
| **3** | Dashboard Page + Real-Time Charts + Stat Cards | `dashboard.html`, `dashboard.css`, `realtime.js`, `charts.js` | Core |
| **4** | Detail Sensor Page + Alert System + Notifikasi | `sensors.html`, `notifications.js`, `utils.js` | Sensor |
| **5** | Analytics Page + Kalkulasi AI/Energi + Prediksi | `analytics.html`, `analytics.js` | AI |
| **6** | History Page + Reports Page + CSV Export | `history.html`, `reports.html`, `reports.js`, `firestore.js` | Data |
| **7** | Settings Page + Simulator Mode + Optimasi + Deploy | `settings.html`, `sw.js`, `manifest.json` + `firebase deploy` | Deploy |

---

*Dokumen ini merupakan perencanaan teknis lengkap. Eksekusi kode dimulai dari Batch 1.*  
*Versi dokumen: 1.0 | Dibuat: April 2026*
