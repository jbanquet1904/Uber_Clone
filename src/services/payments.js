// AI-assisted: see docs/AI_LOG.md #13
import Constants from 'expo-constants';

// Cliente del backend de pagos. El access_token de Mercado Pago vive SOLO en el backend:
// la app manda el tripId y el backend lee el monto del viaje en Firestore (la app nunca dice cuánto cobrar)
// Si EXPO_PUBLIC_API_URL está vacío, en desarrollo se usa el mismo servidor de Expo que sirve la app:
// metro.config.js reenvía /pagos/... al backend del computador. Funciona en la red local
// (hostUri = "192.168.1.20:8081") y en modo túnel (hostUri = "abc-anonymous-8081.exp.direct", con https)
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const hostUri = (Constants.expoConfig?.hostUri ?? '').replace(/^\w+:\/\//, '').replace(/\/+$/, '');
  if (!hostUri) return null;
  const isLocal = /^(\d{1,3}(\.\d{1,3}){3}|localhost)(:\d+)?$/.test(hostUri);
  return `${isLocal ? 'http' : 'https'}://${hostUri}/pagos`;
}

const API_URL = resolveApiUrl();

export class PaymentServerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentServerError';
  }
}

async function post(path, body, timeoutMs = 15000) {
  if (!API_URL) throw new PaymentServerError('No se encontró el servidor de pagos: pon su URL en EXPO_PUBLIC_API_URL (.env de la app).');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new PaymentServerError(
      'No se pudo conectar con el servidor de pagos. Revisa que el backend esté encendido y que el teléfono esté en la misma red Wi-Fi.'
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new PaymentServerError(data.error ?? `El servidor de pagos respondió ${response.status}.`);
  return data;
}

// Crea la preferencia de Checkout Pro y devuelve el enlace donde paga el pasajero
export const createCheckout = (tripId) => post('/payments/checkout', { tripId });

// Le pide al backend que consulte en Mercado Pago el pago de este viaje y actualice Firestore
export const syncPayment = (tripId) => post('/payments/sync', { tripId });
