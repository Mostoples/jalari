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
var VISION = { model:null, type:null, ready:false, loading:false, inputSize:224, labels:null, previewEl:null, lastResult:null };

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
    '</div></div>',

    '<div class="grid-2">',
    // INPUT
    '<div class="section-card"><div class="section-header"><div class="section-title">Input Gambar</div></div><div class="section-body">',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">',
    '<label class="btn btn-primary" style="cursor:pointer">Unggah Gambar<input type="file" id="vFile" accept="image/*" style="display:none"></label>',
    '<button class="btn btn-outline" id="vCamBtn">Buka Kamera</button>',
    '<button class="btn btn-primary" id="vRun" disabled>Klasifikasi</button>',
    '</div>',
    '<div id="vStage" style="border:1px dashed var(--c-border);border-radius:10px;min-height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--c-bg-subtle,transparent)">',
    '<span style="font-size:13px;color:var(--c-text-muted)">Belum ada gambar</span>',
    '</div>',
    '<video id="vVideo" autoplay playsinline style="display:none;width:100%;border-radius:10px;margin-top:10px"></video>',
    '<canvas id="vCanvas" style="display:none"></canvas>',
    '<button class="btn btn-outline btn-sm" id="vCapture" style="display:none;margin-top:8px">Ambil Foto</button>',
    '</div></div>',
    // RESULT
    '<div class="section-card"><div class="section-header"><div class="section-title">Hasil Klasifikasi</div></div><div class="section-body" id="vResult">',
    '<p style="font-size:13px;color:var(--c-text-muted)">Hasil akan tampil di sini setelah klasifikasi.</p>',
    '</div></div>',
    '</div>',

    // KOMPOSISI TERDETEKSI
    '<div class="section-card"><div class="section-header"><div class="section-title">Komposisi Organik Terdeteksi (akumulasi)</div><button class="btn btn-outline btn-sm" id="vReset">Reset</button></div><div class="section-body"><div class="grid-2" style="align-items:center">',
    '<div class="chart-wrapper chart-wrapper--donut" style="height:220px;position:relative"><canvas id="cComp"></canvas></div>',
    '<div id="vCompLegend"></div>',
    '</div></div></div>'
  ].join('');

  // ---- referensi elemen ----
  var stage=document.getElementById('vStage'), runBtn=document.getElementById('vRun');
  var fileInp=document.getElementById('vFile'), camBtn=document.getElementById('vCamBtn');
  var video=document.getElementById('vVideo'), canvas=document.getElementById('vCanvas'), capBtn=document.getElementById('vCapture');
  var stream=null;

  function setPreview(src){
    stage.innerHTML='<img id="vImg" src="'+src+'" crossorigin="anonymous" style="max-width:100%;max-height:280px;border-radius:8px">';
    VISION.previewEl=document.getElementById('vImg');
    runBtn.disabled=false;
  }
  function stopCam(){ if(stream){ stream.getTracks().forEach(function(t){t.stop();}); stream=null; } video.style.display='none'; capBtn.style.display='none'; }

  // Upload
  fileInp.addEventListener('change', function(e){
    var f=e.target.files&&e.target.files[0]; if(!f) return; stopCam();
    var rd=new FileReader(); rd.onload=function(ev){ setPreview(ev.target.result); }; rd.readAsDataURL(f);
  });

  // Kamera
  camBtn.addEventListener('click', function(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ alert('Kamera tidak didukung browser ini.'); return; }
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(s){
      stream=s; video.srcObject=s; video.style.display='block'; capBtn.style.display='inline-flex';
    }).catch(function(){ alert('Gagal mengakses kamera (perlu izin & HTTPS).'); });
  });
  capBtn.addEventListener('click', function(){
    canvas.width=video.videoWidth||320; canvas.height=video.videoHeight||240;
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    setPreview(canvas.toDataURL('image/jpeg')); stopCam();
  });

  // Klasifikasi
  runBtn.addEventListener('click', function(){
    if(!VISION.previewEl){ return; }
    var res=document.getElementById('vResult');
    res.innerHTML='<p style="font-size:13px;color:var(--c-text-muted)">Memuat model & menganalisis...</p>';
    runBtn.disabled=true;
    visionLoad().then(function(){
      document.getElementById('vModelNote').innerHTML = VISION.type==='custom' ? 'Model kustom JALARI (36 kelas) aktif.' : 'Mode demo: MobileNet ImageNet (CDN).';
      return visionClassify(VISION.previewEl);
    }).then(function(preds){
      VISION.lastResult=preds; runBtn.disabled=false;
      renderResult(preds);
      var top=preds[0]; if(top){ compAdd(top.kategori); renderComp(); }
    }).catch(function(err){
      res.innerHTML='<p style="color:var(--c-danger);font-size:13px">Gagal: '+(err&&err.message||err)+'</p>'; runBtn.disabled=false;
    });
  });

  // Reset komposisi
  document.getElementById('vReset').addEventListener('click', function(){ compReset(); renderComp(); });

  renderComp();
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
    h+='<div class="xai-factor"><span style="width:130px;font-size:12px;color:var(--c-text-secondary);text-transform:capitalize">'+p.label+'</span>'+
       '<div class="xai-bar"><div class="xai-bar-fill" style="width:'+pct.toFixed(0)+'%;background:'+catColor(p.kategori)+'"></div></div>'+
       '<span class="xai-pct">'+pct.toFixed(1)+'%</span></div>';
  }
  res.innerHTML=h;
}

function renderComp(){
  var c=compGet(), total=compTotal(c);
  var order=['buah','sayur','nasi','lauk','lainnya'];
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
