/** M4–M8 Customer metrics */

function calcM4(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const newCount = done.filter((r) => r.visitType === '新規').length;
  const repeatCount = done.filter((r) => r.visitType === '再来').length;
  const total = done.length;
  return {
    newCount,
    repeatCount,
    total,
    newPct: total ? newCount / total : 0,
    repeatPct: total ? repeatCount / total : 0,
  };
}

function calcM5(reservations, todayStr = DEMO_TODAY) {
  const done = getCompleted(reservations);
  const visitsByCustomer = {};
  done.forEach((r) => {
    if (!visitsByCustomer[r.customerId]) visitsByCustomer[r.customerId] = [];
    visitsByCustomer[r.customerId].push(r.date);
  });
  Object.values(visitsByCustomer).forEach((dates) => dates.sort());

  const customerMap = getCustomerMap();
  const cohort = {};

  CUSTOMERS.forEach((c) => {
    const m = monthKey(c.firstVisitDate);
    if (!cohort[m]) cohort[m] = { newCustomers: [], retained: 0, pending: false };
    cohort[m].newCustomers.push(c.customerId);
  });

  const months = Object.keys(cohort).sort();
  const rates = [];
  const labels = [];
  const statuses = [];

  months.forEach((m) => {
    const ids = cohort[m].newCustomers;
    let retained = 0;
    ids.forEach((id) => {
      const first = customerMap[id].firstVisitDate;
      const deadline = addDaysStr(first, 90);
      const visits = visitsByCustomer[id] || [];
      const hasSecond = visits.some((d) => d > first && d <= deadline);
      if (hasSecond) retained++;
    });
    const [y, mo] = m.split('-').map(Number);
    const lastDayOfMonth = formatDateFromDate(new Date(y, mo, 0));
    const cohortEnd = addDaysStr(lastDayOfMonth, 90);
    const isPending = cohortEnd > todayStr;

    labels.push(m.replace('-', '/'));
    statuses.push(isPending);
    rates.push(isPending ? null : ids.length ? retained / ids.length : 0);
  });

  return { labels, rates, statuses };
}

function addDaysStr(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateFromDate(d);
}

function formatDateFromDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function calcM6(reservations) {
  const done = getCompleted(reservations).filter((r) => r.visitType === '再来');
  const byCustomer = {};
  done.forEach((r) => {
    if (!byCustomer[r.customerId]) byCustomer[r.customerId] = [];
    byCustomer[r.customerId].push(r.date);
  });

  const gaps = [];
  Object.values(byCustomer).forEach((dates) => {
    dates.sort();
    for (let i = 1; i < dates.length; i++) {
      gaps.push(daysBetween(dates[i - 1], dates[i]));
    }
  });

  if (gaps.length === 0) return { avg: null, count: 0, note: '集計中' };
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avg: Math.round(avg), count: gaps.length, note: null };
}

function calcM7(reservations) {
  const done = getCompleted(reservations);
  const visitCount = {};
  done.forEach((r) => {
    visitCount[r.customerId] = (visitCount[r.customerId] || 0) + 1;
  });
  const totalCustomers = Object.keys(visitCount).length;
  const repeaters = Object.values(visitCount).filter((n) => n >= 2).length;
  return totalCustomers ? repeaters / totalCustomers : 0;
}

function calcM8(reservations, thresholdDays = SETTINGS.churnThresholdDays, todayStr = DEMO_TODAY) {
  const done = getCompleted(reservations);
  const lastVisit = {};
  const lastStylist = {};
  done.forEach((r) => {
    const cid = r.customerId;
    if (!lastVisit[cid] || r.date > lastVisit[cid]) {
      lastVisit[cid] = r.date;
      lastStylist[cid] = r.stylistId;
    }
  });

  const stylistMap = getStylistMap();
  const customerMap = getCustomerMap();
  const alerts = [];

  CUSTOMERS.forEach((c) => {
    const last = lastVisit[c.customerId];
    if (!last) return;
    const elapsed = daysBetween(last, todayStr);
    if (elapsed >= thresholdDays) {
      alerts.push({
        name: c.name,
        lastVisit: last,
        elapsed,
        stylist: stylistMap[lastStylist[c.customerId]]?.name || '—',
      });
    }
  });

  alerts.sort((a, b) => b.elapsed - a.elapsed);
  return alerts;
}
