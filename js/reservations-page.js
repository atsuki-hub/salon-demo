/** Reservation management page: day timegrid / week / month / list views */

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];
// Use the latest reservation date as "today" so the demo always starts on data-rich day
const TODAY_STR = (() => {
  const allDates = RESERVATIONS.map(r => r.date).sort();
  return allDates[allDates.length - 1] || fmtDate(new Date());
})();
let currentView = 'grid'; // 'grid' | 'week' | 'month' | 'list'

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(min) {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}
function addMinToTime(t, n) {
  return minToTime(timeToMin(t) + n);
}

function dateLabel(dateStr) {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
}

function shiftDay(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function startOfWeekMon(dateStr) {
  const d = parseDate(dateStr);
  const dow = d.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  return fmtDate(d);
}

function shiftMonth(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return fmtDate(d);
}

function getSelectedDate() {
  return document.getElementById('day-picker').value;
}

function setSelectedDate(dateStr) {
  document.getElementById('day-picker').value = dateStr;
  renderDay();
}

function renderDay() {
  const dateStr = getSelectedDate();

  // ラベル更新
  updateViewLabel(dateStr);

  // 定休日ヒントは日ビューのときだけ
  const isClosed = SETTINGS.closedDays.includes(parseDate(dateStr).getDay());
  document.getElementById('closed-hint').hidden = !(currentView === 'grid' && isClosed);

  if (currentView === 'grid') {
    const todays = RESERVATIONS.filter((r) => r.date === dateStr);
    document.getElementById('day-count').textContent = `${todays.length}件`;
    renderTimegrid(dateStr, todays, isClosed);
  } else if (currentView === 'week') {
    const monStr = startOfWeekMon(dateStr);
    const weekRange = getWeekDates(monStr);
    const count = RESERVATIONS.filter((r) => weekRange.includes(r.date)).length;
    document.getElementById('day-count').textContent = `週${count}件`;
    renderWeek(dateStr);
  } else if (currentView === 'month') {
    const d = parseDate(dateStr);
    const count = RESERVATIONS.filter((r) => {
      const rd = parseDate(r.date);
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
    }).length;
    document.getElementById('day-count').textContent = `月${count}件`;
    renderMonth(dateStr);
  } else {
    document.getElementById('day-count').textContent = '';
    renderListView();
  }
}

function getWeekDates(monStr) {
  const arr = [];
  for (let i = 0; i < 7; i++) arr.push(shiftDay(monStr, i));
  return arr;
}

function updateViewLabel(dateStr) {
  const el = document.getElementById('day-label');
  if (currentView === 'grid' || currentView === 'list') {
    el.textContent = dateLabel(dateStr);
  } else if (currentView === 'week') {
    const monStr = startOfWeekMon(dateStr);
    const sunStr = shiftDay(monStr, 6);
    const m1 = parseDate(monStr);
    const m2 = parseDate(sunStr);
    if (m1.getMonth() === m2.getMonth()) {
      el.textContent = `${m1.getFullYear()}年${m1.getMonth() + 1}月${m1.getDate()}日 – ${m2.getDate()}日（週）`;
    } else {
      el.textContent = `${m1.getFullYear()}年${m1.getMonth() + 1}月${m1.getDate()}日 – ${m2.getMonth() + 1}月${m2.getDate()}日（週）`;
    }
  } else if (currentView === 'month') {
    const d = parseDate(dateStr);
    el.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }
}

function renderTimegrid(dateStr, todays, isClosed) {
  const grid = document.getElementById('timegrid');
  grid.innerHTML = '';

  const openMin = timeToMin(SETTINGS.openTime);
  const closeMin = timeToMin(SETTINGS.closeTime);
  const slots = (closeMin - openMin) / 30;

  // Header row
  const corner = document.createElement('div');
  corner.className = 'tg-corner';
  corner.style.gridColumn = '1';
  corner.style.gridRow = '1';
  grid.appendChild(corner);

  STYLISTS.forEach((s, i) => {
    const h = document.createElement('div');
    h.className = 'tg-head';
    h.style.gridColumn = String(i + 2);
    h.style.gridRow = '1';
    h.innerHTML = `<strong>${s.name}</strong><span>${s.role}</span>`;
    grid.appendChild(h);
  });

  // Time labels and cells
  for (let s = 0; s < slots; s++) {
    const min = openMin + s * 30;
    const timeStr = minToTime(min);

    const tl = document.createElement('div');
    tl.className = 'tg-time' + (min % 60 === 0 ? ' tg-time-hour' : '');
    tl.style.gridColumn = '1';
    tl.style.gridRow = String(s + 2);
    tl.textContent = min % 60 === 0 ? timeStr : '';
    grid.appendChild(tl);

    STYLISTS.forEach((stylist, i) => {
      const cell = document.createElement('div');
      cell.className = 'tg-cell';
      cell.dataset.stylist = stylist.stylistId;
      cell.dataset.time = timeStr;
      cell.dataset.date = dateStr;
      cell.style.gridColumn = String(i + 2);
      cell.style.gridRow = String(s + 2);
      if (!isClosed) {
        cell.addEventListener('click', onEmptyCellClick);
      }
      grid.appendChild(cell);
    });
  }

  // Total row count for closed overlay
  grid.style.gridTemplateRows = `40px repeat(${slots}, 40px)`;

  if (isClosed) {
    const overlay = document.createElement('div');
    overlay.className = 'tg-closed';
    overlay.style.gridColumn = '2 / -1';
    overlay.style.gridRow = `2 / ${slots + 2}`;
    overlay.textContent = '定休日';
    grid.appendChild(overlay);
    return;
  }

  // Reservation blocks
  const stylistIndex = Object.fromEntries(STYLISTS.map((s, i) => [s.stylistId, i]));
  const menuMap = getMenuMap();
  const customerMap = getCustomerMap();

  todays.forEach((r) => {
    const col = stylistIndex[r.stylistId];
    if (col === undefined) return;
    const startMin = timeToMin(r.startTime);
    if (startMin < openMin) return;
    const slotIdx = (startMin - openMin) / 30;
    const span = Math.max(1, Math.ceil(r.duration / 30));

    const block = document.createElement('div');
    block.className = `tg-block status-${r.status}` + (r.nominated ? ' nominated' : '');
    block.style.gridColumn = String(col + 2);
    block.style.gridRow = `${slotIdx + 2} / span ${span}`;

    const customer = customerMap[r.customerId];
    const menu = menuMap[r.mainMenuId];
    const endTime = addMinToTime(r.startTime, r.duration);
    block.innerHTML = `
      <div class="tg-block-time">${r.startTime}–${endTime}${r.nominated ? '　<span class="tg-pin">指名</span>' : ''}</div>
      <div class="tg-block-customer">${customer ? customer.name : r.customerId}</div>
      <div class="tg-block-menu">${menu ? menu.name : r.mainMenuId}</div>
    `;
    block.title = 'クリックで詳細を表示';
    block.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openDetailModal(r);
    });
    grid.appendChild(block);
  });
}

/* === 週ビュー === */

function renderWeek(dateStr) {
  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';

  const monStr = startOfWeekMon(dateStr);
  const customerMap = getCustomerMap();
  const menuMap = getMenuMap();
  const stylistOrder = Object.fromEntries(STYLISTS.map((s, i) => [s.stylistId, i]));

  for (let i = 0; i < 7; i++) {
    const ds = shiftDay(monStr, i);
    const d = parseDate(ds);
    const dow = d.getDay();
    const isClosed = SETTINGS.closedDays.includes(dow);
    const isToday = ds === TODAY_STR;
    const classes = ['week-day'];
    if (isClosed) classes.push('closed');
    if (isToday) classes.push('today');
    if (dow === 0) classes.push('sunday');
    if (dow === 6) classes.push('saturday');

    const col = document.createElement('div');
    col.className = classes.join(' ');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'week-day-header';
    header.innerHTML = `
      <span class="wd-date">${d.getMonth() + 1}/${d.getDate()}</span>
      <span class="wd-dow">${WEEKDAY[dow]}</span>
    `;
    header.title = 'クリックでこの日のタイムグリッドへ';
    header.addEventListener('click', () => {
      setSelectedDate(ds);
      switchView('grid');
    });
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'week-day-body';
    if (isClosed) {
      body.innerHTML = '<div class="week-closed">定休日</div>';
    } else {
      const list = RESERVATIONS.filter((r) => r.date === ds).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      if (list.length === 0) {
        body.innerHTML = '<div class="week-empty">予約なし</div>';
      } else {
        list.forEach((r) => {
          const sIdx = stylistOrder[r.stylistId] ?? 0;
          const customer = customerMap[r.customerId];
          const menu = menuMap[r.mainMenuId];
          const ev = document.createElement('div');
          ev.className = `week-event stylist-${sIdx} status-${r.status}` + (r.nominated ? ' nominated' : '');
          ev.innerHTML = `
            <div class="we-time">${r.startTime}</div>
            <div class="we-customer">${customer ? customer.name : r.customerId}${r.nominated ? ' <span class="we-pin">指</span>' : ''}</div>
            <div class="we-menu">${menu ? menu.name : r.mainMenuId}</div>
          `;
          ev.title = `${customer ? customer.name : ''} / ${menu ? menu.name : ''} / ${r.startTime}〜 / ${STYLISTS[sIdx]?.name || ''}`;
          ev.addEventListener('click', () => openDetailModal(r));
          body.appendChild(ev);
        });
      }
    }
    col.appendChild(body);
    grid.appendChild(col);
  }
}

/* === 月ビュー === */

function renderMonth(dateStr) {
  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';

  const d0 = parseDate(dateStr);
  const year = d0.getFullYear();
  const month = d0.getMonth();

  // 曜日ヘッダー (月-日)
  ['月', '火', '水', '木', '金', '土', '日'].forEach((dow, i) => {
    const h = document.createElement('div');
    h.className = 'month-head';
    if (i === 5) h.classList.add('saturday');
    if (i === 6) h.classList.add('sunday');
    h.textContent = dow;
    grid.appendChild(h);
  });

  const firstDay = new Date(year, month, 1, 12);
  const firstDow = firstDay.getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const lastDay = new Date(year, month + 1, 0, 12);
  const totalDays = startOffset + lastDay.getDate();
  const totalCells = Math.ceil(totalDays / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cur = new Date(year, month, 1 - startOffset + i, 12);
    const ds = fmtDate(cur);
    const isCurrentMonth = cur.getMonth() === month;
    const isToday = ds === TODAY_STR;
    const dow = cur.getDay();
    const isClosed = SETTINGS.closedDays.includes(dow);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'month-cell';
    if (!isCurrentMonth) cell.classList.add('other-month');
    if (isClosed) cell.classList.add('closed');
    if (isToday) cell.classList.add('today');
    if (dow === 0) cell.classList.add('sunday');
    if (dow === 6) cell.classList.add('saturday');

    const dones = RESERVATIONS.filter((r) => r.date === ds && r.status === '済');
    const plans = RESERVATIONS.filter((r) => r.date === ds && r.status === '予定');
    const cancels = RESERVATIONS.filter(
      (r) => r.date === ds && (r.status === 'キャンセル' || r.status === '無断'),
    );
    const sales = dones.reduce((s, r) => s + r.techSales + r.retailSales, 0);
    const totalCount = dones.length + plans.length;

    let body = '';
    if (isClosed) {
      body = '<div class="mc-closed">定休</div>';
    } else if (!isCurrentMonth) {
      body = totalCount > 0 ? `<div class="mc-count-muted">${totalCount}</div>` : '';
    } else {
      const parts = [];
      if (totalCount > 0) parts.push(`<div class="mc-count">${totalCount}件</div>`);
      if (sales > 0) parts.push(`<div class="mc-sales">${formatYen(sales)}</div>`);
      if (plans.length > 0) parts.push(`<div class="mc-plans">予定 ${plans.length}</div>`);
      if (cancels.length > 0 && plans.length === 0) parts.push(`<div class="mc-cancels">取消 ${cancels.length}</div>`);
      body = parts.join('');
    }

    cell.innerHTML = `
      <div class="mc-date">${cur.getDate()}</div>
      ${body}
    `;

    cell.addEventListener('click', () => {
      setSelectedDate(ds);
      switchView('grid');
    });

    grid.appendChild(cell);
  }
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-toggle button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  document.getElementById('timegrid-view').hidden = view !== 'grid';
  document.getElementById('week-view').hidden = view !== 'week';
  document.getElementById('month-view').hidden = view !== 'month';
  document.getElementById('list-view').hidden = view !== 'list';
  renderDay();
}

function shiftByCurrentView(direction) {
  const cur = getSelectedDate();
  let next;
  if (currentView === 'week') next = shiftDay(cur, direction * 7);
  else if (currentView === 'month') next = shiftMonth(cur, direction);
  else next = shiftDay(cur, direction);
  setSelectedDate(next);
}

function onEmptyCellClick(ev) {
  const cell = ev.currentTarget;
  cell.classList.add('tg-cell-flash');
  setTimeout(() => cell.classList.remove('tg-cell-flash'), 400);
  openReservationModal({
    date: cell.dataset.date,
    stylistId: cell.dataset.stylist,
    time: cell.dataset.time,
  });
}

/* === 予約追加モーダル === */

let nextReservationSeq = null;

function getNextReservationId() {
  if (nextReservationSeq == null) {
    const maxN = RESERVATIONS.reduce((max, r) => {
      const n = Number(r.reservationId.replace(/\D/g, ''));
      return n > max ? n : max;
    }, 0);
    nextReservationSeq = maxN + 1;
  } else {
    nextReservationSeq++;
  }
  return `R${String(nextReservationSeq).padStart(4, '0')}`;
}

function openReservationModal({ date, stylistId, time }) {
  const modal = document.getElementById('reservation-modal');
  modal.hidden = false;

  document.getElementById('modal-date').textContent = dateLabel(date);
  modal.dataset.date = date;

  // Stylist
  const stylistSel = document.getElementById('modal-stylist');
  stylistSel.innerHTML = '';
  STYLISTS.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.stylistId;
    o.textContent = s.name;
    if (s.stylistId === stylistId) o.selected = true;
    stylistSel.appendChild(o);
  });

  // Time slots
  populateTimeOptions(time);

  // Customer
  const custSel = document.getElementById('modal-customer');
  custSel.innerHTML = '<option value="">— 選択してください —</option>';
  [...CUSTOMERS]
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    .forEach((c) => {
      const o = document.createElement('option');
      o.value = c.customerId;
      o.textContent = c.name;
      custSel.appendChild(o);
    });

  // Menu
  const menuSel = document.getElementById('modal-menu');
  menuSel.innerHTML = '<option value="">— 選択してください —</option>';
  MENUS.forEach((m) => {
    const o = document.createElement('option');
    o.value = m.menuId;
    o.textContent = `${m.name}（${m.duration}分・${formatYen(m.price)}）`;
    menuSel.appendChild(o);
  });

  // Reset
  document.getElementById('modal-nominated').checked = false;
  document.getElementById('modal-duration').textContent = '—';
  hideModalError();

  // Focus
  setTimeout(() => custSel.focus(), 50);
}

function populateTimeOptions(selected) {
  const sel = document.getElementById('modal-time');
  sel.innerHTML = '';
  const open = timeToMin(SETTINGS.openTime);
  const close = timeToMin(SETTINGS.closeTime);
  for (let m = open; m < close; m += 30) {
    const t = minToTime(m);
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t;
    if (t === selected) o.selected = true;
    sel.appendChild(o);
  }
}

function closeReservationModal() {
  document.getElementById('reservation-modal').hidden = true;
}

function showModalError(msg) {
  const el = document.getElementById('modal-error');
  el.textContent = msg;
  el.hidden = false;
}

function hideModalError() {
  document.getElementById('modal-error').hidden = true;
}

function updateDurationDisplay() {
  const menuId = document.getElementById('modal-menu').value;
  const time = document.getElementById('modal-time').value;
  const el = document.getElementById('modal-duration');
  if (!menuId || !time) {
    el.textContent = '—';
    return;
  }
  const menu = getMenuMap()[menuId];
  const endTime = addMinToTime(time, menu.duration);
  el.textContent = `${menu.duration}分　／　${time} 〜 ${endTime}`;
}

function validateAndCreateReservation() {
  hideModalError();
  const date = document.getElementById('reservation-modal').dataset.date;
  const stylistId = document.getElementById('modal-stylist').value;
  const time = document.getElementById('modal-time').value;
  const customerId = document.getElementById('modal-customer').value;
  const menuId = document.getElementById('modal-menu').value;
  const nominated = document.getElementById('modal-nominated').checked ? 1 : 0;

  if (!customerId) return showModalError('顧客を選択してください'), null;
  if (!menuId) return showModalError('メニューを選択してください'), null;

  const menu = getMenuMap()[menuId];
  const startMin = timeToMin(time);
  const endMin = startMin + menu.duration;

  if (endMin > timeToMin(SETTINGS.closeTime)) {
    return showModalError(`営業時間（${SETTINGS.closeTime}）を超えます。別のメニューか時刻を選んでください。`), null;
  }

  // Overlap check
  const conflicts = RESERVATIONS.filter((r) => {
    if (r.date !== date) return false;
    if (r.stylistId !== stylistId) return false;
    if (r.status === 'キャンセル') return false;
    const rs = timeToMin(r.startTime);
    const re = rs + r.duration;
    return startMin < re && endMin > rs;
  });

  if (conflicts.length > 0) {
    const c = conflicts[0];
    return showModalError(
      `${getStylistMap()[stylistId].name} は ${c.startTime}〜${addMinToTime(c.startTime, c.duration)} に既に予約があります。`,
    ), null;
  }

  // Determine visitType
  const priorVisits = RESERVATIONS.filter(
    (r) => r.customerId === customerId && r.status !== 'キャンセル',
  );
  const visitType = priorVisits.length === 0 ? '新規' : '再来';

  const newReservation = {
    reservationId: getNextReservationId(),
    date,
    startTime: time,
    duration: menu.duration,
    customerId,
    stylistId,
    mainMenuId: menuId,
    nominated,
    techSales: menu.price,
    retailSales: 0,
    visitType,
    status: '予定',
  };
  return newReservation;
}

/* === 予約詳細モーダル === */

function openDetailModal(reservation) {
  const modal = document.getElementById('detail-modal');
  modal.hidden = false;

  const customer = getCustomerMap()[reservation.customerId];
  const stylist = getStylistMap()[reservation.stylistId];
  const menu = getMenuMap()[reservation.mainMenuId];
  const endTime = addMinToTime(reservation.startTime, reservation.duration);

  document.getElementById('detail-customer').textContent = customer ? customer.name : reservation.customerId;
  document.getElementById('detail-time').textContent =
    `${dateLabel(reservation.date)}　${reservation.startTime} 〜 ${endTime}（${reservation.duration}分）`;
  document.getElementById('detail-stylist').innerHTML =
    `${stylist ? stylist.name : reservation.stylistId}${reservation.nominated ? '　<span class="tg-pin">指名</span>' : ''}`;
  document.getElementById('detail-menu').textContent = menu
    ? `${menu.name}（${formatYen(menu.price)}）`
    : reservation.mainMenuId;
  document.getElementById('detail-sales').textContent = formatYen(reservation.techSales + reservation.retailSales);
  document.getElementById('detail-visit-type').textContent = reservation.visitType;
  document.getElementById('detail-status').innerHTML =
    `<span class="badge badge-${reservation.status}">${reservation.status}</span>`;

  const deleteBtn = document.getElementById('detail-delete');
  const cancelBtn = document.getElementById('detail-cancel-status');
  const isPlanned = reservation.status === '予定';
  const isActive = reservation.status === '予定' || reservation.status === '済';

  deleteBtn.hidden = !isPlanned;
  cancelBtn.hidden = !isActive || reservation.status === 'キャンセル';

  deleteBtn.onclick = () => {
    const idx = RESERVATIONS.findIndex((r) => r.reservationId === reservation.reservationId);
    if (idx >= 0) RESERVATIONS.splice(idx, 1);
    closeDetailModal();
    renderDay();
  };
  cancelBtn.onclick = () => {
    reservation.status = 'キャンセル';
    closeDetailModal();
    renderDay();
  };
}

function closeDetailModal() {
  document.getElementById('detail-modal').hidden = true;
}

function initDetailModal() {
  document.getElementById('detail-close').addEventListener('click', closeDetailModal);
  document.getElementById('detail-close-btn').addEventListener('click', closeDetailModal);
  document.getElementById('detail-backdrop').addEventListener('click', closeDetailModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('detail-modal').hidden) {
      closeDetailModal();
    }
  });
}

function initReservationModal() {
  document.getElementById('modal-close').addEventListener('click', closeReservationModal);
  document.getElementById('modal-cancel').addEventListener('click', closeReservationModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeReservationModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('reservation-modal').hidden) {
      closeReservationModal();
    }
  });

  document.getElementById('modal-menu').addEventListener('change', updateDurationDisplay);
  document.getElementById('modal-time').addEventListener('change', updateDurationDisplay);

  document.getElementById('reservation-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = validateAndCreateReservation();
    if (!r) return;
    RESERVATIONS.push(r);
    closeReservationModal();
    renderDay();
  });
}

/* List view (existing functionality preserved) */

function enrichReservation(r) {
  const menu = getMenuMap()[r.mainMenuId];
  const stylist = getStylistMap()[r.stylistId];
  const customer = getCustomerMap()[r.customerId];
  return {
    ...r,
    menuName: menu?.name || r.mainMenuId,
    stylistName: stylist?.name || r.stylistId,
    customerName: customer?.name || r.customerId,
  };
}

function renderListView() {
  const stylistFilter = document.getElementById('filter-stylist').value;
  const statusFilter = document.getElementById('filter-status').value;
  const dateStr = getSelectedDate();

  let list = RESERVATIONS.filter((r) => r.date === dateStr).map(enrichReservation);
  if (stylistFilter) list = list.filter((r) => r.stylistId === stylistFilter);
  if (statusFilter) list = list.filter((r) => r.status === statusFilter);

  list.sort((a, b) => (a.startTime).localeCompare(b.startTime));

  const tbody = document.querySelector('#res-table tbody');
  tbody.innerHTML = '';
  document.getElementById('res-count').textContent = `${list.length}件`;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">該当する予約がありません</td></tr>';
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement('tr');
    tr.className = 'status-' + r.status;
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.startTime}</td>
      <td>${r.customerName}</td>
      <td>${r.menuName}</td>
      <td>${r.duration}分</td>
      <td>${r.stylistName}</td>
      <td>${r.nominated ? '指名' : '—'}</td>
      <td>${formatYen(r.techSales + r.retailSales)}</td>
      <td>${r.visitType}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function initPage() {
  document.getElementById('salon-name').textContent = SETTINGS.salonName;
  document.getElementById('day-picker').value = TODAY_STR;

  // Stylist filter for list
  const stylistSel = document.getElementById('filter-stylist');
  STYLISTS.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.stylistId;
    opt.textContent = s.name;
    stylistSel.appendChild(opt);
  });

  // Navigation: 日=±1日 / 週=±7日 / 月=±1ヶ月
  document.getElementById('prev-day').addEventListener('click', () => shiftByCurrentView(-1));
  document.getElementById('next-day').addEventListener('click', () => shiftByCurrentView(1));
  document.getElementById('today-btn').addEventListener('click', () => setSelectedDate(TODAY_STR));
  document.getElementById('day-picker').addEventListener('change', renderDay);

  // View toggle
  document.querySelectorAll('.view-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // List filters
  document.getElementById('filter-stylist').addEventListener('change', renderListView);
  document.getElementById('filter-status').addEventListener('change', renderListView);

  // Build week-view stylist legend dynamically
  const legendEl = document.getElementById('week-legend');
  if (legendEl) {
    legendEl.textContent = '日付ヘッダーをクリックでその日のタイムグリッドへ。セラピスト色：';
    STYLISTS.forEach((s, i) => {
      const dot = document.createElement('span');
      dot.className = `legend-dot stylist-${i}`;
      legendEl.appendChild(dot);
      legendEl.appendChild(document.createTextNode(' ' + s.name + '　'));
    });
  }

  initReservationModal();
  initDetailModal();
  renderDay();
}

document.addEventListener('DOMContentLoaded', initPage);
