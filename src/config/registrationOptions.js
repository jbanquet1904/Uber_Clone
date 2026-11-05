// AI-assisted: see docs/AI_LOG.md #3, #5
import { PRICING } from './pricing';

export const GENDERS = [
  { label: 'Femenino', value: 'female' },
  { label: 'Masculino', value: 'male' },
  { label: 'No binario', value: 'non_binary' },
  { label: 'Prefiero no decirlo', value: 'unspecified' },
];

// Mismo selector de idioma que la app del pasajero
export const LANGUAGES = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
];

export const MIN_DRIVER_AGE = 18;
export const MAX_NAME_LENGTH = 50;

const CATEGORY_LABELS = { economy: 'Económico', xl: 'XL', premium: 'Premium' };

// Salen de PRICING.multipliers: si se agrega una categoría en pricing.js, aparece sola en la lista
export const CATEGORIES = Object.keys(PRICING.multipliers).map((value) => ({
  value,
  label: CATEGORY_LABELS[value] ?? value,
}));

export const MIN_VEHICLE_YEAR = 2001;
export const MAX_BRAND_MODEL_LENGTH = 30;
export const MAX_CAPACITY = 8;
// Pasajeros mínimos sin contar al conductor
export const MIN_CAPACITY_BY_CATEGORY = { economy: 1, xl: 6, premium: 1 };

export const VEHICLE_COLORS = [
  { label: 'Blanco', value: 'white' },
  { label: 'Negro', value: 'black' },
  { label: 'Gris', value: 'gray' },
  { label: 'Plata', value: 'silver' },
  { label: 'Rojo', value: 'red' },
  { label: 'Azul', value: 'blue' },
  { label: 'Verde', value: 'green' },
  { label: 'Beige', value: 'beige' },
  { label: 'Café', value: 'brown' },
  { label: 'Vino tinto', value: 'burgundy' },
  { label: 'Amarillo', value: 'yellow' },
  { label: 'Naranja', value: 'orange' },
  { label: 'Otro', value: 'other' },
];
