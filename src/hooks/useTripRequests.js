// AI-assisted: see docs/AI_LOG.md #11
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../config/configFireBase';
import { declineTrip } from '../services/trips';

export const OFFER_SECONDS = 15;
const STALE_MS = 60_000; // margen amplio por si el reloj del teléfono no cuadra con el del servidor

// Escucha las solicitudes ofrecidas a este conductor. Solo mientras está realmente Disponible (enabled):
// un conductor No disponible no gasta lecturas escuchando ofertas que no puede tomar
export function useTripRequests({ driverId, enabled }) {
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());
  // tripId → hora (del teléfono) en que llegó. El temporizador cuenta desde aquí, no desde la hora del servidor
  const receivedAtRef = useRef(new Map());

  useEffect(() => {
    if (!enabled || !driverId) return undefined;

    // Solo igualdades: no necesita índice compuesto. El orden se hace en el teléfono
    const q = query(
      collection(db, 'trips'),
      where('offeredTo', '==', driverId),
      where('status', '==', 'requested'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const fresh = [];

        snap.docs.forEach((d) => {
          const trip = { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) };
          const offeredAtMs = trip.offeredAt?.toMillis?.() ?? now;

          // Una oferta que quedó colgada (la app se cerró con ella en pantalla): solo con dato del servidor se descarta
          if (!snap.metadata.fromCache && now - offeredAtMs > STALE_MS) {
            declineTrip(trip.id, driverId, 'stale').catch(() => {});
            return;
          }
          if (!receivedAtRef.current.has(trip.id)) receivedAtRef.current.set(trip.id, now);
          fresh.push({ ...trip, offeredAtMs, receivedAt: receivedAtRef.current.get(trip.id) });
        });

        fresh.sort((a, b) => a.offeredAtMs - b.offeredAtMs); // la más antigua primero
        setOffers(fresh);
        setError(null);
      },
      (err) => {
        console.warn('Error escuchando solicitudes:', err);
        setError(err.code === 'permission-denied' ? 'permission' : 'connection');
      }
    );

    return unsubscribe; // limpieza: deja de escuchar al quedar No disponible
  }, [driverId, enabled]);

  // Se oculta de una vez, aunque la escritura todavía no llegue al servidor
  const dismiss = useCallback((tripId) => {
    setDismissed((prev) => new Set(prev).add(tripId));
  }, []);

  // Una solicitud a la vez, la más antigua: si llega otra mientras decide, la tarjeta no cambia en sus narices
  const request = enabled ? offers.find((trip) => !dismissed.has(trip.id)) ?? null : null;
  const deadline = request ? request.receivedAt + OFFER_SECONDS * 1000 : null;

  return { request, deadline, error: enabled ? error : null, dismiss };
}
