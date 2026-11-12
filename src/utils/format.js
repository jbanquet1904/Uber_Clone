// AI-assisted: see docs/AI_LOG.md #11
// 3.456 → "3,5" (coma decimal, como se escribe en Colombia)
export const formatKm = (km) => (km == null ? '—' : (Math.round(km * 10) / 10).toFixed(1).replace('.', ','));

// 0.2 → "20 %"
export const formatPercent = (rate) => `${Math.round((rate ?? 0) * 100)} %`;
