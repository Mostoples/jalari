/* =====================================================================
   JALARI v3.1 — VISI AI: Klasifikasi Limbah Organik (Buah & Sayur)
   Transfer Learning MobileNetV2 — inferensi 100% di browser (TensorFlow.js)

   Strategi model (drop-in):
   - Jika tersedia model kustom hasil training di  public/model/model.json
     (36 kelas buah & sayur dataset Kritik Seth), modul memakainya.
   - Jika belum ada, fallback otomatis ke @tensorflow-models/mobilenet
     (ImageNet) dari CDN supaya fitur tetap berfungsi untuk demo.
   ===================================================================== */
'use strict';

/* ============ STATE ============ */
var VISION = { model:null, type:null, ready:false, loading:false, inputSize:224, labels:null, previewEl:null, lastResult:null, stopAll:null };

/* Pemetaan kelas → sub-kategori organik JALARI (berbasis kata kunci, kompatibel
   dengan 36 kelas dataset Kritik Seth maupun label ImageNet MobileNet). */
var CATS = ['buah','sayur','daging','tulang','lainnya'];
var BUAH_KW   = ['apple','banana','grape','kiwi','lemon','lime','mango','orange','pear','pineapple','pomegranate','watermelon','fig','strawberry','jackfruit','custard apple','granny smith','melon'];
var SAYUR_KW  = ['beet','bell pepper','pepper','cabbage','capsicum','carrot','cauliflower','chilli','chili','sweetcorn','sweet corn','corn','cucumber','eggplant','aubergine','garlic','ginger','jalepeno','jalapeno','lettuce','onion','paprika','peas','pea','sweetpotato','sweet potato','potato','raddish','radish','soy','spinach','tomato','turnip','zucchini','courgette','squash','broccoli','artichoke','mushroom','cardoon'];
var DAGING_KW = ['daging','meat','beef','steak','pork','mutton','lamb','sapi','ayam','chicken','poultry','fillet','sausage','sosis','ham','bacon','nugget'];
var TULANG_KW = ['tulang','fishbone','fish bone','bone','rib','iga','spine','skeleton'];

function categorize(name){
  name = (name||'').toLowerCase().trim();
  if(CATS.indexOf(name)>=0 || name==='nasi' || name==='lauk') return name; // label model kustom = kategori langsung
  for(var t=0;t<TULANG_KW.length;t++) if(name.indexOf(TULANG_KW[t])>=0) return 'tulang';
  for(var d=0;d<DAGING_KW.length;d++) if(name.indexOf(DAGING_KW[d])>=0) return 'daging';
  for(var i=0;i<BUAH_KW.length;i++) if(name.indexOf(BUAH_KW[i])>=0) return 'buah';
  for(var j=0;j<SAYUR_KW.length;j++) if(name.indexOf(SAYUR_KW[j])>=0) return 'sayur';
  return 'lainnya';
}
function catLabel(k){ return k==='buah'?'Buah':k==='sayur'?'Sayur':k==='daging'?'Daging':k==='tulang'?'Tulang':k==='nasi'?'Nasi/Karbo':k==='lauk'?'Lauk':'Lainnya'; }
function catColor(k){ return k==='buah'?'#d97706':k==='sayur'?'#16a34a':k==='daging'?'#dc2626':k==='tulang'?'#a8a29e':k==='nasi'?'#0284c7':k==='lauk'?'#7c3aed':'#94a3b8'; }

/* ============ KOMPOSISI (persistensi hasil deteksi) ============ */
function compGet(){ try{ var c=JSON.parse(localStorage.getItem('jalari_komposisi')); if(c) return c; }catch(e){} return {buah:0,sayur:0,daging:0,tulang:0,lainnya:0}; }
function compSave(c){ localStorage.setItem('jalari_komposisi', JSON.stringify(c)); }
function compAdd(kat){ var c=compGet(); if(c[kat]===undefined) c.lainnya++; else c[kat]++; compSave(c); return c; }
function compReset(){ var c={buah:0,sayur:0,daging:0,tulang:0,lainnya:0}; compSave(c); return c; }
function compTotal(c){ var t=0; for(var k in c) t+=c[k]; return t; }

/* ============ LOAD MODEL (lazy + cache) ============ */
function visionLoad(){
  if(VISION.ready) return Promise.resolve(VISION);
  if(VISION.loading) return VISION.loading;
  VISION.loading = (function(){
    // Cek apakah model kustom tersedia.
    return fetch('model/model.json', {method:'HEAD'}).then(function(r){ return r.ok; }).catch(function(){ return false; })
      .then(function(hasCustom){
        if(hasCustom && typeof tf!=='undefined'){
          return tf.loadLayersModel('model/model.json').then(function(m){
            VISION.model=m; VISION.type='custom';
            try{ var s=m.inputs[0].shape; if(s&&s[1]) VISION.inputSize=s[1]; }catch(e){}
            return fetch('model/labels.json').then(function(x){return x.json();}).then(function(lab){ VISION.labels=lab; }).catch(function(){ VISION.labels=null; });
          });
        }
        // Fallback: MobileNet ImageNet dari CDN.
        if(typeof mobilenet==='undefined') throw new Error('Library MobileNet belum termuat.');
        return mobilenet.load({version:2, alpha:1.0}).then(function(m){ VISION.model=m; VISION.type='mobilenet'; });
      })
      .then(function(){ VISION.ready=true; VISION.loading=false; return VISION; });
  })();
  return VISION.loading;
}

/* ============ KLASIFIKASI ============ */
function preprocess(imgEl){
  var n=VISION.inputSize;
  return tf.tidy(function(){
    return tf.browser.fromPixels(imgEl).resizeBilinear([n,n]).toFloat().div(127.5).sub(1).expandDims(0);
  });
}
function visionClassify(imgEl){
  if(VISION.type==='mobilenet'){
    return VISION.model.classify(imgEl, 5).then(function(res){
      return res.map(function(r){ var lab=(r.className||'').split(',')[0]; return {label:lab, prob:r.probability, kategori:categorize(lab)}; });
    });
  }
  // Model kustom (softmax probabilities).
  var input=preprocess(imgEl);
  var out=VISION.model.predict(input);
  var probs=out.dataSync(); input.dispose(); out.dispose();
  var arr=[];
  for(var i=0;i<probs.length;i++){ var lab=(VISION.labels&&VISION.labels[i])?VISION.labels[i]:('kelas '+i); arr.push({label:lab, prob:probs[i], kategori:categorize(lab)}); }
  arr.sort(function(a,b){ return b.prob-a.prob; });
  return Promise.resolve(arr.slice(0,5));
}

/* ============================================================
   ESP32-CAM MODULE — Live Stream via Firebase IP Discovery
   ============================================================ */
var ESP32 = {
  camIP: null,          // IP address string
  streamURL: null,      // MJPEG stream URL
  captureURL: null,     // Capture/snapshot URL
  stillURL: null,       // Single frame URL
  polling: false,       // Polling flag
  pollTimer: null,      // Interval handle
  connected: false,     // Connection state
  lastCheck: 0
};

function esp32LoadFromFirebase(callback) {
  var url = 'https://jalari-eac18-default-rtdb.asia-southeast1.firebasedatabase.app/esp32cam.json';
  return fetch(url, {cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data && data.ip){
        ESP32.camIP      = data.ip;
        ESP32.streamURL  = data.stream || 'http://' + data.ip + ':81/stream';
        ESP32.captureURL = data.capture || 'http://' + data.ip + '/capture';
        ESP32.stillURL   = data.still || 'http://' + data.ip + '/cam.jpg';
        ESP32.connected  = true;
        console.log('[ESP32-CAM] Found at', data.ip);
        if(callback) callback(null, data);
        return data;
      }
      var err = new Error('ESP32-CAM belum terdaftar');
      console.warn('[ESP32-CAM] Not found in Firebase');
      if(callback) callback(err);
      throw err;
    })
    .catch(function(e){
      ESP32.connected = false;
      console.warn('[ESP32-CAM] Firebase fetch fail:', e.message);
      if(callback) callback(e);
      throw e;
    });
}

function esp32StartPolling(callback, interval){
  if(ESP32.polling) return;
  ESP32.polling = true;
  var ms = interval || 10000; // default every 10s
  function poll(){
    esp32LoadFromFirebase().then(function(){
      if(callback) callback(null);
    }).catch(function(e){
      if(callback) callback(e);
    });
  }
  poll(); // immediate check
  ESP32.pollTimer = setInterval(poll, ms);
}
function esp32StopPolling(){
  ESP32.polling = false;
  if(ESP32.pollTimer){ clearInterval(ESP32.pollTimer); ESP32.pollTimer = null; }
}

function esp32StreamStarted() {
  return !!(ESP32.streamURL && ESP32.connected);
}

/* ============ HALAMAN: VISI AI ============ */
function pgVision(pc){
  var modelNote = VISION.ready
    ? (VISION.type==='custom' ? 'Model kustom JALARI (36 kelas) aktif.' : 'Mode demo: MobileNet ImageNet (CDN). Ganti dengan model terlatih di <code>public/model/</code>.')
    : 'Model dimuat saat klasifikasi pertama (lazy-load).';

  pc.innerHTML = [
    '<div class="page-header"><div><h1 class="page-title">Visi AI — Klasifikasi Limbah</h1><p class="page-subtitle">Deteksi sub-kategori organik MBG (Buah · Sayur · Daging · Tulang) via MobileNetV2 / TensorFlow.js</p></div></div>',

    '<div class="section-card"><div class="section-header"><div class="section-title">Cara Kerja & Keterbatasan</div></div><div class="section-body">',
    '<p style="font-size:13px;color:var(--c-text-secondary);line-height:1.6">Unggah/ambil foto limbah → model klasifikasi citra menentukan jenis → dipetakan ke 4 sub-kategori organik MBG: <b>Buah</b> · <b>Sayur</b> · <b>Daging</b> · <b>Tulang</b> → memperbarui donut komposisi. ',
    '<span style="color:var(--c-accent)">Catatan jujur:</span> Nasi/karbohidrat & sisa makanan tercampur belum tercakup model ini (perlu dataset kustom lanjutan). Confidence ditampilkan agar ketidakpastian transparan (sejalan dengan prinsip XAI proyek).</p>',
    '<div class="info-row" style="margin-top:8px"><span class="info-label">Status Model</span><span class="info-value" id="vModelNote">'+modelNote+'</span></div>',
    '<div class="info-row"><span class="info-label">ESP32-CAM</span><span class="info-value" id="vEspStatus" style="font-size:12px">Mendeteksi...</span></div>',
    '</div></div>',

    // INPUT / ESP32-CAM STREAM
    '<div class="section-card"><div class="section-header"><div class="section-title">📷 Input Gambar / Kamera JT</div></div><div class="section-body">',

    // Tabs: Upload vs ESP32-CAM
    '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">',
    '<button class="btn btn-primary btn-sm" id="vTabUpload" data-tab="upload">📱 Unggah</button>',
    '<button class="btn btn-outline btn-sm" id="vTabEsp" data-tab="esp">📡 ESP32-CAM</button>',
    '<button class="btn btn-outline btn-sm" id="vTabDeviceCam" data-tab="devicecam">📹 Kamera Device</button>',
    '</div>',

    // === TAB: Upload ===
    '<div id="vTabUploadContent" style="display:block">',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">',
    '<label class="btn btn-primary" style="cursor:pointer;flex:1 1 auto;text-align:center">📷 Pilih Gambar<input type="file" id="vFile" accept="image/*" capture="environment" style="display:none"></label>',
    '</div>',
    '<div id="vStageUpload" style="border:1px dashed var(--c-border);border-radius:10px;min-height:160px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--c-bg-subtle,transparent)">',
    '<span style="font-size:13px;color:var(--c-text-muted)">Upload gambar dari galeri</span>',
    '</div>',
    '</div>',

    // === TAB: ESP32-CAM ===
    '<div id="vTabEspContent" style="display:none">',
    '<div id="vEspInfo" style="font-size:12px;color:var(--c-text-muted);margin-bottom:8px">Mencari ESP32-CAM...</div>',
    '<div id="vEspLiveContainer" style="display:none;position:relative">',
    '<img id="vEspStream" src="" style="width:100%;max-width:640px;border-radius:10px;background:#000;display:block;margin:0 auto" alt="ESP32-CAM Live">',
    '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">',
    '<button class="btn btn-primary" id="vEspCapture" style="flex:1">📸 Snapshot</button>',
    '<button class="btn btn-outline" id="vEspClassify" disabled style="flex:1">🔍 Klasifikasi Snapshot</button>',
    '</div>',
    '</div>',
    '<div id="vEspNoCam" style="display:none;padding:20px;text-align:center;border:1px dashed var(--c-border);border-radius:10px">',
    '<p style="font-size:14px;color:var(--c-text-muted)">⏳ ESP32-CAM tidak ditemukan</p>',
    '<p style="font-size:12px;color:var(--c-text-muted);margin-top:4px">Pastikan ESP32-CAM menyala dan satu jaringan dengan perangkat ini.</p>',
    '<button class="btn btn-outline btn-sm" id="vEspRetry" style="margin-top:8px">🔄 Cari Ulang</button>',
    '</div>',
    '</div>',

    // === TAB: Device Camera ===
    '<div id="vTabDeviceCamContent" style="display:none">',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">',
    '<button class="btn btn-outline" id="vCamBtn">📹 Buka Kamera</button>',
    '</div>',
    '<div id="vStageCam" style="border:1px dashed var(--c-border);border-radius:10px;min-height:160px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--c-bg-subtle,transparent)">',
    '<span style="font-size:13px;color:var(--c-text-muted)">Gunakan kamera perangkat</span>',
    '</div>',
    '<video id="vVideo" autoplay playsinline style="display:none;width:100%;border-radius:10px;margin-top:10px"></video>',
    '<canvas id="vCanvas" style="display:none"></canvas>',
    '<button class="btn btn-outline btn-sm" id="vCapture" style="display:none;margin-top:8px">Ambil Foto</button>',
    '</div>',

    '</div></div>',

    // COMMON: Preview stage + classify
    '<div class="grid-2">',
    '<div class="section-card"><div class="section-header"><div class="section-title">📸 Preview</div></div><div class="section-body">',
    '<div id="vStage" style="border:1px dashed var(--c-border);border-radius:10px;min-height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--c-bg-subtle,transparent)">',
    '<span style="font-size:13px;color:var(--c-text-muted)">Pilih gambar dari salah satu tab di atas</span>',
    '</div>',
    '<button class="btn btn-primary" id="vRun" disabled style="margin-top:10px;width:100%">🔍 Klasifikasi</button>',
    '</div></div>',
    // RESULT
    '<div class="section-card"><div class="section-header"><div class="section-title">Hasil Klasifikasi</div></div><div class="section-body" id="vResult">',
    '<p style="font-size:13px;color:var(--c-text-muted)">Hasil akan tampil di sini setelah klasifikasi.</p>',
    '</div></div>',
    '</div>',

    // KOMPOSISI
    '<div class="section-card"><div class="section-header"><div class="section-title">Komposisi Organik Terdeteksi (akumulasi)</div><button class="btn btn-outline btn-sm" id="vReset">Reset</button></div><div class="section-body"><div class="grid-2" style="align-items:center">',
    '<div class="chart-wrapper chart-wrapper--donut" style="height:220px;position:relative"><canvas id="cComp"></canvas></div>',
    '<div id="vCompLegend"></div>',
    '</div></div></div>'
  ].join('');

  // ---- DOM refs ----
  var stage      = document.getElementById('vStage');
  var runBtn     = document.getElementById('vRun');
  var resultDiv  = document.getElementById('vResult');
  var espStatus  = document.getElementById('vEspStatus');
  var espInfo    = document.getElementById('vEspInfo');
  var espLive    = document.getElementById('vEspLiveContainer');
  var espNoCam   = document.getElementById('vEspNoCam');
  var espImg     = document.getElementById('vEspStream');
  var tabUpload  = document.getElementById('vTabUpload');
  var tabEsp     = document.getElementById('vTabEsp');
  var tabDevCam  = document.getElementById('vTabDeviceCam');

  // ---- Functions ----
  function setPreview(src){
    stage.innerHTML = '<img id="vImg" src="'+src+'" crossorigin="anonymous" style="max-width:100%;max-height:280px;border-radius:8px">';
    VISION.previewEl = document.getElementById('vImg');
    runBtn.disabled = false;
  }

  // Tab switching
  function switchTab(tab){
    document.getElementById('vTabUploadContent').style.display    = (tab==='upload')    ? 'block' : 'none';
    document.getElementById('vTabEspContent').style.display      = (tab==='esp')       ? 'block' : 'none';
    document.getElementById('vTabDeviceCamContent').style.display = (tab==='devicecam') ? 'block' : 'none';
    [tabUpload, tabEsp, tabDevCam].forEach(function(b){
      b.className = b.getAttribute('id')===('vTab'+tab.charAt(0).toUpperCase()+tab.slice(1)) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    });
    if(tab==='esp') esp32Check();
  }
  tabUpload.addEventListener('click', function(){ switchTab('upload'); });
  tabEsp.addEventListener('click', function(){ switchTab('esp'); });
  tabDevCam.addEventListener('click', function(){ switchTab('devicecam'); });

  // ---- ESP32-CAM ----
  var espStreamActive = false;
  var espStreamTimer = null;

  function esp32Check(){
    espInfo.textContent = '🔄 Mencari ESP32-CAM via Firebase...';
    espNoCam.style.display = 'none';
    espLive.style.display = 'none';
    esp32StopPolling(); // stop previous polling if any

    esp32StartPolling(function(err){
      if(err){
        espInfo.textContent = '⏳ Menunggu ESP32-CAM...';
        espStatus.innerHTML = '<span style="color:var(--c-text-muted)">🔴 Offline (tidak terdeteksi)</span>';
        espNoCam.style.display = 'block';
        espLive.style.display = 'none';
        document.getElementById('vEspClassify').disabled = true;
        return;
      }
      espInfo.textContent = '✅ ESP32-CAM ditemukan — IP: ' + ESP32.camIP;
      espStatus.innerHTML = '<span style="color:var(--c-primary)">🟢 Online (' + ESP32.camIP + ')</span>';
      espNoCam.style.display = 'none';
      espLive.style.display = 'block';
      document.getElementById('vEspClassify').disabled = false;
      startEspStream();
    }, 5000);
  }

  // Retry button
  document.getElementById('vEspRetry').addEventListener('click', function(){
    esp32StopPolling();
    esp32Check();
  });

  function startEspStream(){
    if(espStreamActive) return;
    espStreamActive = true;

    // Gunakan single frame polling (MJPEG <img> di beberapa browser mobile kurang responsif)
    function refreshFrame(){
      if(!espStreamActive) return;
      // Anti-cache timestamp
      var url = ESP32.stillURL + '?_=' + Date.now();
      espImg.src = url;
    }

    // Refresh setiap 800ms
    refreshFrame();
    espStreamTimer = setInterval(refreshFrame, 800);
  }

  function stopEspStream(){
    espStreamActive = false;
    if(espStreamTimer){ clearInterval(espStreamTimer); espStreamTimer = null; }
  }

  // ESP Capture → ambil snapshot dari ESP32-CAM
  document.getElementById('vEspCapture').addEventListener('click', function(){
    loadEspSnapshot(function(dataUrl){
      setPreview(dataUrl);
    });
  });

  // ESP Classify → capture dulu lalu klasifikasi
  document.getElementById('vEspClassify').addEventListener('click', function(){
    loadEspSnapshot(function(dataUrl){
      setPreview(dataUrl);
      // Auto-run classification
      triggerClassification();
    });
  });

  function loadEspSnapshot(callback){
    var url = ESP32.captureURL + '?_=' + Date.now();
    espInfo.textContent = '📸 Mengambil snapshot...';
    fetch(url, {cache:'no-store'})
      .then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.blob();
      })
      .then(function(blob){
        var reader = new FileReader();
        reader.onload = function(e){
          espInfo.textContent = '✅ Snapshot siap. Klik Klasifikasi.';
          if(callback) callback(e.target.result);
        };
        reader.readAsDataURL(blob);
      })
      .catch(function(e){
        espInfo.textContent = '❌ Gagal: ' + e.message;
        console.error('[ESP32-CAM] Snapshot error:', e);
      });
  }

  // ---- Upload ----
  document.getElementById('vFile').addEventListener('change', function(e){
    var f = e.target.files && e.target.files[0];
    if(!f) return;
    stopDeviceCam();
    stopEspStream();
    var rd = new FileReader();
    rd.onload = function(ev){ setPreview(ev.target.result); };
    rd.readAsDataURL(f);
  });

  // ---- Device Camera ----
  var deviceStream = null;
  var camStage     = document.getElementById('vStageCam');
  var videoEl      = document.getElementById('vVideo');
  var canvasEl     = document.getElementById('vCanvas');
  var capBtn       = document.getElementById('vCapture');
  var camBtn       = document.getElementById('vCamBtn');

  function stopDeviceCam(){
    if(deviceStream){
      deviceStream.getTracks().forEach(function(t){ t.stop(); });
      deviceStream = null;
    }
    videoEl.style.display = 'none';
    capBtn.style.display  = 'none';
  }

  camBtn.addEventListener('click', function(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert('Kamera tidak didukung browser ini.');
      return;
    }
    stopEspStream();
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
      .then(function(s){
        deviceStream = s;
        videoEl.srcObject = s;
        videoEl.style.display = 'block';
        capBtn.style.display  = 'inline-flex';
        camStage.innerHTML = '';
      })
      .catch(function(){
        alert('Gagal akses kamera (izin & HTTPS).');
      });
  });

  capBtn.addEventListener('click', function(){
    canvasEl.width  = videoEl.videoWidth || 320;
    canvasEl.height = videoEl.videoHeight || 240;
    canvasEl.getContext('2d').drawImage(videoEl,0,0,canvasEl.width,canvasEl.height);
    setPreview(canvasEl.toDataURL('image/jpeg'));
    stopDeviceCam();
  });

  // ---- Classification trigger (reusable) ----
  function triggerClassification(){
    if(!VISION.previewEl){ return; }
    resultDiv.innerHTML = '<p style="font-size:13px;color:var(--c-text-muted)">⏳ Memuat model & menganalisis...</p>';
    runBtn.disabled = true;
    visionLoad().then(function(){
      document.getElementById('vModelNote').innerHTML = VISION.type==='custom'
        ? 'Model kustom JALARI (36 kelas) aktif.'
        : 'Mode demo: MobileNet ImageNet (CDN).';
      return visionClassify(VISION.previewEl);
    }).then(function(preds){
      VISION.lastResult = preds;
      runBtn.disabled = false;
      renderResult(preds);
      var top = preds[0];
      if(top){ compAdd(top.kategori); renderComp(); }
    }).catch(function(err){
      resultDiv.innerHTML = '<p style="color:var(--c-danger);font-size:13px">Gagal: '+(err&&err.message||err)+'</p>';
      runBtn.disabled = false;
    });
  }

  // Run classification
  runBtn.addEventListener('click', triggerClassification);

  // Reset komposisi
  document.getElementById('vReset').addEventListener('click', function(){
    compReset();
    renderComp();
  });

  // ---- Start: check ESP32-CAM ----
  esp32Check();

  renderComp();

  // ---- Cleanup hook (called by main.js go() on page change) ----
  VISION.stopAll = function(){
    stopEspStream();
    esp32StopPolling();
    stopDeviceCam();
  };
}

function renderResult(preds){
  var res=document.getElementById('vResult'); if(!res) return;
  var top=preds[0];
  var h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+
    '<span class="tag" style="background:'+catColor(top.kategori)+';color:#fff">'+catLabel(top.kategori)+'</span>'+
    '<span style="font-size:18px;font-weight:700;color:var(--c-text-primary);text-transform:capitalize">'+top.label+'</span>'+
    '<span style="margin-left:auto;font-family:var(--font-mono);font-size:13px;color:var(--c-text-muted)">'+(top.prob*100).toFixed(1)+'%</span></div>';
  h+='<div class="xai-title" style="font-size:12px;color:var(--c-text-muted);margin-bottom:8px">Top-'+preds.length+' confidence (XAI):</div>';
  for(var i=0;i<preds.length;i++){ var p=preds[i], pct=(p.prob*100);
    h+='<div class="xai-factor"><span style="min-width:90px;flex:0 0 auto;font-size:12px;color:var(--c-text-secondary);text-transform:capitalize;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.label+'</span>'+
       '<div class="xai-bar"><div class="xai-bar-fill" style="width:'+pct.toFixed(0)+'%;background:'+catColor(p.kategori)+'"></div></div>'+
       '<span class="xai-pct">'+pct.toFixed(1)+'%</span></div>';
  }
  res.innerHTML=h;
}

function renderComp(){
  var c=compGet(), total=compTotal(c);
  var order=['buah','sayur','daging','tulang','lainnya'];
  var labels=[], data=[], colors=[];
  for(var i=0;i<order.length;i++){ labels.push(catLabel(order[i])); data.push(c[order[i]]||0); colors.push(catColor(order[i])); }
  // Donut (memakai factory & registry chart global dari main.js)
  if(typeof charts!=='undefined' && charts.comp){ try{charts.comp.destroy();}catch(e){} charts.comp=null; }
  if(typeof mkDoughnut==='function'){ charts.comp=mkDoughnut('cComp', labels, data, colors); }
  // Legend
  var leg=document.getElementById('vCompLegend'); if(leg){
    if(total===0){ leg.innerHTML='<p style="font-size:13px;color:var(--c-text-muted)">Belum ada deteksi. Klasifikasikan gambar untuk mengisi komposisi.</p>'; return; }
    var h='';
    for(var j=0;j<order.length;j++){ var k=order[j], n=c[k]||0, pc=total?(n/total*100):0;
      h+='<div class="info-row"><span class="info-label"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+catColor(k)+';margin-right:8px"></span>'+catLabel(k)+'</span><span class="info-value">'+n+' ('+pc.toFixed(0)+'%)</span></div>';
    }
    h+='<div class="info-row" style="border-top:1px solid var(--c-border);margin-top:6px;padding-top:8px"><span class="info-label">Total deteksi</span><span class="info-value">'+total+'</span></div>';
    leg.innerHTML=h;
  }
}
