/**
 * Sample data generator for salon demo.
 * Run: node scripts/generate-sample-data.js
 *
 * Reservations are scheduled per (date, stylist) without time overlap.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'js', 'data');

const SETTINGS = {
  salonName: 'Relax Salon Lumière',
  seats: 4,
  openTime: '10:00',
  closeTime: '20:00',
  closedDays: [2], // Tuesday (0=Sun)
  churnThresholdDays: 90,
};

// マッサージ・リラクゼーションサロンのメニュー
const MENUS = [
  { menuId: 'M001', name: 'もみほぐし 60分', category: 'もみほぐし', duration: 60, price: 5500 },
  { menuId: 'M002', name: 'もみほぐし 90分', category: 'もみほぐし', duration: 90, price: 7700 },
  { menuId: 'M003', name: 'アロマトリートメント 60分', category: 'アロマ', duration: 60, price: 8800 },
  { menuId: 'M004', name: 'アロマトリートメント 90分', category: 'アロマ', duration: 90, price: 12000 },
  { menuId: 'M005', name: 'フットリフレ 40分', category: 'リフレ', duration: 40, price: 4400 },
  { menuId: 'M006', name: 'ヘッドスパ 30分', category: 'ヘッドスパ', duration: 30, price: 3300 },
  { menuId: 'M007', name: 'ストレッチ整体 60分', category: '整体', duration: 60, price: 6600 },
];

const STYLISTS = [
  { stylistId: 'S001', name: '田中 美咲', role: '主任セラピスト', workHoursPerDay: 8 },
  { stylistId: 'S002', name: '鈴木 陽菜', role: 'セラピスト', workHoursPerDay: 8 },
  { stylistId: 'S003', name: '佐藤 健太', role: 'セラピスト', workHoursPerDay: 7 },
];

const FIRST_NAMES = ['愛', '結衣', 'さくら', '美月', '陽菜', '凛', '葵', '楓', '莉子', '彩花', '真由', '優奈', '心春', '詩', '芽依'];
const LAST_NAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function parseDate(s) {
  return new Date(s + 'T12:00:00');
}
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(m) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

const START = new Date('2025-12-01T12:00:00');
const END = new Date('2026-05-31T12:00:00');
const OPEN_MIN = timeToMin(SETTINGS.openTime);
const CLOSE_MIN = timeToMin(SETTINGS.closeTime);
const SLOT_STEP = 30; // 30-minute granularity

// Generate customers (90)
const customers = [];
const customerPrefs = {}; // customerId -> { preferredStylistId, loyalty }
for (let i = 1; i <= 90; i++) {
  const id = `C${String(i).padStart(3, '0')}`;
  const firstVisit = addDays(START, rand(0, 170));
  customers.push({
    customerId: id,
    name: `${pick(LAST_NAMES)} ${pick(FIRST_NAMES)}`,
    firstVisitDate: formatDate(firstVisit),
    gender: Math.random() > 0.15 ? (Math.random() > 0.7 ? '男性' : '女性') : 'その他',
  });
  // Skew preferred stylist: S001 40%, S002 35%, S003 25% でファン分布に差
  const roll = Math.random();
  const preferred = roll < 0.4 ? 'S001' : roll < 0.75 ? 'S002' : 'S003';
  // ロイヤルティ: high=85%固定担当・low=40% / 全体の60%がhigh
  customerPrefs[id] = {
    preferredStylistId: preferred,
    loyalty: Math.random() < 0.6 ? 'high' : 'low',
  };
}

// Spread first visits across months for M5 cohorts
for (let m = 0; m < 6; m++) {
  const monthStart = new Date(2025, 11 + m, 1);
  const count = rand(8, 14);
  for (let j = 0; j < count && customers.length < 95; j++) {
    const idx = rand(0, customers.length - 1);
    const day = rand(1, 28);
    customers[idx].firstVisitDate = formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
}

const reservations = [];
let resId = 1;

function isClosed(d) {
  return SETTINGS.closedDays.includes(d.getDay());
}

// Schedule map: key = `${date}:${stylistId}`, value = array of {startMin, endMin}
const schedule = {};

function tryReserve(dateStr, stylistId, duration) {
  const key = `${dateStr}:${stylistId}`;
  if (!schedule[key]) schedule[key] = [];
  const busy = schedule[key];

  // Random scan of slots aligned to SLOT_STEP
  const candidates = [];
  for (let t = OPEN_MIN; t + duration <= CLOSE_MIN; t += SLOT_STEP) {
    candidates.push(t);
  }
  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const start of candidates) {
    const end = start + duration;
    const conflict = busy.some((b) => start < b.endMin && end > b.startMin);
    if (!conflict) {
      busy.push({ startMin: start, endMin: end });
      busy.sort((a, b) => a.startMin - b.startMin);
      return start;
    }
  }
  return null;
}

// Track visits per customer for 再来 / M5
const visitsByCustomer = {};

function pickStylistForCustomer(customer) {
  const pref = customerPrefs[customer.customerId];
  const stickyProb = pref.loyalty === 'high' ? 0.85 : 0.4;
  if (Math.random() < stickyProb) {
    return STYLISTS.find((s) => s.stylistId === pref.preferredStylistId);
  }
  // 浮気: 他の2人からランダム
  const others = STYLISTS.filter((s) => s.stylistId !== pref.preferredStylistId);
  return pick(others);
}

for (let d = new Date(START); d <= END; d = addDays(d, 1)) {
  if (isClosed(d)) continue;
  const dateStr = formatDate(d);
  const dow = d.getDay();
  // 土日は混む、金曜日もやや多め
  let dailyCount;
  if (dow === 0 || dow === 6) dailyCount = rand(8, 12); // 土日
  else if (dow === 5) dailyCount = rand(5, 8); // 金
  else dailyCount = rand(3, 5); // 平日

  for (let v = 0; v < dailyCount; v++) {
    const customer = pick(customers);
    const menu = pick(MENUS);
    const stylist = pickStylistForCustomer(customer);

    const startMin = tryReserve(dateStr, stylist.stylistId, menu.duration);
    if (startMin == null) continue; // no slot available that day

    const isPreferred = stylist.stylistId === customerPrefs[customer.customerId].preferredStylistId;
    // お気に入りセラピストには高確率で指名、それ以外は低確率
    const nominated = isPreferred && Math.random() < 0.85 ? 1 : Math.random() < 0.15 ? 1 : 0;
    const firstVisit = parseDate(customer.firstVisitDate);
    const sameDayAsFirst = formatDate(d) === customer.firstVisitDate;
    let visitType;
    if (d < firstVisit) visitType = '新規';
    else if (sameDayAsFirst) visitType = '新規';
    else visitType = '再来';

    let techSales = menu.price + rand(-500, 1500);
    techSales = Math.round(techSales / 100) * 100;
    let retailSales = Math.random() < 0.35 ? rand(1, 4) * 800 : 0;

    let status = '済';
    const r = Math.random();
    if (r < 0.04) status = 'キャンセル';
    else if (r < 0.06) status = '無断';

    const id = `R${String(resId++).padStart(4, '0')}`;

    reservations.push({
      reservationId: id,
      date: dateStr,
      startTime: minToTime(startMin),
      duration: menu.duration,
      customerId: customer.customerId,
      stylistId: stylist.stylistId,
      mainMenuId: menu.menuId,
      nominated,
      techSales,
      retailSales,
      visitType: visitType === '新規' && visitsByCustomer[customer.customerId] ? '再来' : visitType,
      status,
    });

    if (status === '済') {
      if (!visitsByCustomer[customer.customerId]) visitsByCustomer[customer.customerId] = [];
      visitsByCustomer[customer.customerId].push(dateStr);
    }
  }
}

// Boost 90-day retention: ~55% of new customers get 2nd visit within 90 days
for (const c of customers) {
  const first = parseDate(c.firstVisitDate);
  const visits = (visitsByCustomer[c.customerId] || []).sort();
  if (visits.length >= 2) continue;
  if (Math.random() >= 0.55) continue;

  // Try up to 8 days within the 90-day window
  for (let attempt = 0; attempt < 8; attempt++) {
    const secondDay = addDays(first, rand(14, 85));
    if (secondDay > END) break;
    if (isClosed(secondDay)) continue;

    const menu = pick(MENUS);
    const stylist = pickStylistForCustomer(c);
    const dateStr = formatDate(secondDay);
    const startMin = tryReserve(dateStr, stylist.stylistId, menu.duration);
    if (startMin == null) continue;

    const isPreferred = stylist.stylistId === customerPrefs[c.customerId].preferredStylistId;
    reservations.push({
      reservationId: `R${String(resId++).padStart(4, '0')}`,
      date: dateStr,
      startTime: minToTime(startMin),
      duration: menu.duration,
      customerId: c.customerId,
      stylistId: stylist.stylistId,
      mainMenuId: menu.menuId,
      nominated: isPreferred && Math.random() < 0.85 ? 1 : Math.random() < 0.15 ? 1 : 0,
      techSales: menu.price,
      retailSales: Math.random() < 0.3 ? rand(800, 3200) : 0,
      visitType: '再来',
      status: '済',
    });
    if (!visitsByCustomer[c.customerId]) visitsByCustomer[c.customerId] = [];
    visitsByCustomer[c.customerId].push(dateStr);
    break;
  }
}

reservations.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

function writeModule(name, varName, data) {
  const content = `// Auto-generated by scripts/generate-sample-data.js\nconst ${varName} = ${JSON.stringify(data, null, 2)};\n`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.js`), content, 'utf8');
}

writeModule('settings', 'SETTINGS', SETTINGS);
writeModule('menus', 'MENUS', MENUS);
writeModule('stylists', 'STYLISTS', STYLISTS);
writeModule('customers', 'CUSTOMERS', customers);
writeModule('reservations', 'RESERVATIONS', reservations);

console.log(`Generated: ${customers.length} customers, ${reservations.length} reservations`);
