/* =====================================================================
   JALARI v3.1 — Monitoring Limbah MBG (Organik + Anorganik)
   Onboarding Personalisasi + 15 Metode Pengolahan Spesifik
   AI Rekomendasi Kontekstual + XAI + Prediksi Kerugian Ekonomi
   ===================================================================== */
'use strict';

/* ============ SECTION 1: KONSTANTA ILMIAH ============ */
var BIOGAS_SIMPLE=0.50, TS_RATIO=0.25, VS_TS=0.85, BMP_VS=0.42, CH4_FRAC=0.60;
var BIOGAS_REFINED=TS_RATIO*VS_TS*BMP_VS/CH4_FRAC; // ~0.149
var ENERGY_PER_M3=5.5, COMPOST_RATIO=0.30, COMPOST_PRICE=2000;
var ELEC_PRICE=1444, CO2_FACTOR=0.58, CO2_FACTOR_INO=0.90, CO2_CREDIT=80;
var ORGANIC_MAX=80, INORGANIC_MAX=30, CHART_PTS=30;
// Inorganic recycling
var PLASTIC_PRICE=800, PAPER_PRICE=1200, OTHER_PRICE=300;
var PLASTIC_RATIO=0.40, PAPER_RATIO=0.35, OTHER_RATIO=0.25;

/* ============ SECTION 2: 15 METODE PENGOLAHAN ============ */
var METHODS = {
  // --- ORGANIK: Peternakan ---
  bsf:          {name:'Budidaya Larva BSF',cat:'peternakan',group:'Peternakan / Pakan',desc:'Larva Black Soldier Fly. Konversi 25% berat basah jadi larva protein tinggi (40-45%).',rate:0.25,unit:'kg larva',cond:{tMin:25,tMax:40,phMin:5.5,phMax:8},ref:'UNS 2025 (E4)'},
  pakan_langsung:{name:'Pakan Ternak Langsung',cat:'peternakan',group:'Peternakan / Pakan',desc:'Sisa makanan layak (nasi, sayur, lauk) setelah sortasi & sterilisasi termal >70\u00B0C.',rate:0.60,unit:'kg pakan',cond:{tMin:20,tMax:50,phMin:5,phMax:8.5},ref:'KemenLH 2025 (E5)'},
  silase:        {name:'Silase Fermentasi',cat:'peternakan',group:'Peternakan / Pakan',desc:'Fermentasi anaerobik dengan EM4/molase. Tahan simpan 3-6 bulan. Proses 14-21 hari.',rate:0.50,unit:'kg silase',cond:{tMin:20,tMax:45,phMin:4,phMax:6},ref:'E4, E5'},
  // --- ORGANIK: Pertanian ---
  composting:    {name:'Composting Aerobik',cat:'pertanian',group:'Pertanian / Tanah',desc:'Pengomposan windrow/in-vessel 21-30 hari. Suhu termofilik optimal 45-60\u00B0C.',rate:0.30,unit:'kg kompos',cond:{tMin:30,tMax:65,phMin:5.5,phMax:8.5},ref:'Malakahmad 2025 (G15)'},
  vermicompost:  {name:'Vermicomposting',cat:'pertanian',group:'Pertanian / Tanah',desc:'Pengomposan cacing Lumbricus/Eisenia. Kascing berkualitas tinggi C/N 10-15. 30-45 hari.',rate:0.25,unit:'kg kascing',cond:{tMin:20,tMax:30,phMin:6,phMax:8},ref:'G15'},
  poc:           {name:'Pupuk Organik Cair (Eco-Enzyme)',cat:'pertanian',group:'Pertanian / Tanah',desc:'Fermentasi buah/sayur + gula merah + air (3:1:10). Proses 90 hari.',rate:0.40,unit:'L POC',cond:{tMin:20,tMax:40,phMin:3.5,phMax:5},ref:'E4'},
  biochar:       {name:'Biochar (Pirolisis)',cat:'pertanian',group:'Pertanian / Tanah',desc:'Karbonisasi pada 300-500\u00B0C tanpa O\u2082. Amandemen tanah + carbon sequestration.',rate:0.20,unit:'kg biochar',cond:{tMin:25,tMax:60,phMin:5,phMax:9},ref:'IPCC'},
  // --- ORGANIK: Energi ---
  anaerobic:     {name:'Anaerobic Digestion (Biogas)',cat:'energi',group:'Energi / Recovery',desc:'Digester anaerobik \u2192 biogas (CH\u2084 60%). BMP: 0.42 m\u00B3 CH\u2084/kg VS.',rate:BIOGAS_REFINED,unit:'m\u00B3 biogas',cond:{tMin:30,tMax:55,phMin:6.5,phMax:7.5},ref:'Okoro-Shekwaga 2024 (D7)'},
  codigestion:   {name:'Co-Digestion + Kotoran Ternak',cat:'energi',group:'Energi / Recovery',desc:'AD campuran food waste + kotoran sapi (70:30). Yield +20-30% vs mono.',rate:BIOGAS_REFINED*1.25,unit:'m\u00B3 biogas',cond:{tMin:30,tMax:55,phMin:6.5,phMax:7.5},ref:'Ogunkunle 2024 (D1)'},
  bioetanol:     {name:'Fermentasi Bioetanol',cat:'energi',group:'Energi / Recovery',desc:'Karbohidrat difermentasi S. cerevisiae \u2192 bioetanol. Yield 0.1 L/kg karbo basah.',rate:0.10,unit:'L etanol',cond:{tMin:25,tMax:35,phMin:4,phMax:5.5},ref:'D11'},
  // --- ANORGANIK ---
  daur_plastik:  {name:'Daur Ulang Plastik',cat:'anorganik',group:'Anorganik',desc:'Pilah PET/HDPE/PP, jual ke pengepul. Harga Rp 800-3.000/kg. Recovery ~40%.',rate:0.40,unit:'kg plastik',price:800,ref:'E3, E10'},
  ecobrick:      {name:'Ecobrick',cat:'anorganik',group:'Anorganik',desc:'Botol plastik diisi padat plastik cacah. 1 ecobrick \u2248 200g plastik. Untuk konstruksi.',rate:0.30,unit:'buah',price:0,ref:'Bebas Sampah (E3)'},
  daur_kertas:   {name:'Daur Ulang Kertas/Karton',cat:'anorganik',group:'Anorganik',desc:'Kertas, karton, kardus dipilah & dijual/diolah. Harga Rp 1.200-2.000/kg.',rate:0.35,unit:'kg kertas',price:1200,ref:'E3, E10'},
  bank_sampah:   {name:'Bank Sampah Sekolah',cat:'anorganik',group:'Anorganik',desc:'Siswa setor sampah bernilai (plastik, kertas, logam) \u2192 saldo/poin tabungan.',rate:0.50,unit:'kg tabungan',price:500,ref:'E10 Fatimah 2020'},
  rdf:           {name:'Refuse Derived Fuel (RDF)',cat:'anorganik',group:'Anorganik',desc:'Sampah anorganik combustible dikeringkan & dipadatkan jadi bahan bakar alternatif.',rate:0.60,unit:'kg RDF',price:200,ref:'B4 Ibitoye 2025'}
};
var ORG_IDS=['bsf','pakan_langsung','silase','composting','vermicompost','poc','biochar','anaerobic','codigestion','bioetanol'];
var INO_IDS=['daur_plastik','ecobrick','daur_kertas','bank_sampah','rdf'];

/* ============ SECTION 3: USER METHODS + SPPG ============ */
var sppg={name:'SPPG SMAN 3 Yogyakarta',short:'SPPG SMAN 3 YK',address:'Jl. Yos Sudarso No.7, Yogyakarta',coordinator:'Adelio Fahri Faradish',lat:-7.7828,lng:110.3608,visibility:'public',capacity:80,capInorganic:30};
try{var _s=JSON.parse(localStorage.getItem('jalari_sppg4'));if(_s)for(var _k in _s)sppg[_k]=_s[_k];}catch(e){}

var userMethods={organic:['composting','anaerobic','bsf'],inorganic:['daur_plastik','bank_sampah'],organicOrder:['composting','anaerobic','bsf']};
try{var _m=JSON.parse(localStorage.getItem('jalari_methods'));if(_m){userMethods=_m;}}catch(e){}

function saveMethods(){localStorage.setItem('jalari_methods',JSON.stringify(userMethods));}
function saveSppg(){localStorage.setItem('jalari_sppg4',JSON.stringify(sppg));}

/* ============ SECTION 4: SENSOR STATE + HISTORY ============ */
var S={organic:22,inorganic:8.5,ulOrg:28,ulIno:28,ph:6.8,temp:36.5,mq4:0.28,humidity:62,voc:45,online:false,lastUpdate:null};
var RL={labels:[],org:[],ino:[]};

var HIST=[];
(function(){for(var d=6;d>=0;d--){var dt=new Date();dt.setDate(dt.getDate()-d);var org=25+Math.random()*40,ino=5+Math.random()*18;
  var bgR=org*BIOGAS_REFINED,enR=bgR*ENERGY_PER_M3;
  HIST.push({date:dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}),dateFull:dt.toLocaleDateString('id-ID'),
    organic:+org.toFixed(1),inorganic:+ino.toFixed(1),ph:+(5.8+Math.random()*2).toFixed(1),temp:+(32+Math.random()*15).toFixed(1),
    mq4:+(0.1+Math.random()*0.5).toFixed(2),humidity:+(50+Math.random()*20).toFixed(0),voc:+(20+Math.random()*60).toFixed(0),
    biogasR:+bgR.toFixed(2),energy:+enR.toFixed(1),compost:+(org*COMPOST_RATIO).toFixed(1),co2:+(org*CO2_FACTOR).toFixed(1),
    econOrg:+calcEconOrg(org).toFixed(0),econIno:+calcEconIno(ino).toFixed(0),lossTotal:+calcLoss(org,ino).toFixed(0)});
}})();

/* ============ SECTION 5: KALKULASI ============ */
function calcEconOrg(org){return org*COMPOST_RATIO*COMPOST_PRICE+org*BIOGAS_REFINED*ENERGY_PER_M3*ELEC_PRICE+org*CO2_FACTOR*CO2_CREDIT;}
function calcEconIno(ino){return ino*(PLASTIC_RATIO*PLASTIC_PRICE+PAPER_RATIO*PAPER_PRICE+OTHER_RATIO*OTHER_PRICE);}
function calcLoss(org,ino){return calcEconOrg(org)+calcEconIno(ino)+org*CO2_FACTOR*150+ino*CO2_FACTOR_INO*150;} // loss includes externality cost
function fmtIDR(n){return 'Rp '+Math.round(n).toLocaleString('id-ID');}
function pad(n){return n<10?'0'+n:''+n;}
function timeStr(d){d=d||new Date();return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());}
function decompPhase(t){if(t<30)return['Lag','Belum aktif','var(--c-text-muted)'];if(t<45)return['Mesofilik','30\u201345\u00B0C','var(--c-primary)'];if(t<60)return['Termofilik','45\u201360\u00B0C','var(--c-accent)'];return['Maturasi','>60\u00B0C','var(--c-purple)'];}

// Method-specific recommendation
function methodRec(id,org,ino){
  var m=METHODS[id];if(!m)return'';
  var val,cok=true;
  if(m.cat==='anorganik'){val=ino*m.rate;cok=true;}
  else{val=org*m.rate;if(m.cond){if(S.temp<m.cond.tMin||S.temp>m.cond.tMax)cok=false;if(S.ph<m.cond.phMin||S.ph>m.cond.phMax)cok=false;}}
  var txt='<strong>'+m.name+':</strong> '+val.toFixed(1)+' '+m.unit+'/hari. ';
  if(cok)txt+='Kondisi sensor <span style="color:var(--c-primary)">sesuai</span>.';
  else txt+='Kondisi sensor <span style="color:var(--c-accent)">belum optimal</span> \u2014 cek suhu/pH.';
  return txt;
}

/* ============ SECTION 6: CHART FACTORY ============ */
var charts={};
function killCharts(){for(var k in charts){try{charts[k].destroy();}catch(e){}}charts={};}
function mkLine(id,labels,ds,yL){var el=document.getElementById(id);if(!el)return null;var dk=document.documentElement.getAttribute('data-theme')==='dark',g=dk?'#1e3a28':'#f1f5f9',t=dk?'#5e8a6f':'#94a3b8';return new Chart(el.getContext('2d'),{type:'line',data:{labels:labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:ds.length>1,position:'top',labels:{boxWidth:10,font:{size:11}}},tooltip:{backgroundColor:'#0f172a',titleColor:'#e2e8f0',bodyColor:'#94a3b8',padding:10}},scales:{x:{grid:{color:g},ticks:{color:t,font:{size:10,family:"'JetBrains Mono',monospace"},maxTicksLimit:8,maxRotation:0}},y:{grid:{color:g},ticks:{color:t,font:{size:11},callback:function(v){return v+(yL||'')}},min:0}}}});}
function mkBar(id,labels,ds,yL){var el=document.getElementById(id);if(!el)return null;var dk=document.documentElement.getAttribute('data-theme')==='dark',g=dk?'#1e3a28':'#f1f5f9',t=dk?'#5e8a6f':'#94a3b8';return new Chart(el.getContext('2d'),{type:'bar',data:{labels:labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:ds.length>1,position:'top',labels:{boxWidth:10,font:{size:11}}},tooltip:{backgroundColor:'#0f172a',titleColor:'#e2e8f0',bodyColor:'#94a3b8'}},scales:{x:{grid:{display:false},ticks:{color:t,font:{size:10}}},y:{grid:{color:g},ticks:{color:t,font:{size:11},callback:function(v){return v+(yL||'')}},beginAtZero:true}}}});}
function mkDoughnut(id,labels,data,colors){var el=document.getElementById(id);if(!el)return null;return new Chart(el.getContext('2d'),{type:'doughnut',data:{labels:labels,datasets:[{data:data,backgroundColor:colors,borderWidth:2,borderColor:'transparent',hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',animation:{duration:400},plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f172a'}}}});}

/* ============ SECTION 7: ROUTER ============ */
var PAGES={home:'Beranda',device:'Device',measurement:'Pengukuran',sensors:'Sensor',analytics:'AI & Energi',vision:'Visi AI',history:'Riwayat',reports:'Laporan',sppg:'Manajemen SPPG',settings:'Pengaturan'};
var curPage='home';
function route(){var h=(location.hash||'').replace(/^#\/?/,'')||'home';if(!PAGES[h])h='home';go(h);}
function go(page){try{curPage=page;killCharts();var items=document.querySelectorAll('.nav-item');for(var i=0;i<items.length;i++){if(items[i].getAttribute('data-page')===page)items[i].classList.add('active');else items[i].classList.remove('active');}var bc=document.getElementById('topbarBreadcrumb');if(bc){var sp=bc.querySelectorAll('span');sp[sp.length-1].textContent=PAGES[page];}var fn={home:pgHome,device:pgDevice,measurement:pgMeasure,sensors:pgSensors,analytics:pgAnalytics,vision:(typeof pgVision==='function'?pgVision:pgHome),history:pgHistory,reports:pgReports,sppg:pgSppg,settings:pgSettings};(fn[page]||pgHome)(document.getElementById('pageContent'));}catch(e){console.error('Route:',e);document.getElementById('pageContent').innerHTML='<div style="padding:40px;color:red"><h2>Error</h2><pre>'+e.message+'</pre></div>';}}

/* ============ SECTION 8: INIT ============ */
document.addEventListener('DOMContentLoaded',function(){
  try{
    var th=localStorage.getItem('jalari_theme')||'light';
    document.documentElement.setAttribute('data-theme',th);
    document.getElementById('themeToggle').addEventListener('click',function(){var c=document.documentElement.getAttribute('data-theme'),n=c==='light'?'dark':'light';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('jalari_theme',n);});
    initSidebar();startClock();
    // Check onboarding
    if(!localStorage.getItem('jalari_onboarded')){showOnboarding();}
    else{window.addEventListener('hashchange',route);route();}
    setTimeout(function(){S.online=true;simTick();setInterval(simTick,5000);},1000);
  }catch(e){console.error('Init:',e);document.getElementById('pageContent').innerHTML='<div style="padding:40px;color:red"><h2>Init Error</h2><pre>'+e.message+'</pre></div>';}
});
function initSidebar(){var sb=document.getElementById('sidebar'),mb=document.getElementById('menuBtn'),tb=document.getElementById('sidebarToggle'),mw=document.getElementById('mainWrapper');var ov=document.createElement('div');ov.className='sidebar-overlay';document.body.appendChild(ov);function close(){sb.classList.remove('mobile-open');ov.classList.remove('active');}mb.addEventListener('click',function(){sb.classList.add('mobile-open');ov.classList.add('active');});tb.addEventListener('click',function(){if(window.innerWidth>768){sb.classList.toggle('hidden');mw.classList.toggle('sidebar-collapsed');}else close();});ov.addEventListener('click',close);var navs=document.querySelectorAll('.nav-item');for(var i=0;i<navs.length;i++)navs[i].addEventListener('click',function(){if(window.innerWidth<=768)close();});document.getElementById('alertBannerClose').addEventListener('click',function(){document.getElementById('alertBanner').style.display='none';});}
function startClock(){var el=document.getElementById('topbarTime');function t(){el.textContent=timeStr();}t();setInterval(t,1000);}

/* ============ SECTION 9: ONBOARDING ============ */
var obStep=1;
function showOnboarding(){
  var root=document.getElementById('onboardingRoot');
  root.innerHTML='<div class="onboarding-overlay" id="obOverlay"><div class="onboarding-card" id="obCard"></div></div>';
  obStep=1; renderObStep();
}
function renderObStep(){
  var card=document.getElementById('obCard');if(!card)return;
  var dots='<div class="ob-steps"><div class="ob-dot'+(obStep>=1?' active':'')+'"></div><div class="ob-dot'+(obStep>=2?(obStep===2?' active':' done'):'')+'"></div><div class="ob-dot'+(obStep>=3?(obStep===3?' active':' done'):'')+'"></div></div>';
  if(obStep===1){
    card.innerHTML=dots+
      '<div style="text-align:center;margin-bottom:20px"><div style="width:48px;height:48px;background:var(--c-primary);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:700;margin-bottom:12px">J</div></div>'+
      '<div class="ob-title">Selamat Datang di JALARI</div>'+
      '<div class="ob-sub">Sistem Monitoring Limbah Program MBG Berbasis AIoT</div>'+
      '<div class="form-group"><label class="form-label">Nama SPPG</label><input type="text" class="form-input" id="obName" value="'+sppg.name+'"></div>'+
      '<div class="form-group"><label class="form-label">Nama Pendek</label><input type="text" class="form-input" id="obShort" value="'+sppg.short+'"></div>'+
      '<div class="form-group"><label class="form-label">Koordinator</label><input type="text" class="form-input" id="obCoord" value="'+sppg.coordinator+'"></div>'+
      '<div class="ob-actions"><span></span><button class="btn btn-primary" id="obNext1">Mulai Personalisasi \u2192</button></div>';
    document.getElementById('obNext1').addEventListener('click',function(){
      sppg.name=document.getElementById('obName').value||sppg.name;
      sppg.short=document.getElementById('obShort').value||sppg.short;
      sppg.coordinator=document.getElementById('obCoord').value||sppg.coordinator;
      obStep=2;renderObStep();
    });
  } else if(obStep===2){
    var groups={};
    for(var i=0;i<ORG_IDS.length;i++){var id=ORG_IDS[i],m=METHODS[id];if(!groups[m.group])groups[m.group]=[];groups[m.group].push(id);}
    var h=dots+'<div class="ob-title">Metode Pengolahan Limbah Organik</div><div class="ob-sub">Pilih metode yang ingin diprioritaskan SPPG Anda (minimal 1)</div>';
    for(var g in groups){
      h+='<div class="ob-group"><div class="ob-group-hdr">'+g+' ('+groups[g].length+')</div><div class="ob-group-body">';
      for(var j=0;j<groups[g].length;j++){var id=groups[g][j],m=METHODS[id],sel=userMethods.organic.indexOf(id)>=0;
        h+='<div class="ob-check'+(sel?' selected':'')+'" data-id="'+id+'"><div class="ob-check-box">'+(sel?'\u2713':'')+'</div><div class="ob-check-text"><div class="ob-check-name">'+m.name+'</div><div class="ob-check-desc">'+m.desc+'</div><div class="ob-check-ref">Ref: '+m.ref+'</div></div></div>';}
      h+='</div></div>';
    }
    h+='<div class="ob-count" id="obOrgCount">'+userMethods.organic.length+' metode dipilih</div>';
    h+='<div id="obOrgSorted"></div>';
    h+='<div class="ob-actions"><button class="btn btn-outline" id="obBack2">\u2190 Kembali</button><button class="btn btn-primary" id="obNext2">Lanjut \u2192</button></div>';
    card.innerHTML=h;
    renderObSorted('obOrgSorted','organic');
    // Toggle checkboxes
    var checks=card.querySelectorAll('.ob-check');
    for(var i=0;i<checks.length;i++){checks[i].addEventListener('click',function(){
      var id=this.getAttribute('data-id'),idx=userMethods.organic.indexOf(id);
      if(idx>=0){userMethods.organic.splice(idx,1);userMethods.organicOrder.splice(userMethods.organicOrder.indexOf(id),1);this.classList.remove('selected');this.querySelector('.ob-check-box').textContent='';}
      else{userMethods.organic.push(id);userMethods.organicOrder.push(id);this.classList.add('selected');this.querySelector('.ob-check-box').textContent='\u2713';}
      document.getElementById('obOrgCount').textContent=userMethods.organic.length+' metode dipilih';
      renderObSorted('obOrgSorted','organic');
    });}
    document.getElementById('obBack2').addEventListener('click',function(){obStep=1;renderObStep();});
    document.getElementById('obNext2').addEventListener('click',function(){if(userMethods.organic.length===0){alert('Pilih minimal 1 metode organik.');return;}obStep=3;renderObStep();});
  } else if(obStep===3){
    var h=dots+'<div class="ob-title">Metode Pengolahan Limbah Anorganik</div><div class="ob-sub">Pilih metode untuk mengelola limbah anorganik (plastik, kertas, dll)</div>';
    h+='<div class="ob-group"><div class="ob-group-body">';
    for(var i=0;i<INO_IDS.length;i++){var id=INO_IDS[i],m=METHODS[id],sel=userMethods.inorganic.indexOf(id)>=0;
      h+='<div class="ob-check'+(sel?' selected':'')+'" data-id="'+id+'"><div class="ob-check-box">'+(sel?'\u2713':'')+'</div><div class="ob-check-text"><div class="ob-check-name">'+m.name+'</div><div class="ob-check-desc">'+m.desc+'</div><div class="ob-check-ref">Ref: '+m.ref+'</div></div></div>';}
    h+='</div></div>';
    h+='<div class="ob-count" id="obInoCount">'+userMethods.inorganic.length+' metode dipilih</div>';
    h+='<div class="ob-actions"><button class="btn btn-outline" id="obBack3">\u2190 Kembali</button><button class="btn btn-primary" id="obFinish">Selesai & Masuk Dashboard \u2192</button></div>';
    card.innerHTML=h;
    var checks=card.querySelectorAll('.ob-check');
    for(var i=0;i<checks.length;i++){checks[i].addEventListener('click',function(){
      var id=this.getAttribute('data-id'),idx=userMethods.inorganic.indexOf(id);
      if(idx>=0){userMethods.inorganic.splice(idx,1);this.classList.remove('selected');this.querySelector('.ob-check-box').textContent='';}
      else{userMethods.inorganic.push(id);this.classList.add('selected');this.querySelector('.ob-check-box').textContent='\u2713';}
      document.getElementById('obInoCount').textContent=userMethods.inorganic.length+' metode dipilih';
    });}
    document.getElementById('obBack3').addEventListener('click',function(){obStep=2;renderObStep();});
    document.getElementById('obFinish').addEventListener('click',function(){
      saveMethods();saveSppg();
      localStorage.setItem('jalari_onboarded','1');
      document.getElementById('onboardingRoot').innerHTML='';
      var sn=document.getElementById('sidebarSppgName');if(sn)sn.textContent=sppg.short;
      window.addEventListener('hashchange',route);route();
    });
  }
}
function renderObSorted(containerId,type){
  var el=document.getElementById(containerId);if(!el)return;
  var arr=type==='organic'?userMethods.organicOrder:userMethods.inorganic;
  if(arr.length===0){el.innerHTML='';return;}
  var h='<div style="font-size:12px;font-weight:600;color:var(--c-text-muted);margin:12px 0 6px">Urutan Prioritas:</div><div class="ob-selected-list">';
  for(var i=0;i<arr.length;i++){var m=METHODS[arr[i]];if(!m)continue;
    h+='<div class="ob-sel-item"><div class="ob-sel-num">'+(i+1)+'</div><span class="ob-sel-name">'+m.name+'</span><div class="ob-sel-arrows"><button data-dir="up" data-idx="'+i+'" data-type="'+type+'">\u25B2</button><button data-dir="dn" data-idx="'+i+'" data-type="'+type+'">\u25BC</button></div></div>';}
  h+='</div>';
  el.innerHTML=h;
  var btns=el.querySelectorAll('.ob-sel-arrows button');
  for(var i=0;i<btns.length;i++){btns[i].addEventListener('click',function(){
    var idx=parseInt(this.getAttribute('data-idx')),dir=this.getAttribute('data-dir'),tp=this.getAttribute('data-type');
    var arr2=tp==='organic'?userMethods.organicOrder:userMethods.inorganic;
    if(dir==='up'&&idx>0){var tmp=arr2[idx];arr2[idx]=arr2[idx-1];arr2[idx-1]=tmp;}
    if(dir==='dn'&&idx<arr2.length-1){var tmp=arr2[idx];arr2[idx]=arr2[idx+1];arr2[idx+1]=tmp;}
    renderObSorted(containerId,tp);
  });}
}

/* ============ SECTION 10: SIMULATOR ============ */
var tickN=0;
function simTick(){tickN++;var hr=new Date().getHours(),pk=(hr>=10&&hr<=14)?1.8:1.0;
  S.organic+=(Math.random()-0.25)*0.7*pk;S.inorganic+=(Math.random()-0.3)*0.25*pk;
  S.organic=Math.max(3,Math.min(ORGANIC_MAX,S.organic));S.inorganic=Math.max(0.5,Math.min(INORGANIC_MAX,S.inorganic));
  S.ulOrg=Math.round(S.organic/ORGANIC_MAX*100);S.ulIno=Math.round(S.inorganic/INORGANIC_MAX*100);
  S.ph=5.8+Math.random()*2;S.temp=32+Math.random()*15;S.mq4=0.1+Math.random()*0.5;
  S.humidity=50+Math.random()*20+(S.organic/ORGANIC_MAX)*10;S.voc=20+Math.random()*40+(S.temp-30)*2;
  S.humidity=Math.min(95,S.humidity);S.voc=Math.min(200,Math.max(0,S.voc));S.lastUpdate=new Date();
  RL.labels.push(timeStr(S.lastUpdate));RL.org.push(+S.organic.toFixed(2));RL.ino.push(+S.inorganic.toFixed(2));
  if(RL.labels.length>CHART_PTS){RL.labels.shift();RL.org.shift();RL.ino.shift();}
  try{if(curPage==='home')updateHome();if(curPage==='measurement')updateMeasLive();checkAlerts();}catch(e){console.error('tick:',e);}
}
function checkAlerts(){var p=S.ulOrg,msg=null,type='warning',cnt=0;
  if(p>=95){msg='KRITIS: Wadah organik penuh ('+p+'%)!';type='critical';cnt++;}else if(p>=80){msg='Peringatan: Wadah organik '+p+'%.';cnt++;}
  if(S.ulIno>=95){msg='KRITIS: Wadah anorganik penuh!';type='critical';cnt++;}else if(S.ulIno>=80)cnt++;
  if(S.mq4>=1.0){msg='Gas metana ('+S.mq4.toFixed(2)+'%) \u2014 ventilasi!';cnt++;}
  if(S.ph<5.0||S.ph>8.5)cnt++;
  var ban=document.getElementById('alertBanner'),txt=document.getElementById('alertBannerText'),bdg=document.getElementById('alertBadge');
  if(msg){ban.style.display='flex';ban.className='alert-banner'+(type==='critical'?' critical':'');txt.textContent=msg;}else ban.style.display='none';
  if(cnt>0){bdg.style.display='flex';bdg.textContent=cnt;}else bdg.style.display='none';
}

/* ============ SECTION 11: HTML HELPERS ============ */
function sc(l,id,v,u,c,p,cap){return '<div class="stat-card stat-card--'+c+'"><div class="stat-card-header"><div class="stat-card-icon stat-card-icon--'+c+'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg></div><span class="stat-card-label">'+l+'</span></div><div class="stat-card-value" id="'+id+'">'+v+'</div><div class="stat-card-unit">'+u+'</div><div class="stat-progress-bar"><div class="stat-progress-fill" id="p_'+id+'" style="width:'+Math.min(100,p)+'%'+(p>=95?';background:var(--c-danger)':p>=80?';background:var(--c-accent)':'')+'"></div></div><div class="stat-card-footer"><span id="pt_'+id+'">'+p+'%</span><span class="stat-capacity">'+cap+'</span></div></div>';}
function sc2(l,id,v,u,c,d){return '<div class="stat-card stat-card--'+c+'"><div class="stat-card-header"><div class="stat-card-icon stat-card-icon--'+c+'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><span class="stat-card-label">'+l+'</span></div><div class="stat-card-value" id="'+id+'">'+v+'</div><div class="stat-card-unit">'+u+'</div><div class="stat-card-detail" id="d_'+id+'">'+d+'</div></div>';}
function xf(n,w,v){v=Math.max(0,Math.min(100,v));return '<div class="xai-factor"><span style="width:140px;font-size:12px;color:var(--c-text-secondary)">'+n+'</span><div class="xai-bar"><div class="xai-bar-fill" style="width:'+v.toFixed(0)+'%"></div></div><span class="xai-pct">'+w+'%</span></div>';}
function stp(n,t,d){return '<div class="step-item"><div class="step-num">'+n+'</div><div class="step-content"><div class="step-title">'+t+'</div><div class="step-desc">'+d+'</div></div></div>';}
function dl7(){return HIST.map(function(h){return h.date;});}

/* ============ SECTION 12: PAGE HOME ============ */
function pgHome(pc){
  var bg=S.organic*BIOGAS_REFINED,en=bg*ENERGY_PER_M3,loss=calcLoss(S.organic,S.inorganic),econOrg=calcEconOrg(S.organic),econIno=calcEconIno(S.inorganic);
  pc.innerHTML=[
    '<div class="page-header"><div><h1 class="page-title">Dashboard Monitoring Limbah MBG</h1><p class="page-subtitle">'+sppg.name+'</p></div><div class="last-update-info"><span class="update-dot live" id="uDot"></span><span id="uTxt">Live</span></div></div>',
    '<div class="stat-cards-grid">',
    sc('Limbah Organik','vOrg',S.organic.toFixed(1),'kg','organic',S.ulOrg,'maks '+ORGANIC_MAX+' kg'),
    sc('Limbah Anorganik','vIno',S.inorganic.toFixed(1),'kg','secondary',S.ulIno,'maks '+INORGANIC_MAX+' kg'),
    sc2('Potensi Biogas','vBio',bg.toFixed(2),'m\u00B3 (refined)','purple',en.toFixed(1)+' kWh energi'),
    sc2('Kerugian Jika Tidak Diolah','vLoss',fmtIDR(loss),'prediksi/hari','danger','Org: '+fmtIDR(econOrg)+' + Ino: '+fmtIDR(econIno)),
    '</div>',
    '<div class="charts-grid">',
    '<div class="chart-card chart-card--wide"><div class="chart-card-header"><div><h3 class="chart-title">Berat Limbah Real-Time</h3><p class="chart-subtitle">Organik + Anorganik \u00B7 rolling '+CHART_PTS+' titik</p></div></div><div class="chart-wrapper"><canvas id="cRT"></canvas></div></div>',
    '<div class="chart-card"><div class="chart-card-header"><div><h3 class="chart-title">Komposisi</h3></div></div><div class="chart-wrapper chart-wrapper--donut"><canvas id="cDon"></canvas><div class="donut-center"><div class="donut-total" id="dTot">'+(S.organic+S.inorganic).toFixed(1)+'</div><div class="donut-label">kg total</div></div></div></div></div>',
    '<div class="grid-2" style="margin-bottom:16px">',
    '<div class="section-card"><div class="section-header"><div class="section-title">Trend Berat 7 Hari</div></div><div class="section-body"><div style="height:200px"><canvas id="cTrW"></canvas></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Trend Kerugian Ekonomi 7 Hari</div></div><div class="section-body"><div style="height:200px"><canvas id="cTrL"></canvas></div></div></div>',
    '</div>',
    '<div class="bottom-grid">',
    '<div class="sensor-table-card"><div class="card-header"><h3 class="card-title">Status Sensor</h3><span class="card-badge">7/7</span></div><table class="sensor-table"><thead><tr><th>Sensor</th><th>Nilai</th><th>Status</th><th>Update</th></tr></thead><tbody id="sTbl"></tbody></table></div>',
    '<div class="insight-card"><div class="card-header"><h3 class="card-title">Rekomendasi AI (Personalisasi)</h3></div><div class="insight-body" id="aiBody"></div>',
    '<div class="energy-summary"><div class="energy-row">',
    '<div class="energy-item"><div class="energy-label">Biogas</div><div class="energy-val" id="eBio">'+bg.toFixed(2)+' m\u00B3</div></div>',
    '<div class="energy-item"><div class="energy-label">Kompos</div><div class="energy-val" id="eCom">'+(S.organic*COMPOST_RATIO).toFixed(1)+' kg</div></div>',
    '<div class="energy-item"><div class="energy-label">Kerugian</div><div class="energy-val" id="eLoss" style="color:var(--c-danger)">'+fmtIDR(loss)+'</div></div>',
    '</div></div></div></div>'
  ].join('');
  charts.rt=mkLine('cRT',[].concat(RL.labels),[
    {label:'Organik',data:[].concat(RL.org),borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,.1)',borderWidth:2,pointRadius:0,tension:.4,fill:true},
    {label:'Anorganik',data:[].concat(RL.ino),borderColor:'#0284c7',backgroundColor:'rgba(2,132,199,.06)',borderWidth:2,pointRadius:0,tension:.4,fill:true}
  ],' kg');
  charts.don=mkDoughnut('cDon',['Organik','Anorganik'],[S.organic,S.inorganic],['#16a34a','#0284c7']);
  var d7=dl7();
  charts.trW=mkBar('cTrW',d7,[{label:'Organik',data:HIST.map(function(h){return h.organic;}),backgroundColor:'rgba(22,163,74,.7)',borderRadius:4},{label:'Anorganik',data:HIST.map(function(h){return h.inorganic;}),backgroundColor:'rgba(2,132,199,.7)',borderRadius:4}],' kg');
  charts.trL=mkBar('cTrL',d7,[{label:'Kerugian Total',data:HIST.map(function(h){return h.lossTotal;}),backgroundColor:'rgba(220,38,38,.6)',borderRadius:4}],'');
  updateSensorTbl();updateAI();
}
function updateHome(){
  var e=document.getElementById('vOrg');if(!e)return;
  var bg=S.organic*BIOGAS_REFINED,en=bg*ENERGY_PER_M3,loss=calcLoss(S.organic,S.inorganic),econOrg=calcEconOrg(S.organic),econIno=calcEconIno(S.inorganic);
  e.textContent=S.organic.toFixed(1);
  document.getElementById('vIno').textContent=S.inorganic.toFixed(1);
  document.getElementById('vBio').textContent=bg.toFixed(2);
  document.getElementById('vLoss').textContent=fmtIDR(loss);
  document.getElementById('d_vBio').textContent=en.toFixed(1)+' kWh energi';
  document.getElementById('d_vLoss').textContent='Org: '+fmtIDR(econOrg)+' + Ino: '+fmtIDR(econIno);
  document.getElementById('dTot').textContent=(S.organic+S.inorganic).toFixed(1);
  document.getElementById('eBio').textContent=bg.toFixed(2)+' m\u00B3';
  document.getElementById('eCom').textContent=(S.organic*COMPOST_RATIO).toFixed(1)+' kg';
  document.getElementById('eLoss').textContent=fmtIDR(loss);
  var p1=document.getElementById('p_vOrg'),p2=document.getElementById('p_vIno');
  if(p1){p1.style.width=Math.min(100,S.ulOrg)+'%';}if(p2){p2.style.width=Math.min(100,S.ulIno)+'%';}
  var pt1=document.getElementById('pt_vOrg'),pt2=document.getElementById('pt_vIno');if(pt1)pt1.textContent=S.ulOrg+'%';if(pt2)pt2.textContent=S.ulIno+'%';
  if(charts.rt){charts.rt.data.labels=[].concat(RL.labels);charts.rt.data.datasets[0].data=[].concat(RL.org);charts.rt.data.datasets[1].data=[].concat(RL.ino);charts.rt.update('none');}
  if(charts.don){charts.don.data.datasets[0].data=[S.organic,S.inorganic];charts.don.update('none');}
  var u=document.getElementById('uTxt');if(u)u.textContent='Live \u00B7 '+timeStr(S.lastUpdate);
  updateSensorTbl();if(tickN%4===0)updateAI();
}
function updateSensorTbl(){var tbl=document.getElementById('sTbl');if(!tbl)return;var t=timeStr(S.lastUpdate);
  var ss=[['Load Cell Organik',S.organic.toFixed(1),'kg',S.organic/ORGANIC_MAX],['Load Cell Anorganik',S.inorganic.toFixed(1),'kg',S.inorganic/INORGANIC_MAX],['Ultrasonik Org.',S.ulOrg,'%',S.ulOrg/100],['Suhu DS18B20',S.temp.toFixed(1),'\u00B0C',S.temp>55?0.9:0.3],['pH Sensor',S.ph.toFixed(1),'pH',(S.ph<5||S.ph>8.5)?0.9:0.3],['MQ-4 CH\u2084',S.mq4.toFixed(2),'%',S.mq4>=1?0.9:0.3],['DHT22 RH',S.humidity.toFixed(0),'%',S.humidity>80?0.85:0.3]];
  var h='';for(var i=0;i<ss.length;i++){var s=ss[i],st=s[3]>=0.85?'critical':s[3]>=0.6?'warning':'normal';h+='<tr><td><span class="sensor-name">'+s[0]+'</span></td><td><span class="sensor-val">'+s[1]+'</span><span class="sensor-unit"> '+s[2]+'</span></td><td><span class="status-badge '+st+'">'+(st==='normal'?'Normal':st==='warning'?'Peringatan':'Kritis')+'</span></td><td><span class="sensor-time">'+t+'</span></td></tr>';}
  tbl.innerHTML=h;
}
function updateAI(){
  var el=document.getElementById('aiBody');if(!el)return;
  var items=[];
  // Fill level
  if(S.ulOrg>=80)items.push(['critical','Wadah organik '+S.ulOrg+'% \u2014 segera kosongkan!']);
  else items.push(['normal','Wadah organik '+S.ulOrg+'% (aman).']);
  if(S.ulIno>=80)items.push(['warning','Wadah anorganik '+S.ulIno+'% \u2014 atur pengangkutan.']);
  // Method-specific recs (top 3 organic)
  for(var i=0;i<Math.min(3,userMethods.organicOrder.length);i++){
    var r=methodRec(userMethods.organicOrder[i],S.organic,S.inorganic);
    if(r)items.push(['normal',r]);
  }
  // Inorganic recs
  for(var i=0;i<Math.min(2,userMethods.inorganic.length);i++){
    var r=methodRec(userMethods.inorganic[i],S.organic,S.inorganic);
    if(r)items.push(['normal',r]);
  }
  // Loss
  items.push(['warning','<strong>Prediksi kerugian</strong> jika tidak diolah: '+fmtIDR(calcLoss(S.organic,S.inorganic))+'/hari']);
  // Alerts
  if(S.mq4>=1.0)items.push(['critical','Gas metana tinggi \u2014 ventilasi!']);
  if(S.ph<5.0)items.push(['warning','pH asam ('+S.ph.toFixed(1)+') \u2014 tambahkan kapur.']);
  var h='<ul class="insight-list">';for(var i=0;i<items.length;i++)h+='<li class="insight-item"><div class="insight-item-dot '+items[i][0]+'"></div><span>'+items[i][1]+'</span></li>';
  el.innerHTML=h+'</ul>';
}

/* ============ PAGES: DEVICE, MEASUREMENT, SENSORS, ANALYTICS, HISTORY, REPORTS, SPPG, SETTINGS ============ */
function pgDevice(pc){var h='<div class="page-header"><div><h1 class="page-title">Device</h1><p class="page-subtitle">ESP32 + 7 Sensor \u2014 '+sppg.short+'</p></div></div>';h+='<div class="section-card"><div class="section-header"><div class="section-title">ESP32 Node Utama</div><span class="tag tag-green">Online</span></div><div class="section-body"><div class="grid-2"><div>';var i1=[['MCU','ESP32-WROOM-32'],['Firmware','v1.4.0-sim'],['IP','192.168.1.42'],['RSSI','-45 dBm'],['Interval','5 detik'],['Biaya','< Rp 750.000']];for(var i=0;i<i1.length;i++)h+='<div class="info-row"><span class="info-label">'+i1[i][0]+'</span><span class="info-value">'+i1[i][1]+'</span></div>';h+='</div><div>';var i2=[['Cloud','Firebase RTDB'],['Protokol','HTTPS REST'],['Success Rate','99.2%'],['Latency','< 300ms'],['Mode','Simulator'],['Uptime','3h 24m']];for(var i=0;i<i2.length;i++)h+='<div class="info-row"><span class="info-label">'+i2[i][0]+'</span><span class="info-value">'+i2[i][1]+'</span></div>';h+='</div></div></div></div>';
  var sensors=[['Load Cell Organik','Berat organik','0-100kg \u00B10.1','GPIO 32,33'],['Load Cell Anorganik','Berat anorganik','0-50kg \u00B10.1','GPIO 25,26'],['HC-SR04','Level pengisian','2-400cm \u00B13mm','GPIO 12,14'],['DS18B20','Suhu dekomposisi','-55-125\u00B0C','GPIO 4'],['pH + ADS1115','Keasaman','0-14 \u00B10.1','I2C'],['MQ-4','Gas metana','200-10000ppm','GPIO 34'],['DHT22','Kelembapan','0-100%RH','GPIO 15']];
  h+='<div class="section-card"><div class="section-header"><div class="section-title">Sensor (7)</div></div><div class="section-body"><div class="device-grid">';for(var i=0;i<sensors.length;i++){var s=sensors[i];h+='<div class="device-item"><div class="device-name">'+s[0]+'</div><div class="device-desc">'+s[1]+'</div><div class="device-meta"><span>Range: '+s[2]+'</span><span>Pin: '+s[3]+'</span><span class="tag tag-green" style="margin-top:6px;width:fit-content">Online</span></div></div>';}h+='</div></div></div>';pc.innerHTML=h;}

function pgMeasure(pc){var bg=S.organic*BIOGAS_REFINED,en=bg*ENERGY_PER_M3,co=S.organic*COMPOST_RATIO,loss=calcLoss(S.organic,S.inorganic);
  pc.innerHTML=['<div class="page-header"><div><h1 class="page-title">Pengukuran</h1><p class="page-subtitle">Live weighing + rumus + protokol</p></div></div>',
    '<div class="grid-2"><div class="section-card"><div class="section-header"><div class="section-title">Organik (Live)</div><span class="tag tag-green">Live</span></div><div class="section-body"><div class="weigh-display"><div class="weigh-value" id="wOrg">'+S.organic.toFixed(1)+'</div><div class="weigh-unit">kg</div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Anorganik (Live)</div><span class="tag tag-blue">Live</span></div><div class="section-body"><div class="weigh-display"><div class="weigh-value" id="wIno" style="color:var(--c-secondary)">'+S.inorganic.toFixed(1)+'</div><div class="weigh-unit">kg</div></div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Rumus & Kalkulasi</div></div><div class="section-body"><div class="formula-card">',
    '<div class="formula-label">BMP Refined (D7)</div>V = '+S.organic.toFixed(1)+' \u00D7 0.149 = <strong>'+bg.toFixed(2)+' m\u00B3</strong> biogas<br>',
    '<div class="formula-label">Energi (IEA)</div>E = '+bg.toFixed(2)+' \u00D7 5.5 = <strong>'+en.toFixed(1)+' kWh</strong><br>',
    '<div class="formula-label">Kompos (G15)</div>K = '+S.organic.toFixed(1)+' \u00D7 0.30 = <strong>'+co.toFixed(1)+' kg</strong><br>',
    '<div class="formula-label">Kerugian Ekonomi Total</div><strong style="color:var(--c-danger)">'+fmtIDR(loss)+'</strong> jika semua limbah dibuang ke TPA',
    '</div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Metode Terpilih ('+userMethods.organicOrder.length+' organik, '+userMethods.inorganic.length+' anorganik)</div></div><div class="section-body">',
    userMethods.organicOrder.map(function(id,i){var m=METHODS[id];return m?'<div class="ob-sel-item"><div class="ob-sel-num">'+(i+1)+'</div><span class="ob-sel-name">'+m.name+'</span><span class="tag tag-green" style="margin-left:auto">'+m.cat+'</span></div>':'';}).join(''),
    userMethods.inorganic.map(function(id,i){var m=METHODS[id];return m?'<div class="ob-sel-item"><div class="ob-sel-num" style="background:var(--c-secondary)">'+(i+1)+'</div><span class="ob-sel-name">'+m.name+'</span><span class="tag tag-blue" style="margin-left:auto">anorganik</span></div>':'';}).join(''),
    '</div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Protokol Pengukuran</div></div><div class="section-body"><div class="step-list">',
    stp(1,'Persiapan','Pastikan sensor online. Kalibrasi load cell saat wadah kosong.'),
    stp(2,'Pemilahan','Pisahkan organik (sisa makanan) dari anorganik (plastik, kertas, styrofoam).'),
    stp(3,'Penimbangan','Timbang organik \u2192 lalu anorganik. Tunggu stabil ~2 detik.'),
    stp(4,'Parameter','pH, suhu, gas, kelembapan terbaca otomatis.'),
    stp(5,'Analisis','Sistem hitung biogas, kompos, daur ulang, kerugian ekonomi. AI beri rekomendasi sesuai metode terpilih.'),
    '</div></div></div>'].join('');
}
function updateMeasLive(){var a=document.getElementById('wOrg'),b=document.getElementById('wIno');if(a)a.textContent=S.organic.toFixed(1);if(b)b.textContent=S.inorganic.toFixed(1);}

function pgSensors(pc){var t=timeStr(S.lastUpdate||new Date());var ss=[{n:'Load Cell Organik',v:S.organic.toFixed(1),u:'kg',c:'#16a34a',p:S.ulOrg,h:'organic'},{n:'Load Cell Anorganik',v:S.inorganic.toFixed(1),u:'kg',c:'#0284c7',p:S.ulIno,h:'inorganic'},{n:'Suhu',v:S.temp.toFixed(1),u:'\u00B0C',c:'#dc2626',p:Math.min(100,S.temp/65*100),h:'temp'},{n:'pH',v:S.ph.toFixed(1),u:'pH',c:'#d97706',p:S.ph/14*100,h:'ph'},{n:'MQ-4 CH\u2084',v:S.mq4.toFixed(2),u:'%',c:'#7c3aed',p:S.mq4/2*100,h:'mq4'},{n:'DHT22 RH',v:S.humidity.toFixed(0),u:'%',c:'#0d9488',p:S.humidity/95*100,h:'humidity'},{n:'MQ-135 VOC',v:S.voc.toFixed(0),u:'ppm',c:'#e11d48',p:S.voc/200*100,h:'voc'}];
  var h='<div class="page-header"><div><h1 class="page-title">Sensor</h1><p class="page-subtitle">7 sensor + trend</p></div></div><div class="device-grid">';
  for(var i=0;i<ss.length;i++){var s=ss[i],st=s.p>=90?'red':s.p>=70?'amber':'green';h+='<div class="device-item"><div class="device-name">'+s.n+'</div><div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:'+s.c+';margin:8px 0">'+s.v+'<span style="font-size:14px;color:var(--c-text-muted)"> '+s.u+'</span></div><div class="stat-progress-bar"><div class="stat-progress-fill" style="width:'+Math.min(100,s.p).toFixed(0)+'%;background:'+s.c+'"></div></div><div style="display:flex;justify-content:space-between;margin:6px 0"><span class="tag tag-'+st+'">'+(st==='green'?'Normal':st==='amber'?'Peringatan':'Kritis')+'</span><span style="font-size:11px;color:var(--c-text-muted);font-family:var(--font-mono)">'+t+'</span></div>';if(s.h)h+='<div style="height:70px;margin-top:6px"><canvas id="cS'+i+'"></canvas></div>';h+='</div>';}
  h+='</div>';pc.innerHTML=h;var d7=dl7();for(var i=0;i<ss.length;i++){var s=ss[i];if(s.h)charts['s'+i]=mkLine('cS'+i,d7,[{label:s.n,data:HIST.map(function(x){return x[s.h];}),borderColor:s.c,borderWidth:1.5,pointRadius:2,tension:.3}],'');}
}

function pgAnalytics(pc){var bg=S.organic*BIOGAS_REFINED,en=bg*ENERGY_PER_M3,loss=calcLoss(S.organic,S.inorganic);
  pc.innerHTML=['<div class="page-header"><div><h1 class="page-title">AI & Energi</h1><p class="page-subtitle">Analitik + XAI + Prediksi Kerugian</p></div></div>',
    '<div class="grid-3">',
    '<div class="section-card"><div class="section-body" style="text-align:center"><div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;margin-bottom:6px">Biogas</div><div style="font-family:var(--font-mono);font-size:36px;font-weight:700;color:var(--c-purple)">'+bg.toFixed(2)+'</div><div style="font-size:12px;color:var(--c-text-muted)">m\u00B3</div></div></div>',
    '<div class="section-card"><div class="section-body" style="text-align:center"><div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;margin-bottom:6px">Energi</div><div style="font-family:var(--font-mono);font-size:36px;font-weight:700;color:var(--c-accent)">'+en.toFixed(1)+'</div><div style="font-size:12px;color:var(--c-text-muted)">kWh</div></div></div>',
    '<div class="section-card"><div class="section-body" style="text-align:center"><div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase;margin-bottom:6px">Kerugian/Hari</div><div style="font-family:var(--font-mono);font-size:36px;font-weight:700;color:var(--c-danger)">'+fmtIDR(loss)+'</div><div style="font-size:12px;color:var(--c-text-muted)">jika ke TPA</div></div></div></div>',
    '<div class="grid-2" style="margin-bottom:16px">',
    '<div class="section-card"><div class="section-header"><div class="section-title">Trend Kerugian 7 Hari</div></div><div class="section-body"><div style="height:200px"><canvas id="cAL"></canvas></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Trend Biogas & Energi</div></div><div class="section-body"><div style="height:200px"><canvas id="cABE"></canvas></div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">XAI \u2014 Faktor Rekomendasi</div></div><div class="section-body"><div class="xai-box"><div class="xai-title">Bobot faktor keputusan AI:</div><div style="margin-top:10px">',
    xf('Berat Organik',20,S.organic/ORGANIC_MAX*100),
    xf('Berat Anorganik',15,S.inorganic/INORGANIC_MAX*100),
    xf('Kesesuaian Metode',20,calcMethodFit()),
    xf('Potensi Biogas',15,Math.min(100,bg/6*100)),
    xf('Suhu Dekomposisi',15,Math.min(100,(S.temp-25)/35*100)),
    xf('pH Optimal',15,Math.max(0,100-Math.abs(S.ph-7)*30)),
    '</div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Metode Terpilih & Potensi</div></div><div class="section-body">',
    userMethods.organicOrder.concat(userMethods.inorganic).map(function(id){var m=METHODS[id];if(!m)return'';var v=m.cat==='anorganik'?S.inorganic*m.rate:S.organic*m.rate;return '<div class="info-row"><span class="info-label">'+m.name+'</span><span class="info-value">'+v.toFixed(1)+' '+m.unit+'/hari</span></div>';}).join(''),
    '</div></div>'].join('');
  var d7=dl7();
  charts.al=mkBar('cAL',d7,[{label:'Kerugian',data:HIST.map(function(h){return h.lossTotal;}),backgroundColor:'rgba(220,38,38,.6)',borderRadius:4}],'');
  charts.abe=mkLine('cABE',d7,[{label:'Biogas',data:HIST.map(function(h){return h.biogasR;}),borderColor:'#7c3aed',borderWidth:2,pointRadius:3,tension:.3},{label:'Energi',data:HIST.map(function(h){return +h.energy;}),borderColor:'#d97706',borderWidth:2,pointRadius:3,tension:.3}],'');
}
function calcMethodFit(){var fit=0,cnt=0;for(var i=0;i<userMethods.organicOrder.length;i++){var m=METHODS[userMethods.organicOrder[i]];if(m&&m.cond){cnt++;if(S.temp>=m.cond.tMin&&S.temp<=m.cond.tMax&&S.ph>=m.cond.phMin&&S.ph<=m.cond.phMax)fit++;}}return cnt>0?fit/cnt*100:50;}

function pgHistory(pc){var h=['<div class="page-header"><div><h1 class="page-title">Riwayat</h1><p class="page-subtitle">7 hari + trend</p></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Data Harian</div></div><div class="section-body"><table class="sensor-table"><thead><tr><th>Tanggal</th><th>Organik</th><th>Anorganik</th><th>Biogas</th><th>Kerugian</th></tr></thead><tbody>'];
  for(var i=HIST.length-1;i>=0;i--){var r=HIST[i];h.push('<tr><td>'+r.dateFull+'</td><td class="sensor-val">'+r.organic+' kg</td><td class="sensor-val">'+r.inorganic+' kg</td><td class="sensor-val">'+r.biogasR+' m\u00B3</td><td>'+fmtIDR(r.lossTotal)+'</td></tr>');}
  h.push('</tbody></table></div></div>');
  h.push('<div class="grid-2"><div class="section-card"><div class="section-header"><div class="section-title">Berat</div></div><div class="section-body"><div style="height:180px"><canvas id="cHW"></canvas></div></div></div>');
  h.push('<div class="section-card"><div class="section-header"><div class="section-title">Kerugian</div></div><div class="section-body"><div style="height:180px"><canvas id="cHL"></canvas></div></div></div></div>');
  pc.innerHTML=h.join('');var d7=dl7();
  charts.hw=mkBar('cHW',d7,[{label:'Organik',data:HIST.map(function(r){return r.organic;}),backgroundColor:'rgba(22,163,74,.7)',borderRadius:4},{label:'Anorganik',data:HIST.map(function(r){return r.inorganic;}),backgroundColor:'rgba(2,132,199,.7)',borderRadius:4}],' kg');
  charts.hl=mkBar('cHL',d7,[{label:'Kerugian',data:HIST.map(function(r){return r.lossTotal;}),backgroundColor:'rgba(220,38,38,.6)',borderRadius:4}],'');
}

function pgReports(pc){var loss=calcLoss(S.organic,S.inorganic);
  pc.innerHTML=['<div class="page-header"><div><h1 class="page-title">Laporan</h1></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Export</div></div><div class="section-body"><button class="btn btn-primary" id="btnCSV">Export CSV</button></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Preview</div></div><div class="section-body">',
    '<div class="info-row"><span class="info-label">SPPG</span><span class="info-value">'+sppg.name+'</span></div>',
    '<div class="info-row"><span class="info-label">Organik</span><span class="info-value">'+S.organic.toFixed(1)+' kg</span></div>',
    '<div class="info-row"><span class="info-label">Anorganik</span><span class="info-value">'+S.inorganic.toFixed(1)+' kg</span></div>',
    '<div class="info-row"><span class="info-label">Kerugian/Hari</span><span class="info-value" style="color:var(--c-danger)">'+fmtIDR(loss)+'</span></div>',
    '<div class="info-row"><span class="info-label">Metode Organik</span><span class="info-value">'+userMethods.organicOrder.map(function(id){return(METHODS[id]||{}).name||id;}).join(', ')+'</span></div>',
    '<div class="info-row"><span class="info-label">Metode Anorganik</span><span class="info-value">'+userMethods.inorganic.map(function(id){return(METHODS[id]||{}).name||id;}).join(', ')+'</span></div>',
    '</div></div>'].join('');
  document.getElementById('btnCSV').addEventListener('click',function(){var csv='Tanggal,Organik,Anorganik,Biogas,Energi,Kompos,Kerugian\n';for(var i=0;i<HIST.length;i++){var r=HIST[i];csv+=r.dateFull+','+r.organic+','+r.inorganic+','+r.biogasR+','+r.energy+','+r.compost+','+r.lossTotal+'\n';}var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='jalari_report.csv';a.click();});
}

function pgSppg(pc){
  pc.innerHTML=['<div class="page-header"><div><h1 class="page-title">Manajemen SPPG</h1></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Profil</div></div><div class="section-body"><div class="grid-2"><div>',
    '<div class="form-group"><label class="form-label">Nama SPPG</label><input type="text" class="form-input" id="fN" value="'+sppg.name+'"></div>',
    '<div class="form-group"><label class="form-label">Alamat</label><input type="text" class="form-input" id="fA" value="'+sppg.address+'"></div>',
    '</div><div>',
    '<div class="form-group"><label class="form-label">Koordinator</label><input type="text" class="form-input" id="fC" value="'+sppg.coordinator+'"></div>',
    '<div class="form-group"><label class="form-label">Visibility</label><select class="form-select" id="fV"><option value="public"'+(sppg.visibility==='public'?' selected':'')+'>Publik</option><option value="internal"'+(sppg.visibility==='internal'?' selected':'')+'>Internal</option></select></div>',
    '</div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Lokasi GPS</div></div><div class="section-body"><div class="map-container"><div style="text-align:center"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><div style="font-weight:600;color:var(--c-text-primary);margin-top:6px">'+sppg.lat.toFixed(4)+', '+sppg.lng.toFixed(4)+'</div></div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Metode Organik Terpilih</div><span class="tag tag-green">'+userMethods.organicOrder.length+' aktif</span></div><div class="section-body"><div id="sppgOrgList"></div><button class="btn btn-sm btn-outline" id="btnReOnboard" style="margin-top:10px">Ubah Metode (Re-Onboarding)</button></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Metode Anorganik Terpilih</div><span class="tag tag-blue">'+userMethods.inorganic.length+' aktif</span></div><div class="section-body">',
    userMethods.inorganic.map(function(id,i){var m=METHODS[id];return m?'<div class="ob-sel-item"><div class="ob-sel-num" style="background:var(--c-secondary)">'+(i+1)+'</div><span class="ob-sel-name">'+m.name+'</span></div>':'';}).join(''),
    '</div></div>',
    '<button class="btn btn-primary" id="btnSaveSppg">Simpan</button>'].join('');
  renderObSorted('sppgOrgList','organic');
  document.getElementById('btnSaveSppg').addEventListener('click',function(){sppg.name=document.getElementById('fN').value;sppg.address=document.getElementById('fA').value;sppg.coordinator=document.getElementById('fC').value;sppg.visibility=document.getElementById('fV').value;saveSppg();saveMethods();var sn=document.getElementById('sidebarSppgName');if(sn)sn.textContent=sppg.short;alert('Disimpan!');});
  document.getElementById('btnReOnboard').addEventListener('click',function(){localStorage.removeItem('jalari_onboarded');showOnboarding();});
}

function pgSettings(pc){var dk=document.documentElement.getAttribute('data-theme')==='dark';
  pc.innerHTML=['<div class="page-header"><div><h1 class="page-title">Pengaturan</h1></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Tampilan</div></div><div class="section-body"><div class="toggle-row"><div><div class="toggle-text">Dark Mode</div></div><div class="toggle-switch'+(dk?' active':'')+'" id="dmT"></div></div></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Personalisasi</div></div><div class="section-body"><p style="font-size:13px;color:var(--c-text-secondary);margin-bottom:10px">Metode terpilih: '+userMethods.organicOrder.length+' organik, '+userMethods.inorganic.length+' anorganik</p><button class="btn btn-outline" id="btnResetOb">Reset & Ulangi Personalisasi</button></div></div>',
    '<div class="section-card"><div class="section-header"><div class="section-title">Tentang</div></div><div class="section-body">',
    '<div class="info-row"><span class="info-label">Versi</span><span class="info-value">JALARI v3.1</span></div>',
    '<div class="info-row"><span class="info-label">Kompetisi</span><span class="info-value">OPSI 2026</span></div>',
    '<div class="info-row"><span class="info-label">Tim</span><span class="info-value">Adelio Fahri F. & Rafael M.E.S.</span></div>',
    '<div class="info-row"><span class="info-label">Literatur</span><span class="info-value">75 paper</span></div>',
    '</div></div>'].join('');
  document.getElementById('dmT').addEventListener('click',function(){this.classList.toggle('active');var n=this.classList.contains('active')?'dark':'light';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('jalari_theme',n);});
  document.getElementById('btnResetOb').addEventListener('click',function(){localStorage.removeItem('jalari_onboarded');showOnboarding();});
}
