// AI-assisted: see docs/AI_LOG.md #2
// Pesos enteros con punto de miles: 19200 → "$19.200" (sin depender de Intl en el celular)
export const formatCOP = (value) => `$${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
