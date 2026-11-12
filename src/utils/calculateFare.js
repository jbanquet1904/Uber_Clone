// AI-assisted: see docs/AI_LOG.md #1, #12
import { PRICING } from '../config/pricing';

const roundTo100 = (value) => Math.round(value / 100) * 100;

// Una sola función para la estimación y para el cierre del viaje.
// commissionRate: al cerrar se pasa el que quedó guardado en el viaje, así un cambio en pricing.js no altera viajes viejos
export function calculateFare({ distanceKm, durationMin, category, tip = 0, commissionRate = PRICING.commissionRate }) {
  const multiplier = PRICING.multipliers[category];
  if (!multiplier) throw new Error(`Categoría inválida: ${category}`);

  const subtotal =
    PRICING.baseFare + distanceKm * PRICING.perKm + durationMin * PRICING.perMinute;

  const fare = roundTo100(Math.max(PRICING.minimumFare, subtotal * multiplier));
  const commission = Math.round(fare * commissionRate);
  // La propina va completa al conductor: no paga comisión
  const driverEarnings = fare - commission + tip;

  return { fare, commission, driverEarnings, commissionRate };
}
