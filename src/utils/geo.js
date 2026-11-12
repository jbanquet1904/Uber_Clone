// AI-assisted: see docs/AI_LOG.md #10, #11, #12
// Distancia aproximada en metros entre dos puntos (fórmula de Haversine)
export function distanceMeters(a, b) {
  const R = 6371000; // radio de la Tierra en metros
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Punto aleatorio entre minM y maxM metros de center ({ lat, lng }), en cualquier dirección
export function randomPointNear(center, minM, maxM) {
  const d = minM + Math.random() * (maxM - minM);
  const bearing = Math.random() * 2 * Math.PI;
  const dLat = (d * Math.cos(bearing)) / 111320; // metros por grado de latitud
  const dLng = (d * Math.sin(bearing)) / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

// { lat, lng } (como se guarda en Firestore) → { latitude, longitude } (como lo pide react-native-maps)
export const toLatLng = (point) => ({ latitude: point.lat, longitude: point.lng });

// Decodifica una "encoded polyline" (formato de Google, precisión 5; OSRM usa el mismo con geometries=polyline).
// Cada coordenada viene como la diferencia con la anterior, en bloques de 5 bits
export function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
