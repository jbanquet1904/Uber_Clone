// AI-assisted: see docs/AI_LOG.md #14
import { startOfDay, startOfMonth, startOfWeek, toDate } from './dates';

const EMPTY = { count: 0, billed: 0, commissions: 0, tips: 0, net: 0, average: 0 };

// Totales de una lista de viajes pagados. Todo en pesos enteros
export function summarize(trips) {
  if (!trips.length) return EMPTY;
  const totals = trips.reduce(
    (acc, trip) => ({
      count: acc.count + 1,
      billed: acc.billed + (trip.fare ?? 0),
      commissions: acc.commissions + (trip.commission ?? 0),
      tips: acc.tips + (trip.tip ?? 0),
      net: acc.net + (trip.driverEarnings ?? 0),
    }),
    { count: 0, billed: 0, commissions: 0, tips: 0, net: 0 }
  );
  return { ...totals, average: Math.round(totals.net / totals.count) };
}

// Saldo: lo que la plataforma le debe al conductor.
// Pasarela: la plataforma recibió el dinero y le debe la ganancia neta.
// Efectivo: el conductor recibió todo y le debe la comisión a la plataforma (el saldo puede quedar negativo)
export function driverBalance(trips) {
  return trips.reduce((balance, trip) => {
    if (trip.paymentMethod === 'cash') return balance - (trip.commission ?? 0);
    return balance + (trip.driverEarnings ?? 0);
  }, 0);
}

// Hoy, semana y mes a partir de la fecha de cierre (completedAt) de cada viaje
export function earningsByPeriod(trips, today = new Date()) {
  const limits = { today: startOfDay(today), week: startOfWeek(today), month: startOfMonth(today) };
  const result = {};
  Object.entries(limits).forEach(([period, from]) => {
    result[period] = summarize(trips.filter((trip) => (toDate(trip.completedAt) ?? new Date(0)) >= from));
  });
  return result;
}
