// AI-assisted: see docs/AI_LOG.md #11, #12
import { distanceMeters } from '../utils/geo';

// Directions y Distance Matrix quedaron como "Legacy" en marzo de 2025: su reemplazo es la Routes API
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
// Servidor de demostración de OSRM (OpenStreetMap): sin key, pensado para pruebas, máximo 1 petición por segundo
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const round1 = (n) => Math.round(n * 10) / 10;
const toResult = (meters, seconds, polyline, source) => ({
  distanceKm: round1(meters / 1000),
  durationMin: Math.max(1, Math.ceil(seconds / 60)),
  polyline: polyline ?? null,
  source,
});

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? `HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// from / to: { lat, lng }
async function googleRoute(from, to, timeoutMs) {
  const point = ({ lat, lng }) => ({ location: { latLng: { latitude: lat, longitude: lng } } });
  const data = await fetchJson(
    GOOGLE_ROUTES_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        // Solo los campos que se usan: el field mask es obligatorio y además define el costo
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      // Sin tráfico (TRAFFIC_UNAWARE) la petición queda en la categoría Essentials, la de más cupo gratis
      body: JSON.stringify({ origin: point(from), destination: point(to), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
    },
    timeoutMs
  );
  const route = data.routes?.[0];
  if (!route) throw new Error('Google no encontró ruta');
  // duration llega como texto: "165s"
  return toResult(route.distanceMeters ?? 0, parseInt(route.duration ?? '0', 10), route.polyline?.encodedPolyline, 'google');
}

async function osrmRoute(from, to, timeoutMs) {
  // OSRM pide LONGITUD primero: al revés devuelve rutas en el mar o NoRoute
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
  const data = await fetchJson(url, {}, timeoutMs);
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(data.message ?? 'OSRM no encontró ruta');
  const { distance, duration, geometry } = data.routes[0]; // metros, segundos y polyline
  return toResult(distance, duration, geometry, 'osrm');
}

// Sin ruta real: línea recta × 1,3 (las calles no son rectas) a 25 km/h de promedio urbano
export function roughEstimate(from, to) {
  const straightM = distanceMeters({ latitude: from.lat, longitude: from.lng }, { latitude: to.lat, longitude: to.lng });
  const km = (straightM / 1000) * 1.3;
  return { distanceKm: round1(km), durationMin: Math.max(1, Math.ceil((km / 25) * 60)), polyline: null, source: 'estimate' };
}

// Se llama una vez por tramo (al crear, al aceptar y al recoger), nunca en cada actualización de ubicación.
// Nunca falla: si Google y OSRM no responden, devuelve la estimación. source dice de dónde salió
export async function estimateRoute(from, to, { timeoutMs = 6000 } = {}) {
  const providers = GOOGLE_KEY ? [googleRoute, osrmRoute] : [osrmRoute];
  for (const provider of providers) {
    try {
      return await provider(from, to, timeoutMs);
    } catch (error) {
      console.warn(`Ruta: ${provider.name} no respondió (${error.message}), se prueba la siguiente opción.`);
    }
  }
  return roughEstimate(from, to);
}
