/** Dashboard controller */

let charts = {};

function getPeriod() {
  const preset = document.getElementById('period-preset').value;
  const presets = periodPresets();
  const p = presets[preset];
  return { start: p.start, end: p.end, label: p.label };
}

function getStylistFilter() {
  return document.getElementById('stylist-filter').value;
}

function destroyCharts() {
  Object.values(charts).forEach((c) => c.destroy());
  charts = {};
}

function renderDashboard() {
  const { start, end, label } = getPeriod();
  document.getElementById('period-label').textContent = label;

  const stylistId = getStylistFilter();
  const stylistMap = getStylistMap();
  const stylistName = stylistId ? stylistMap[stylistId].name : null;
  const filtered = stylistId
    ? RESERVATIONS.filter((r) => r.stylistId === stylistId)
    : RESERVATIONS;

  const filterBadge = document.getElementById('filter-badge');
  if (stylistId) {
    filterBadge.hidden = false;
    filterBadge.textContent = `担当：${stylistName}（担当ベース集計）`;
  } else {
    filterBadge.hidden = true;
  }

  const m1 = calcM1(filtered, start, end);
  const m2 = calcM2(filtered, start, end);
  const m3 = calcM3(filtered, start, end);
  const m4 = calcM4(filtered, start, end);
  const m5 = calcM5(filtered);
  const m6 = calcM6(filtered);
  const m7 = calcM7(filtered);
  const m8 = calcM8(filtered);
  const m9 = calcM9(filtered, start, end);
  const m10 = calcM10(filtered, start, end);
  const m11 = calcM11(filtered, start, end);
  const m12 = calcM12(filtered, start, end);
  const m13 = calcM13(filtered, start, end);
  const m14 = calcM14(filtered, start, end);

  // M1 cards
  const m1LabelEl = document.getElementById('m1-label');
  if (m1LabelEl) m1LabelEl.textContent = `当月売上（${m1.currentMonthLabel}）`;
  document.getElementById('m1-this').textContent = formatYen(m1.thisTotal);
  const momEl = document.getElementById('m1-mom');
  if (m1.momPct == null) {
    momEl.textContent = '前月比 —';
    momEl.className = 'mom neutral';
  } else {
    const sign = m1.momPct >= 0 ? '+' : '';
    momEl.textContent = `前月比 ${sign}${(m1.momPct * 100).toFixed(1)}%`;
    momEl.className = 'mom ' + (m1.momPct >= 0 ? 'up' : 'down');
  }

  // M2
  document.getElementById('m2-tech').textContent = formatYen(m2.tech);
  document.getElementById('m2-total').textContent = formatYen(m2.total);
  document.getElementById('m2-count').textContent = `${m2.count}件`;

  // M3
  document.getElementById('m3').textContent = formatPct(m3);

  // M4
  document.getElementById('m4-new').textContent = `${m4.newCount}件 (${formatPct(m4.newPct, 0)})`;
  document.getElementById('m4-repeat').textContent = `${m4.repeatCount}件 (${formatPct(m4.repeatPct, 0)})`;

  // M6 M7
  const m6El = document.getElementById('m6');
  if (m6.avg == null) {
    m6El.innerHTML = '<span class="pending">集計中</span>';
  } else {
    m6El.textContent = `${m6.avg}日`;
    if (m6.note) m6El.innerHTML += ` <small class="pending">${m6.note}</small>`;
  }
  document.getElementById('m7').textContent = formatPct(m7);

  // 指名率 — label/値はフィルタに応じて切替
  const m9Label = document.getElementById('m9-label');
  const m9El = document.getElementById('m9-salon');
  if (stylistId) {
    m9Label.textContent = `指名率（${stylistName}）`;
    m9El.textContent = formatPct(m9.salonRate);
  } else {
    m9Label.textContent = '指名率（サロン全体）';
    m9El.textContent = formatPct(m9.salonRate);
  }

  // 稼働率 — フィルタ時はそのセラピストの稼働率
  const m12Label = document.getElementById('m12-label');
  const m12El = document.getElementById('m12-seat');
  if (stylistId) {
    m12Label.textContent = `${stylistName} の稼働率`;
    const own = m12.perStylist.find((p) => p.name === stylistName);
    m12El.textContent = own ? formatPct(own.rate) : '—';
  } else {
    m12Label.textContent = '席稼働率';
    m12El.textContent = formatPct(m12.seatRate);
  }

  // Cancellation / no-show rates
  const periodAll = filterByPeriod(filtered, start, end);
  const totalScheduled = periodAll.length;
  const cancelledCount = periodAll.filter(r => r.status === 'キャンセル').length;
  const noshowCount = periodAll.filter(r => r.status === '無断').length;
  const cancelRate = totalScheduled > 0 ? cancelledCount / totalScheduled : 0;
  const noshowRate = totalScheduled > 0 ? noshowCount / totalScheduled : 0;
  document.getElementById('cancel-rate').textContent = formatPct(cancelRate);
  document.getElementById('cancel-count').textContent = `${cancelledCount}件 / ${totalScheduled}件`;
  document.getElementById('noshow-rate').textContent = formatPct(noshowRate);
  document.getElementById('noshow-count').textContent = `${noshowCount}件 / ${totalScheduled}件`;

  // Total & active customers
  const totalCust = CUSTOMERS.length;
  const activeCustomers = new Set(getCompleted(RESERVATIONS).map(r => r.customerId)).size;
  document.getElementById('total-customers').textContent = `${totalCust}名`;
  document.getElementById('active-customers').textContent = `うち来店実績 ${activeCustomers}名`;

  // M8 table — show all at-risk customers (no artificial limit)
  const tbody = document.querySelector('#m8-table tbody');
  tbody.innerHTML = '';
  if (m8.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">該当なし（90日以内に来店あり）</td></tr>';
  } else {
    m8.forEach((row) => {
      const urgency = row.elapsed >= 180 ? ' class="m8-urgent"' : row.elapsed >= 120 ? ' class="m8-warn"' : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td${urgency}>${row.name}</td><td>${row.lastVisit}</td><td${urgency}>${row.elapsed}日</td><td>${row.stylist}</td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('m8-count').textContent = `${m8.length}名`;

  destroyCharts();
  const chartFont = { family: "'Noto Sans JP', sans-serif" };
  const colors = ['#8b6f5c', '#c4a882', '#6b8f71', '#7a9eb8', '#b87d6b', '#9a8bb8'];

  document.getElementById('m1-title').textContent = `売上推移（${m1.granularityLabel}）`;
  const m1ChartType = m1.granularity === 'month' ? 'line' : 'bar';
  // 日次は土日を強調色に
  const m1BarColors =
    m1.granularity === 'day' && m1.dayOfWeek
      ? m1.dayOfWeek.map((d) => (d === 0 || d === 6 ? '#b87d6b' : '#c4a882'))
      : '#c4a882';
  charts.m1 = new Chart(document.getElementById('chart-m1'), {
    type: m1ChartType,
    data: {
      labels: m1.labels,
      datasets: [{
        label: '売上',
        data: m1.values,
        borderColor: '#8b6f5c',
        backgroundColor: m1ChartType === 'line' ? 'rgba(139,111,92,0.1)' : m1BarColors,
        fill: m1ChartType === 'line',
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => formatYen(ctx.parsed.y) },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => '¥' + (v / 10000).toFixed(0) + '万',
            font: chartFont,
          },
        },
        x: { ticks: { font: chartFont, maxRotation: 45, autoSkip: true } },
      },
    },
  });

  charts.m4 = new Chart(document.getElementById('chart-m4'), {
    type: 'doughnut',
    data: {
      labels: ['新規', '再来'],
      datasets: [{ data: [m4.newCount, m4.repeatCount], backgroundColor: ['#8b6f5c', '#c4a882'] }],
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: chartFont } } } },
  });

  const m5Colors = m5.rates.map((r, i) =>
    m5.statuses[i] ? 'rgba(180,180,180,0.5)' : '#6b8f71'
  );
  charts.m5 = new Chart(document.getElementById('chart-m5'), {
    type: 'bar',
    data: {
      labels: m5.labels.map((l, i) => (m5.statuses[i] ? l + ' (集計中)' : l)),
      datasets: [{
        label: '90日定着率',
        data: m5.rates.map((r) => (r == null ? 0 : r * 100)),
        backgroundColor: m5Colors,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const i = ctx.dataIndex;
              if (m5.statuses[i]) return '集計中（90日未経過）';
              return formatPct(m5.rates[i] / 100);
            },
          },
        },
      },
      scales: {
        y: { max: 100, ticks: { callback: (v) => v + '%', font: chartFont } },
        x: { ticks: { font: chartFont, maxRotation: 45 } },
      },
    },
  });

  renderBarChart('chart-m9', m9.perStylist.map((s) => s.name), m9.perStylist.map((s) => s.rate * 100), '%', '#8b6f5c');
  renderBarChart('chart-m10', m10.map((s) => s.name), m10.map((s) => s.sales), '円', '#c4a882', (v) => formatYen(v));
  renderBarChart('chart-m11', m11.map((s) => s.name), m11.map((s) => s.avg), '円', '#7a9eb8', (v) => formatYen(v));
  renderBarChart('chart-m12', m12.perStylist.map((s) => s.name), m12.perStylist.map((s) => s.rate * 100), '%', '#6b8f71');

  charts.m13 = new Chart(document.getElementById('chart-m13'), {
    type: 'doughnut',
    data: {
      labels: m13.labels,
      datasets: [{ data: m13.values, backgroundColor: colors }],
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: chartFont } } } },
  });

  renderBarChart(
    'chart-m14',
    m14.map((m) => m.name),
    m14.map((m) => Math.round(m.perHour)),
    '円/時',
    '#b87d6b',
    (v) => formatYen(v) + '/時'
  );

  renderComparisonTable(start, end, stylistId);
}

function renderBarChart(canvasId, labels, values, suffix, color, tickFormat) {
  const chartFont = { family: "'Noto Sans JP', sans-serif" };
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: color }],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            callback: tickFormat || ((v) => v + suffix),
            font: chartFont,
          },
        },
        y: { ticks: { font: chartFont } },
      },
    },
  });
}

function computeSummaryRow(reservations, start, end, label, stylist) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const total = done.length;
  const techSales = done.reduce((s, r) => s + r.techSales, 0);
  const retailSales = done.reduce((s, r) => s + r.retailSales, 0);
  const sales = techSales + retailSales;
  const nominated = done.filter((r) => r.nominated === 1).length;
  const treatmentMin = done.reduce((s, r) => s + r.duration, 0);

  // 90日定着率 (期間外も含めて算出、平均値)
  const m5 = calcM5(reservations);
  const validRates = m5.rates.filter((r, i) => !m5.statuses[i] && r != null);
  const avgRetention = validRates.length
    ? validRates.reduce((a, b) => a + b, 0) / validRates.length
    : null;

  // 平均再来周期
  const m6 = calcM6(reservations);

  // リピート率：対象担当の担当顧客のうち2回以上来店
  const allDone = getCompleted(reservations);
  const visitsByCustomer = {};
  allDone.forEach((r) => {
    visitsByCustomer[r.customerId] = (visitsByCustomer[r.customerId] || 0) + 1;
  });
  const cust = Object.keys(visitsByCustomer).length;
  const repeaters = Object.values(visitsByCustomer).filter((n) => n >= 2).length;
  const repeatRate = cust ? repeaters / cust : 0;

  // 稼働率
  const workDays = countWorkDays(start, end);
  let utilRate;
  if (stylist) {
    const workMin = stylist.workHoursPerDay * 60 * workDays;
    utilRate = workMin ? treatmentMin / workMin : 0;
  } else {
    const seatCap = SETTINGS.seats * businessMinutesPerDay() * workDays;
    utilRate = seatCap ? treatmentMin / seatCap : 0;
  }

  return {
    label,
    count: total,
    sales,
    avgSale: total ? sales / total : 0,
    nominationRate: total ? nominated / total : 0,
    repeatRate,
    retention90: avgRetention,
    repeatCycle: m6.avg,
    utilRate,
  };
}

function renderComparisonTable(start, end, highlightId) {
  const rows = [];
  rows.push({ ...computeSummaryRow(RESERVATIONS, start, end, 'サロン全体', null), isTotal: true });
  STYLISTS.forEach((s) => {
    const filtered = RESERVATIONS.filter((r) => r.stylistId === s.stylistId);
    rows.push({
      ...computeSummaryRow(filtered, start, end, s.name, s),
      stylistId: s.stylistId,
    });
  });

  const tbody = document.querySelector('#comparison-table tbody');
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    if (row.isTotal) tr.className = 'row-total';
    if (highlightId && row.stylistId === highlightId) tr.className = 'row-highlight';
    tr.innerHTML = `
      <td>${row.label}</td>
      <td class="num">${row.count}件</td>
      <td class="num">${formatYen(row.sales)}</td>
      <td class="num">${formatYen(row.avgSale)}</td>
      <td class="num">${formatPct(row.nominationRate, 0)}</td>
      <td class="num">${formatPct(row.repeatRate, 0)}</td>
      <td class="num">${row.retention90 == null ? '—' : formatPct(row.retention90, 0)}</td>
      <td class="num">${row.repeatCycle == null ? '—' : row.repeatCycle + '日'}</td>
      <td class="num">${formatPct(row.utilRate, 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function initStylistFilter() {
  const sel = document.getElementById('stylist-filter');
  STYLISTS.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.stylistId;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
}

function initPeriodOptions() {
  const presets = periodPresets();
  Object.entries(presets).forEach(([key, val]) => {
    const opt = document.querySelector(`#period-preset option[value="${key}"]`);
    if (opt) opt.textContent = val.label;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('salon-name').textContent = SETTINGS.salonName;
  initPeriodOptions();
  initStylistFilter();

  // Show data range hint
  const allDates = RESERVATIONS.map(r => r.date).sort();
  if (allDates.length > 0) {
    const hintEl = document.getElementById('data-range-hint');
    if (hintEl) hintEl.textContent = `データ: ${allDates[0]} 〜 ${allDates[allDates.length - 1]}`;
  }

  document.getElementById('period-preset').addEventListener('change', renderDashboard);
  document.getElementById('stylist-filter').addEventListener('change', renderDashboard);
  renderDashboard();
});
