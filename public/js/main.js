/* =========================================
   JALARI — Main JS (Simulator Mode)
   Monitoring Limbah MBG
   ========================================= */

'use strict';

/* ===== CONSTANTS ===== */
const BIOGAS_PER_KG   = 0.5;   // m³ per kg organik
const ENERGY_PER_M3   = 5.5;   // kWh per m³ biogas
const COMPOST_RATIO   = 0.35;  // kg kompos per kg organik
const COMPOST_PRICE   = 2000;  // IDR/kg
const PLASTIC_PRICE   = 800;
const PAPER_PRICE     = 1200;
const OTHER_PRICE     = 300;
const ELEC_PRICE      = 1400;  // IDR/kWh
const ORGANIC_MAX     = 60;    // kg
const INORGANIC_MAX   = 30;    // kg
const CHART_POINTS    = 30;    // titik dalam grafik

/* ===== STATE ===== */
const state = {
  organic:      22.0,
  inorganic:    8.5,
  ph:           6.8,
  temperature:  36.5,
  mq4:          0.28,
  ultrasonic_org:  37,   // %
  ultrasonic_inorg: 28,  // %
  alerts:       [],
  chartLabels:  [],
  chartOrganic: [],
  chartInorganic: [],
  lastUpdate:   null,
  online:       false,
};

/* ===== CACHE DOM ===== */
const $ = id => document.getElementById(id);

const els = {
  statOrganic:      $('statOrganic'),
  statInorganic:    $('statInorganic'),
  statBiogas:       $('statBiogas'),
  statBiogasEnergy: $('statBiogasEnergy'),
  statEconomy:      $('statEconomy'),
  statCompost:      $('statCompost'),
  statOrganicPct:   $('statOrganicPct'),
  statInorganicPct: $('statInorganicPct'),
  progressOrganic:  $('progressOrganic'),
  progressInorganic:$('progressInorganic'),
  donutTotal:       $('donutTotal'),
  donutOrganicPct:  $('donutOrganicPct'),
  donutInorganicPct:$('donutInorganicPct'),
  sensorTableBody:  $('sensorTableBody'),
  sensorOnlineCount:$('sensorOnlineCount'),
  insightBody:      $('insightBody'),
  energyBiogas:     $('energyBiogas'),
  energyCompost:    $('energyCompost'),
  energyKwh:        $('energyKwh'),
  updateDot:        $('updateDot'),
  lastUpdateText:   $('lastUpdateText'),
  alertBanner:      $('alertBanner'),
  alertBannerText:  $('alertBannerText'),
  alertBadge:       $('alertBadge'),
  alertBtn:         $('alertBtn'),
  topbarTime:       $('topbarTime'),
};

/* ===== CHART INSTANCES ===== */
let realtimeChart = null;
let donutChart    = null;

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCharts();
  startClock();
  simulateConnect();
});

/* ===== SIDEBAR ===== */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const menuBtn  = document.getElementById('menuBtn');
  const toggleBtn= document.getElementById('sidebarToggle');
  const wrapper  = document.getElementById('mainWrapper');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
  }
  function closeSidebar() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  }

  menuBtn.addEventListener('click', openSidebar);
  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      sidebar.classList.toggle('hidden');
      wrapper.classList.toggle('sidebar-collapsed');
    } else {
      closeSidebar();
    }
  });
  overlay.addEventListener('click', closeSidebar);

  // Nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // Alert banner close
  document.getElementById('alertBannerClose').addEventListener('click', () => {
    els.alertBanner.style.display = 'none';
  });
}

/* ===== CLOCK ===== */
function startClock() {
  function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    els.topbarTime.textContent =
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ===== CHARTS INIT ===== */
function initCharts() {
  // Pre-fill labels
  for (let i = CHART_POINTS; i >= 0; i--) {
    const d = new Date(Date.now() - i * 5000);
    state.chartLabels.push(timeLabel(d));
    state.chartOrganic.push(null);
    state.chartInorganic.push(null);
  }

  // Real-time line chart
  const ctx1 = document.getElementById('realtimeChart').getContext('2d');
  realtimeChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: [...state.chartLabels],
      datasets: [
        {
          label: 'Organik (kg)',
          data: [...state.chartOrganic],
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Anorganik (kg)',
          data: [...state.chartInorganic],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2,132,199,.06)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) : '–'} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { size: 10, family: "'JetBrains Mono', monospace" },
            maxTicksLimit: 8,
            maxRotation: 0,
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => v + ' kg'
          },
          min: 0,
          suggestedMax: 70,
        }
      }
    }
  });

  // Donut chart
  const ctx2 = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Organik', 'Anorganik'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#16a34a', '#0284c7'],
        borderColor: ['#fff', '#fff'],
        borderWidth: 3,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)} kg (${Math.round(ctx.parsed / (ctx.dataset.data[0]+ctx.dataset.data[1])*100)}%)`
          }
        }
      }
    }
  });
}

/* ===== SIMULATOR ===== */
function simulateConnect() {
  // Simulate connection delay
  setTimeout(() => {
    state.online = true;
    els.updateDot.className = 'update-dot live';
    els.lastUpdateText.textContent = 'Live — simulator aktif';
    startSimulator();
  }, 1200);
}

function startSimulator() {
  // Initial render
  tick();
  // Update every 5 seconds
  setInterval(tick, 5000);
}

let tickCount = 0;
function tick() {
  tickCount++;

  // Simulate realistic waste accumulation pattern
  const hour = new Date().getHours();
  const peakFactor = (hour >= 10 && hour <= 14) ? 1.8 : 1.0; // peak at lunch

  state.organic    += (Math.random() - 0.28) * 0.6 * peakFactor;
  state.inorganic  += (Math.random() - 0.30) * 0.25 * peakFactor;
  state.ph          = 6.2 + Math.random() * 1.2;
  state.temperature = 34 + Math.random() * 8;
  state.mq4         = 0.15 + Math.random() * 0.45;

  // Clamp
  state.organic    = Math.max(2,  Math.min(ORGANIC_MAX,   state.organic));
  state.inorganic  = Math.max(0.5,Math.min(INORGANIC_MAX, state.inorganic));

  state.ultrasonic_org  = Math.round((state.organic   / ORGANIC_MAX)   * 100);
  state.ultrasonic_inorg= Math.round((state.inorganic / INORGANIC_MAX) * 100);
  state.lastUpdate = new Date();

  updateUI();
}

/* ===== UPDATE UI ===== */
function updateUI() {
  const { organic, inorganic } = state;
  const total      = organic + inorganic;

  /* --- Analytics --- */
  const biogasVol  = organic * BIOGAS_PER_KG;
  const biogasKwh  = biogasVol * ENERGY_PER_M3;
  const compostKg  = organic * COMPOST_RATIO;
  const compostVal = compostKg * COMPOST_PRICE;
  const inorgVal   = inorganic * (0.4*PLASTIC_PRICE + 0.35*PAPER_PRICE + 0.25*OTHER_PRICE);
  const econTotal  = compostVal + inorgVal + (biogasKwh * ELEC_PRICE);

  /* --- Stat Cards --- */
  els.statOrganic.textContent    = organic.toFixed(1);
  els.statInorganic.textContent  = inorganic.toFixed(1);
  els.statBiogas.textContent     = biogasVol.toFixed(2);
  els.statBiogasEnergy.textContent= biogasKwh.toFixed(1) + ' kWh potensi energi';
  els.statEconomy.textContent    = 'Rp ' + Math.round(econTotal).toLocaleString('id-ID');
  els.statCompost.textContent    = compostKg.toFixed(1) + ' kg potensi kompos';

  const orgPct  = Math.min(100, Math.round((organic  / ORGANIC_MAX)   * 100));
  const inoPct  = Math.min(100, Math.round((inorganic/ INORGANIC_MAX) * 100));
  els.statOrganicPct.textContent   = orgPct  + '% kapasitas';
  els.statInorganicPct.textContent = inoPct  + '% kapasitas';

  els.progressOrganic.style.width   = orgPct  + '%';
  els.progressInorganic.style.width = inoPct  + '%';

  // Color progress by fill level
  setProgressColor(els.progressOrganic,   orgPct);
  setProgressColor(els.progressInorganic, inoPct);

  /* --- Donut --- */
  els.donutTotal.textContent       = total.toFixed(1);
  els.donutOrganicPct.textContent  = total > 0 ? Math.round(organic   / total * 100) + '%' : '–';
  els.donutInorganicPct.textContent= total > 0 ? Math.round(inorganic / total * 100) + '%' : '–';
  donutChart.data.datasets[0].data = [organic, inorganic];
  donutChart.update('none');

  /* --- Real-time chart --- */
  const label = timeLabel(state.lastUpdate);
  state.chartLabels.push(label);
  state.chartOrganic.push(parseFloat(organic.toFixed(2)));
  state.chartInorganic.push(parseFloat(inorganic.toFixed(2)));
  if (state.chartLabels.length > CHART_POINTS + 1) {
    state.chartLabels.shift();
    state.chartOrganic.shift();
    state.chartInorganic.shift();
  }
  realtimeChart.data.labels                  = [...state.chartLabels];
  realtimeChart.data.datasets[0].data        = [...state.chartOrganic];
  realtimeChart.data.datasets[1].data        = [...state.chartInorganic];
  realtimeChart.update('none');

  /* --- Sensor Table --- */
  updateSensorTable();

  /* --- Alerts --- */
  checkAlerts();

  /* --- Insight --- */
  if (tickCount === 1 || tickCount % 4 === 0) updateInsight(biogasVol, biogasKwh, compostKg, econTotal);

  /* --- Energy Summary --- */
  els.energyBiogas.textContent  = biogasVol.toFixed(2) + ' m³';
  els.energyCompost.textContent = compostKg.toFixed(1) + ' kg';
  els.energyKwh.textContent     = biogasKwh.toFixed(1) + ' kWh';

  /* --- Last update --- */
  const pad = n => String(n).padStart(2,'0');
  const d = state.lastUpdate;
  els.lastUpdateText.textContent =
    `Live · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  els.updateDot.className = 'update-dot live';
}

function setProgressColor(el, pct) {
  el.classList.remove('warning','critical');
  if (pct >= 95) el.classList.add('critical');
  else if (pct >= 80) el.classList.add('warning');
}

/* ===== SENSOR TABLE ===== */
function updateSensorTable() {
  const { organic, inorganic, ultrasonic_org, ultrasonic_inorg, mq4, ph, temperature } = state;
  const time = timeLabel(state.lastUpdate);

  const sensors = [
    {
      name:  'Load Cell — Organik',
      value: organic.toFixed(1),
      unit:  'kg',
      status: organic / ORGANIC_MAX >= 0.95 ? 'critical' : organic / ORGANIC_MAX >= 0.80 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'Load Cell — Anorganik',
      value: inorganic.toFixed(1),
      unit:  'kg',
      status: inorganic / INORGANIC_MAX >= 0.95 ? 'critical' : inorganic / INORGANIC_MAX >= 0.80 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'Ultrasonik — Organik',
      value: ultrasonic_org,
      unit:  '%',
      status: ultrasonic_org >= 95 ? 'critical' : ultrasonic_org >= 80 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'Ultrasonik — Anorganik',
      value: ultrasonic_inorg,
      unit:  '%',
      status: ultrasonic_inorg >= 95 ? 'critical' : ultrasonic_inorg >= 80 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'MQ-4 Biogas (CH₄)',
      value: mq4.toFixed(2),
      unit:  '%',
      status: mq4 >= 2.0 ? 'critical' : mq4 >= 1.0 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'Sensor pH',
      value: ph.toFixed(1),
      unit:  'pH',
      status: ph < 5.5 || ph > 8.5 ? 'warning' : 'normal',
      time,
    },
    {
      name:  'Suhu (DS18B20)',
      value: temperature.toFixed(1),
      unit:  '°C',
      status: temperature > 60 ? 'critical' : temperature > 50 ? 'warning' : 'normal',
      time,
    },
  ];

  const statusLabel = { normal:'Normal', warning:'Peringatan', critical:'Kritis', offline:'Offline' };
  const onlineCount = sensors.filter(s => s.status !== 'offline').length;
  els.sensorOnlineCount.textContent = `${onlineCount}/${sensors.length} Online`;

  els.sensorTableBody.innerHTML = sensors.map(s => `
    <tr>
      <td><span class="sensor-name">${s.name}</span></td>
      <td><span class="sensor-val">${s.value}</span><span class="sensor-unit">${s.unit}</span></td>
      <td><span class="status-badge ${s.status}">${statusLabel[s.status]}</span></td>
      <td><span class="sensor-time">${s.time}</span></td>
    </tr>
  `).join('');
}

/* ===== ALERTS ===== */
function checkAlerts() {
  const { organic, inorganic, mq4, ph } = state;
  const orgPct  = organic   / ORGANIC_MAX   * 100;
  const inoPct  = inorganic / INORGANIC_MAX * 100;

  let bannerMsg  = null;
  let bannerType = 'warning';
  let count = 0;

  if (orgPct >= 95)  { bannerMsg = `KRITIS: Tempat sampah organik penuh (${orgPct.toFixed(0)}%)!`;  bannerType = 'critical'; count++; }
  else if (orgPct >= 80) { bannerMsg = `Peringatan: Tempat sampah organik mencapai ${orgPct.toFixed(0)}% kapasitas.`; count++; }
  if (inoPct >= 95)  { bannerMsg = `KRITIS: Tempat sampah anorganik penuh (${inoPct.toFixed(0)}%)!`; bannerType = 'critical'; count++; }
  else if (inoPct >= 80 && !bannerMsg) { bannerMsg = `Peringatan: Tempat sampah anorganik mencapai ${inoPct.toFixed(0)}% kapasitas.`; count++; }
  if (mq4 >= 1.0) { bannerMsg = `Peringatan: Gas metana terdeteksi (${mq4.toFixed(2)}%) — cek ventilasi!`; count++; }
  if (ph < 5.5 || ph > 8.5) count++;

  if (bannerMsg) {
    els.alertBanner.style.display = 'flex';
    els.alertBanner.className     = `alert-banner${bannerType === 'critical' ? ' critical' : ''}`;
    els.alertBannerText.textContent = bannerMsg;
  } else {
    els.alertBanner.style.display = 'none';
  }

  if (count > 0) {
    els.alertBadge.style.display = 'flex';
    els.alertBadge.textContent   = count;
  } else {
    els.alertBadge.style.display = 'none';
  }
}

/* ===== AI INSIGHT ===== */
function updateInsight(biogasVol, biogasKwh, compostKg, econTotal) {
  const { organic, inorganic } = state;
  const total   = organic + inorganic;
  const orgRatio= total > 0 ? Math.round(organic / total * 100) : 0;
  const inoRatio= 100 - orgRatio;
  const econFmt = Math.round(econTotal).toLocaleString('id-ID');

  // Generate contextual recommendations
  const items = [];

  const orgPct = organic / ORGANIC_MAX * 100;
  const inoPct = inorganic / INORGANIC_MAX * 100;

  if (orgPct >= 80) {
    items.push({ dot:'critical', text:`<strong>Segera kosongkan</strong> tempat sampah organik (${orgPct.toFixed(0)}% kapasitas)` });
  } else {
    items.push({ dot:'normal',  text:`Tempat sampah organik masih aman di <strong>${orgPct.toFixed(0)}%</strong> kapasitas` });
  }

  items.push({ dot:'normal', text:`Potensi biogas saat ini: <strong>${biogasVol.toFixed(2)} m³</strong> = <strong>${biogasKwh.toFixed(1)} kWh</strong> energi` });
  items.push({ dot:'normal', text:`Potensi kompos: <strong>${compostKg.toFixed(1)} kg</strong> pupuk organik` });

  const ratioStatus = orgRatio >= 60 && orgRatio <= 80 ? 'normal' : 'warning';
  items.push({ dot: ratioStatus, text:`Rasio organik/anorganik: <strong>${orgRatio}:${inoRatio}</strong> ${orgRatio >= 60 && orgRatio <= 80 ? '(ideal 70:30 ✓)' : '(target 70:30)'}` });

  items.push({ dot:'normal', text:`Estimasi nilai ekonomi sirkular hari ini: <strong>Rp ${econFmt}</strong>` });

  const hour = new Date().getHours();
  if (hour >= 10 && hour <= 14) {
    items.push({ dot:'warning', text:`<strong>Jam puncak aktif</strong> (10:00–14:00) — pantau pengisian lebih ketat` });
  }

  els.insightBody.innerHTML = `
    <ul class="insight-list">
      ${items.map(it => `
        <li class="insight-item">
          <div class="insight-item-dot ${it.dot}"></div>
          <span>${it.text}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

/* ===== HELPERS ===== */
function timeLabel(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
