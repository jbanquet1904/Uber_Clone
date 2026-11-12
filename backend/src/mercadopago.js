// AI-assisted: see docs/AI_LOG.md #13
// Cliente mínimo de la API REST de Mercado Pago. Solo corre en el backend: el access_token nunca llega a la app
const API = 'https://api.mercadopago.com';

export class MercadoPagoError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'MercadoPagoError';
    this.status = status;
  }
}

export function createMercadoPagoClient({ accessToken, fetchImpl = fetch }) {
  if (!accessToken) throw new Error('Falta MP_ACCESS_TOKEN en backend/.env');

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new MercadoPagoError(data.message ?? `Mercado Pago respondió ${response.status}`, response.status);
    return data;
  }

  return {
    // Checkout Pro: la preferencia describe qué se cobra; init_point es la página donde paga el pasajero
    createPreference: (preference) => request('/checkout/preferences', { method: 'POST', body: preference }),
    // Pagos de un viaje: external_reference es el tripId que se puso en la preferencia
    searchPayments: (externalReference) =>
      request(`/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`),
    getPayment: (paymentId) => request(`/v1/payments/${encodeURIComponent(paymentId)}`),
  };
}
