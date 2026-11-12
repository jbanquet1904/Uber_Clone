// AI-assisted: see docs/AI_LOG.md #11, #12, #13
import { arrayUnion, doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/configFireBase';
import { calculateFare } from '../utils/calculateFare';
import { estimateRoute } from './routing';

export class TripUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TripUnavailableError';
  }
}

const tripRef = (tripId) => doc(db, 'trips', tripId);
const asPoint = (coords) => ({ lat: coords.latitude, lng: coords.longitude });

// Todas las transiciones usan el mismo molde: leer, comprobar el estado y escribir como una sola operación.
// La función que recibe runTransaction se puede ejecutar varias veces: adentro solo hay Firestore, nunca otras APIs
function transition(tripId, check, buildUpdate) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(tripRef(tripId));
    if (!snap.exists()) throw new TripUnavailableError('El viaje ya no existe.');
    const trip = snap.data();
    const problem = check(trip);
    if (problem) throw new TripUnavailableError(problem);
    const update = buildUpdate(trip);
    tx.update(tripRef(tripId), update);
    return { ...trip, ...update };
  });
}

// ---------- Fase 5: solicitud entrante ----------

// La misma condición para aceptar y rechazar: si compiten (o se vence en el mismo instante), gana exactamente una
export const isMyOffer = (trip, driverId) => trip.status === 'requested' && trip.offeredTo === driverId;

export const acceptTrip = (tripId, driverId) =>
  transition(
    tripId,
    (trip) => (isMyOffer(trip, driverId) ? null : 'Esta solicitud ya no está disponible.'),
    () => ({ status: 'accepted', driverId, acceptedAt: serverTimestamp() })
  );

// reason: 'declined' (tocó Rechazar) | 'timeout' (se venció) | 'stale' (llegó ya vencida)
export function declineTrip(tripId, driverId, reason) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(tripRef(tripId));
    if (!snap.exists() || !isMyOffer(snap.data(), driverId)) return false; // ya no es mía: no se toca
    // Sin backend no hay quién se la ofrezca a otro: queda rejected, y declinedBy deja listo al futuro despachador
    tx.update(tripRef(tripId), {
      status: 'rejected',
      offeredTo: null,
      declinedBy: arrayUnion(driverId),
      rejectReason: reason,
      rejectedAt: serverTimestamp(),
    });
    return true;
  });
}

// ---------- Fase 6: viaje en curso ----------

const PICKUP_STATUSES = ['accepted', 'driver_arriving'];
const mine = (trip, driverId) => trip.driverId === driverId;

// "Una vez al aceptarla": la ruta del conductor al punto de recogida. Se calcula fuera de la transacción
export async function startPickup(trip, driverId, driverCoords) {
  const route = await estimateRoute(asPoint(driverCoords), trip.origin);
  return transition(
    trip.id,
    (current) => (mine(current, driverId) && current.status === 'accepted' ? null : 'El viaje cambió de estado.'),
    () => ({
      status: 'driver_arriving',
      pickupRoute: route,
      pickupDistanceKm: route.distanceKm,
      pickupDurationMin: route.durationMin,
    })
  );
}

// "Pasajero a bordo": la ruta cambia hacia el destino, calculada desde donde está el conductor
export async function boardPassenger(trip, driverId, driverCoords) {
  const from = driverCoords ? asPoint(driverCoords) : trip.origin;
  const route = await estimateRoute(from, trip.destination);
  return transition(
    trip.id,
    (current) => (mine(current, driverId) && PICKUP_STATUSES.includes(current.status) ? null : 'El viaje ya no está esperando al pasajero.'),
    () => ({
      status: 'in_progress',
      tripRoute: route,
      startedAt: serverTimestamp(),
      startedAtMs: Date.now(), // la duración se mide con el reloj del mismo teléfono que la termina
    })
  );
}

// Cierre del viaje: tarifa final con la MISMA calculateFare de la estimación y el commissionRate guardado en el viaje.
// Distancia: la ruta real desde donde subió el pasajero. Duración: el tiempo que de verdad duró
export function buildCompletion(trip, nowMs) {
  const startedMs = trip.startedAtMs ?? trip.startedAt?.toMillis?.() ?? nowMs;
  const durationMin = Math.max(1, Math.ceil((nowMs - startedMs) / 60000));
  const distanceKm = trip.tripRoute?.distanceKm ?? trip.distanceKm;
  const { fare, commission, driverEarnings, commissionRate } = calculateFare({
    distanceKm,
    durationMin,
    category: trip.category,
    commissionRate: trip.commissionRate,
  });
  return {
    status: 'completed',
    // Lo que se cotizó queda guardado para compararlo con lo que se cobró
    estimate: { distanceKm: trip.distanceKm, durationMin: trip.durationMin, fare: trip.fare, driverEarnings: trip.driverEarnings },
    distanceKm,
    durationMin,
    fare,
    commission,
    commissionRate,
    tip: 0,
    driverEarnings,
    paymentStatus: 'pending',
  };
}

export const completeTrip = (tripId, driverId) =>
  transition(
    tripId,
    (trip) => (mine(trip, driverId) && trip.status === 'in_progress' ? null : 'El viaje ya no está en curso.'),
    (trip) => ({ ...buildCompletion(trip, Date.now()), completedAt: serverTimestamp() })
  );

// "Cancelado por cualquiera de las partes antes de in_progress"
export const cancelTripByDriver = (tripId, driverId) =>
  transition(
    tripId,
    (trip) => (mine(trip, driverId) && PICKUP_STATUSES.includes(trip.status) ? null : 'El viaje ya no se puede cancelar.'),
    () => ({ status: 'cancelled', cancelledBy: 'driver', cancelledAt: serverTimestamp() })
  );

// ---------- Fase 7: cobro ----------

const isUnpaid = (trip, driverId) => mine(trip, driverId) && trip.status === 'completed';

// La propina va completa al conductor y no cambia la comisión
export const applyTip = (trip, tip) => ({ tip, driverEarnings: trip.fare - trip.commission + tip });

// Una vez creado el cobro en Mercado Pago, el monto queda fijo: si cambiara, el pago no cuadraría con el viaje
export const setTip = (tripId, driverId, tip) =>
  transition(
    tripId,
    (trip) => (isUnpaid(trip, driverId) && !trip.paymentPreferenceId ? null : 'La propina ya no se puede cambiar.'),
    (trip) => applyTip(trip, tip)
  );

// Efectivo: el conductor marca el cobro como recibido. Si el pasajero iba a pagar con Mercado Pago y no pudo,
// también sirve para cambiar a efectivo (salvo que el pago ya esté aprobado)
export const markCashPaid = (tripId, driverId) =>
  transition(
    tripId,
    (trip) => (isUnpaid(trip, driverId) && trip.paymentStatus !== 'approved' ? null : 'Este viaje ya está pagado.'),
    () => ({ paymentMethod: 'cash', paymentStatus: 'cash', status: 'paid', paidAt: serverTimestamp() })
  );

// Calificación del conductor al pasajero, de 1 a 5
export const ratePassenger = (tripId, rating) => updateDoc(tripRef(tripId), { rating });
