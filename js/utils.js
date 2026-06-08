/** Shared utilities for salon demo */

function parseDate(str) {
  return new Date(str + 'T12:00:00');
}

function formatYen(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function formatPct(n, digits = 1) {
  if (!isFinite(n)) return '—';
  return (n * 100).toFixed(digits) + '%';
}

function daysBetween(a, b) {
  const ms = parseDate(b) - parseDate(a);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function inRange(dateStr, start, end) {
  const d = dateStr;
  return (!start || d >= start) && (!end || d <= end);
}

function getCompleted(reservations) {
  return reservations.filter((r) => r.status === '済');
}

function getMenuMap() {
  return Object.fromEntries(MENUS.map((m) => [m.menuId, m]));
}

function getStylistMap() {
  return Object.fromEntries(STYLISTS.map((s) => [s.stylistId, s]));
}

function getCustomerMap() {
  return Object.fromEntries(CUSTOMERS.map((c) => [c.customerId, c]));
}

function businessMinutesPerDay() {
  const [oh, om] = SETTINGS.openTime.split(':').map(Number);
  const [ch, cm] = SETTINGS.closeTime.split(':').map(Number);
  return ch * 60 + cm - (oh * 60 + om);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  x.setHours(12, 0, 0, 0);
  return x;
}

function bucketKey(dateStr, gran) {
  if (gran === 'day') return dateStr;
  if (gran === 'month') return dateStr.slice(0, 7);
  return fmtDate(startOfWeek(parseDate(dateStr)));
}

function generateBucketKeys(start, end, gran) {
  const keys = [];
  const sd = parseDate(start);
  const ed = parseDate(end);
  if (gran === 'day') {
    for (let d = new Date(sd); d <= ed; d.setDate(d.getDate() + 1)) keys.push(fmtDate(d));
  } else if (gran === 'month') {
    for (let d = new Date(sd.getFullYear(), sd.getMonth(), 1, 12); d <= ed; d.setMonth(d.getMonth() + 1)) {
      keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
    }
  } else {
    let cur = startOfWeek(sd);
    while (cur <= ed) {
      keys.push(fmtDate(cur));
      cur.setDate(cur.getDate() + 7);
    }
  }
  return keys;
}

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

function formatBucketLabel(key, gran) {
  if (gran === 'day') {
    const d = parseDate(key);
    return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JP[d.getDay()]})`;
  }
  if (gran === 'month') return key.replace('-', '/');
  const d = parseDate(key);
  return `${d.getMonth() + 1}/${d.getDate()}週`;
}

function pickGranularity(start, end) {
  const days = daysBetween(start, end) + 1;
  if (days <= 31) return { gran: 'day', label: '日次' };
  if (days <= 93) return { gran: 'week', label: '週次' };
  return { gran: 'month', label: '月次' };
}

function periodPresets() {
  const end = '2026-05-31';
  return {
    thisMonth: { label: '今月（2026年5月）', start: '2026-05-01', end: '2026-05-31' },
    lastMonth: { label: '先月（2026年4月）', start: '2026-04-01', end: '2026-04-30' },
    last3: { label: '直近3ヶ月', start: '2026-03-01', end },
    all: { label: '全期間（6ヶ月）', start: '2025-12-01', end },
  };
}

function filterByPeriod(items, start, end, dateField = 'date') {
  return items.filter((item) => inRange(item[dateField], start, end));
}
