// AI-assisted: see docs/AI_LOG.md #11
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/configFireBase';
import { PRICING } from '../config/pricing';
import { calculateFare } from '../utils/calculateFare';
import { randomPointNear } from '../utils/geo';
import { estimateRoute } from './routing';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Coordenadas → dirección legible con el geocodificador del sistema (en iPhone, el de Apple), sin API key
async function describe({ lat, lng }) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const street = [place?.street, place?.streetNumber].filter(Boolean).join(' ');
    return [street || place?.name, place?.city].filter(Boolean).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Hace el papel de la app del pasajero. Solo se usa en desarrollo: el botón existe solo con __DEV__
export async function createSimulatedTrip(driverId, driverCoords) {
  const here = { lat: driverCoords.latitude, lng: driverCoords.longitude };
  const originPoint = randomPointNear(here, 300, 1500);
  const destinationPoint = randomPointNear(originPoint, 2000, 8000);

  const [originAddress, destinationAddress, route] = await Promise.all([
    describe(originPoint),
    describe(destinationPoint),
    estimateRoute(originPoint, destinationPoint), // "una vez al crear la solicitud"
  ]);

  // La tarifa se calcula una sola vez, al crear: el conductor ve exactamente lo que se le cotizó al pasajero
  const category = pick(Object.keys(PRICING.multipliers));
  const { fare, commission, driverEarnings, commissionRate } = calculateFare({
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    category,
  });

  const ref = await addDoc(collection(db, 'trips'), {
    passengerId: 'sim-passenger',
    driverId: null,
    offeredTo: driverId, // un conductor a la vez
    declinedBy: [],
    origin: { ...originPoint, address: originAddress },
    destination: { ...destinationPoint, address: destinationAddress },
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    routeSource: route.source,
    category,
    fare,
    commission,
    tip: 0,
    driverEarnings,
    commissionRate,
    paymentMethod: pick(['mercadopago', 'cash']),
    paymentStatus: 'pending',
    paymentId: null,
    status: 'requested',
    rating: null,
    simulated: true,
    offeredAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}
