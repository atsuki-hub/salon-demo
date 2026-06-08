/** Customer-facing booking form */

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(m) {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function addMinToTime(t, n) {
  return minToTime(timeToMin(t) + n);
}

function defaultDate() {
  // 今日(=2026-05-25 in demo)以降の直近開店日
  const today = new Date('2026-05-25T12:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (!SETTINGS.closedDays.includes(d.getDay())) return fmtDate(d);
  }
  return fmtDate(today);
}

function populateMenus() {
  const sel = document.getElementById('b-menu');
  MENUS.forEach((m) => {
    const o = document.createElement('option');
    o.value = m.menuId;
    o.textContent = `${m.name}（${m.duration}分・${formatYen(m.price)}）`;
    sel.appendChild(o);
  });
}

function populateStylists() {
  const sel = document.getElementById('b-stylist');
  STYLISTS.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.stylistId;
    o.textContent = `${s.name}（${s.role}）`;
    sel.appendChild(o);
  });
}

function populateTimes() {
  const sel = document.getElementById('b-time');
  sel.innerHTML = '<option value="">— 選択 —</option>';
  const open = timeToMin(SETTINGS.openTime);
  const close = timeToMin(SETTINGS.closeTime);
  for (let m = open; m < close; m += 30) {
    const t = minToTime(m);
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t;
    sel.appendChild(o);
  }
}

function updateSummary() {
  const summary = document.getElementById('b-summary');
  const date = document.getElementById('b-date').value;
  const time = document.getElementById('b-time').value;
  const menuId = document.getElementById('b-menu').value;
  const stylistId = document.getElementById('b-stylist').value;

  if (!date || !time || !menuId) {
    summary.hidden = true;
    return;
  }
  const menu = getMenuMap()[menuId];
  const stylist = stylistId ? getStylistMap()[stylistId] : null;
  const d = parseDate(date);
  const endTime = addMinToTime(time, menu.duration);

  document.getElementById('b-sum-time').textContent =
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）　${time} 〜 ${endTime}（${menu.duration}分）`;
  document.getElementById('b-sum-menu').textContent = menu.name;
  document.getElementById('b-sum-stylist').textContent = stylist ? `${stylist.name}（ご指名）` : 'おまかせ';
  document.getElementById('b-sum-price').textContent = formatYen(menu.price);
  summary.hidden = false;
}

function checkClosed() {
  const date = document.getElementById('b-date').value;
  const hint = document.getElementById('b-date-hint');
  if (!date) {
    hint.textContent = '火曜定休';
    hint.className = 'form-hint';
    return false;
  }
  const dow = parseDate(date).getDay();
  const isClosed = SETTINGS.closedDays.includes(dow);
  if (isClosed) {
    hint.textContent = '※ この日は定休日です。別の日をお選びください。';
    hint.className = 'form-hint form-hint-warn';
  } else {
    hint.textContent = '営業日です';
    hint.className = 'form-hint';
  }
  return isClosed;
}

function findAvailableStylist(date, startMin, duration) {
  // ランダムな順序で試す
  const candidates = [...STYLISTS].sort(() => Math.random() - 0.5);
  for (const stylist of candidates) {
    const conflict = RESERVATIONS.some((r) => {
      if (r.date !== date) return false;
      if (r.stylistId !== stylist.stylistId) return false;
      if (r.status === 'キャンセル') return false;
      const rs = timeToMin(r.startTime);
      const re = rs + r.duration;
      return startMin < re && startMin + duration > rs;
    });
    if (!conflict) return stylist;
  }
  return null;
}

function validateAndSubmit() {
  const errEl = document.getElementById('b-error');
  errEl.hidden = true;

  const name = document.getElementById('b-name').value.trim();
  const phone = document.getElementById('b-phone').value.trim();
  const date = document.getElementById('b-date').value;
  const time = document.getElementById('b-time').value;
  const menuId = document.getElementById('b-menu').value;
  const stylistChoice = document.getElementById('b-stylist').value;
  const notes = document.getElementById('b-notes').value.trim();

  if (!name) return showError('お名前をご入力ください');
  if (!date) return showError('ご希望日をお選びください');
  if (!time) return showError('ご希望時刻をお選びください');
  if (!menuId) return showError('メニューをお選びください');

  if (checkClosed()) return showError('選択された日は定休日です。別の日をお選びください');

  const menu = getMenuMap()[menuId];
  const startMin = timeToMin(time);
  const endMin = startMin + menu.duration;
  if (endMin > timeToMin(SETTINGS.closeTime)) {
    return showError(`このメニュー（${menu.duration}分）では閉店時間（${SETTINGS.closeTime}）を超えてしまいます。別の時刻・メニューをお選びください。`);
  }

  // セラピスト決定
  let stylist;
  let nominated = 0;
  if (stylistChoice) {
    // 指名あり
    const requested = getStylistMap()[stylistChoice];
    const conflict = RESERVATIONS.some((r) => {
      if (r.date !== date) return false;
      if (r.stylistId !== stylistChoice) return false;
      if (r.status === 'キャンセル') return false;
      const rs = timeToMin(r.startTime);
      const re = rs + r.duration;
      return startMin < re && endMin > rs;
    });
    if (conflict) {
      return showError(`${requested.name} はその時間帯が満席です。お時間を変えるか、おまかせ予約にお切り替えください。`);
    }
    stylist = requested;
    nominated = 1;
  } else {
    stylist = findAvailableStylist(date, startMin, menu.duration);
    if (!stylist) {
      return showError('申し訳ございません。その時間帯は満席です。別のお時間をお試しください。');
    }
  }

  // 既存顧客マッチング（氏名完全一致）
  const matched = CUSTOMERS.find((c) => c.name === name);
  let customerId;
  let visitType;
  if (matched) {
    customerId = matched.customerId;
    visitType = '再来';
  } else {
    // 新規顧客作成（メモリ上）
    const maxN = CUSTOMERS.reduce((m, c) => {
      const n = Number(c.customerId.replace(/\D/g, ''));
      return n > m ? n : m;
    }, 0);
    customerId = `C${String(maxN + 1).padStart(3, '0')}`;
    CUSTOMERS.push({
      customerId,
      name,
      firstVisitDate: date,
      gender: 'その他',
      phone: phone || null,
    });
    visitType = '新規';
  }

  // 予約ID
  const maxR = RESERVATIONS.reduce((m, r) => {
    const n = Number(r.reservationId.replace(/\D/g, ''));
    return n > m ? n : m;
  }, 0);

  const newReservation = {
    reservationId: `R${String(maxR + 1).padStart(4, '0')}`,
    date,
    startTime: time,
    duration: menu.duration,
    customerId,
    stylistId: stylist.stylistId,
    mainMenuId: menuId,
    nominated,
    techSales: menu.price,
    retailSales: 0,
    visitType,
    status: '予定',
    notes: notes || undefined,
    source: 'customer',
  };
  RESERVATIONS.push(newReservation);

  showSuccess({ name, date, time, menu, stylist, nominated });
}

function showError(msg) {
  const el = document.getElementById('b-error');
  el.textContent = msg;
  el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccess({ name, date, time, menu, stylist, nominated }) {
  document.getElementById('book-form-wrap').hidden = true;
  document.getElementById('book-success').hidden = false;
  const d = parseDate(date);
  const endTime = addMinToTime(time, menu.duration);
  const dl = document.getElementById('book-success-details');
  dl.innerHTML = `
    <dt>お名前</dt><dd>${name} 様</dd>
    <dt>日時</dt><dd>${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）　${time} 〜 ${endTime}</dd>
    <dt>メニュー</dt><dd>${menu.name}（${formatYen(menu.price)}）</dd>
    <dt>担当</dt><dd>${stylist.name}${nominated ? '（ご指名）' : '（おまかせ）'}</dd>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('book-form').reset();
  document.getElementById('b-summary').hidden = true;
  document.getElementById('b-error').hidden = true;
  document.getElementById('book-success').hidden = true;
  document.getElementById('book-form-wrap').hidden = false;
  document.getElementById('b-date').value = defaultDate();
  checkClosed();
}

function initBookPage() {
  document.getElementById('salon-name').textContent = SETTINGS.salonName;

  populateMenus();
  populateStylists();
  populateTimes();

  const dateInput = document.getElementById('b-date');
  dateInput.value = defaultDate();
  dateInput.min = '2026-05-25';
  checkClosed();

  ['b-date', 'b-time', 'b-menu', 'b-stylist'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      checkClosed();
      updateSummary();
    });
  });

  document.getElementById('book-form').addEventListener('submit', (e) => {
    e.preventDefault();
    validateAndSubmit();
  });

  document.getElementById('book-again').addEventListener('click', resetForm);
}

document.addEventListener('DOMContentLoaded', initBookPage);
