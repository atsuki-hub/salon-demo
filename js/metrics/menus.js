/** M13–M14 Menu metrics */

function calcM13(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const menuMap = getMenuMap();
  const byCategory = {};

  done.forEach((r) => {
    const cat = menuMap[r.mainMenuId]?.category || 'その他';
    byCategory[cat] = (byCategory[cat] || 0) + r.techSales;
  });

  const labels = Object.keys(byCategory);
  const values = labels.map((l) => byCategory[l]);
  const total = values.reduce((a, b) => a + b, 0);
  return { labels, values, total };
}

function calcM14(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const menuMap = getMenuMap();
  const byMenu = {};

  done.forEach((r) => {
    const menu = menuMap[r.mainMenuId];
    const name = menu?.name || r.mainMenuId;
    if (!byMenu[name]) byMenu[name] = { sales: 0, minutes: 0 };
    byMenu[name].sales += r.techSales;
    byMenu[name].minutes += r.duration;
  });

  return Object.entries(byMenu)
    .map(([name, v]) => ({
      name,
      perHour: v.minutes > 0 ? (v.sales / v.minutes) * 60 : 0,
      sales: v.sales,
      minutes: v.minutes,
    }))
    .sort((a, b) => b.perHour - a.perHour);
}
