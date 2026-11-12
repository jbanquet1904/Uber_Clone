// AI-assisted: see docs/AI_LOG.md #14
// Firestore devuelve Timestamp; aquí todo se convierte a Date (o null si no hay fecha)
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// La semana empieza el lunes, como en el calendario colombiano
export function startOfWeek(date) {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // lunes = 0 … domingo = 6
  day.setDate(day.getDate() - offset);
  return day;
}

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

// Rango [from, to) de cada filtro. "to" es exclusivo: el día siguiente a las 00:00
export function periodRange(period, today = new Date(), custom = {}) {
  const tomorrow = addDays(startOfDay(today), 1);
  if (period === 'today') return { from: startOfDay(today), to: tomorrow };
  if (period === 'week') return { from: startOfWeek(today), to: tomorrow };
  if (period === 'month') return { from: startOfMonth(today), to: tomorrow };
  // 'range': incluye completo el día final que eligió el conductor
  const from = startOfDay(custom.from ?? today);
  const to = addDays(startOfDay(custom.to ?? today), 1);
  return from < to ? { from, to } : { from: startOfDay(custom.to), to: addDays(startOfDay(custom.from), 1) };
}

const pad = (n) => String(n).padStart(2, '0');

// 05/11/2026 · 14:30, sin depender del idioma del teléfono
export const formatDate = (date) => (date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : '—');
export const formatDateTime = (date) => (date ? `${formatDate(date)} · ${pad(date.getHours())}:${pad(date.getMinutes())}` : '—');
