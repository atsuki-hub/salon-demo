/** M1–M3 Sales metrics */

function totalRevenue(r) {
  return r.techSales + r.retailSales;
}

function calcM1(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const { gran, label: granularityLabel } = pickGranularity(start, end);

  const buckets = {};
  done.forEach((r) => {
    const k = bucketKey(r.date, gran);
    buckets[k] = (buckets[k] || 0) + totalRevenue(r);
  });

  const keys = generateBucketKeys(start, end, gran);
  const labels = keys.map((k) => formatBucketLabel(k, gran));
  const values = keys.map((k) => buckets[k] || 0);
  // 曜日情報(週末ハイライト用)
  const dayOfWeek = gran === 'day' ? keys.map((k) => parseDate(k).getDay()) : null;

  // 当月／前月（MoMカード用は常に月単位）
  const thisStart = '2026-05-01';
  const thisEnd = '2026-05-31';
  const lastStart = '2026-04-01';
  const lastEnd = '2026-04-30';

  const allDone = getCompleted(reservations);
  const thisTotal = filterByPeriod(allDone, thisStart, thisEnd).reduce((s, r) => s + totalRevenue(r), 0);
  const lastTotal = filterByPeriod(allDone, lastStart, lastEnd).reduce((s, r) => s + totalRevenue(r), 0);
  const momPct = lastTotal > 0 ? (thisTotal - lastTotal) / lastTotal : null;

  return { labels, values, dayOfWeek, granularity: gran, granularityLabel, thisTotal, lastTotal, momPct };
}

function calcM2(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const count = done.length;
  if (count === 0) return { tech: 0, total: 0, count: 0 };
  const techSum = done.reduce((s, r) => s + r.techSales, 0);
  const totalSum = done.reduce((s, r) => s + totalRevenue(r), 0);
  return { tech: techSum / count, total: totalSum / count, count };
}

function calcM3(reservations, start, end) {
  const done = filterByPeriod(getCompleted(reservations), start, end);
  const techSum = done.reduce((s, r) => s + r.techSales, 0);
  const retailSum = done.reduce((s, r) => s + r.retailSales, 0);
  const total = techSum + retailSum;
  return total > 0 ? retailSum / total : 0;
}
