// AI-assisted: see docs/AI_LOG.md #1
import { PRICING } from '../config/pricing';

const roundTo100 = (value) => Math.round(value / 100) * 100;

export function calculateFare({ distanceKm, durationMin, category, tip = 0 }) {
  const multiplier = PRICING.multipliers[category];
  if (!multiplier) throw new Error(`Categoría inválida: ${category}`);

  const subtotal =
    PRICING.baseFare + distanceKm * PRICING.perKm + durationMin * PRICING.perMinute;

  const fare = roundTo100(Math.max(PRICING.minimumFare, subtotal * multiplier));
  const commission = Math.round(fare * PRICING.commissionRate);
  const driverEarnings = fare - commission + tip;

  return { fare, commission, driverEarnings, commissionRate: PRICING.commissionRate };
}
