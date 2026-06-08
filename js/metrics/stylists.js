/** M9–M12 Stylist metrics */

function calcM9(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const total = done.length;
  const nominated = done.filter((r) => r.nominated === 1).length;
  const salonRate = total ? nominated / total : 0;

  const byStylist = {};
  STYLISTS.forEach((s) => {
    byStylist[s.stylistId] = { total: 0, nominated: 0, name: s.name };
  });
  done.forEach((r) => {
    const b = byStylist[r.stylistId];
    b.total++;
    if (r.nominated === 1) b.nominated++;
  });

  const perStylist = STYLISTS.map((s) => {
    const b = byStylist[s.stylistId];
    return {
      name: s.name,
      rate: b.total ? b.nominated / b.total : 0,
      total: b.total,
    };
  });

  return { salonRate, perStylist };
}

function calcM10(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const sales = {};
  STYLISTS.forEach((s) => (sales[s.stylistId] = 0));
  done.forEach((r) => {
    sales[r.stylistId] += r.techSales + r.retailSales;
  });
  return STYLISTS.map((s) => ({ name: s.name, sales: sales[s.stylistId] }))
    .sort((a, b) => b.sales - a.sales);
}

function calcM11(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const sales = {};
  const counts = {};
  STYLISTS.forEach((s) => {
    sales[s.stylistId] = 0;
    counts[s.stylistId] = 0;
  });
  done.forEach((r) => {
    sales[r.stylistId] += r.techSales + r.retailSales;
    counts[r.stylistId]++;
  });
  return STYLISTS.map((s) => ({
    name: s.name,
    avg: counts[s.stylistId] ? sales[s.stylistId] / counts[s.stylistId] : 0,
    count: counts[s.stylistId],
  })).sort((a, b) => b.avg - a.avg);
}

function calcM12(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const treatmentMinutes = done.reduce((s, r) => s + r.duration, 0);

  const workDays = countWorkDays(start, end);
  const bizMin = businessMinutesPerDay();
  const seatCapacity = SETTINGS.seats * bizMin * workDays;
  const seatRate = seatCapacity > 0 ? treatmentMinutes / seatCapacity : 0;

  const stylistMap = Object.fromEntries(STYLISTS.map((s) => [s.stylistId, s]));
  const minutesByStylist = {};
  const workMinByStylist = {};
  STYLISTS.forEach((s) => {
    minutesByStylist[s.stylistId] = 0;
    workMinByStylist[s.stylistId] = s.workHoursPerDay * 60 * workDays;
  });
  done.forEach((r) => {
    minutesByStylist[r.stylistId] += r.duration;
  });

  const perStylist = STYLISTS.map((s) => ({
    name: s.name,
    rate: workMinByStylist[s.stylistId]
      ? minutesByStylist[s.stylistId] / workMinByStylist[s.stylistId]
      : 0,
    minutes: minutesByStylist[s.stylistId],
  })).sort((a, b) => b.rate - a.rate);

  return { seatRate, treatmentMinutes, seatCapacity, perStylist };
}

function countWorkDays(start, end) {
  if (!start || !end) return 0;
  let count = 0;
  for (let d = parseDate(start); d <= parseDate(end); d.setDate(d.getDate() + 1)) {
    if (!SETTINGS.closedDays.includes(d.getDay())) count++;
  }
  return count;
}
