// AI-assisted: see docs/AI_LOG.md #10
import { useCallback, useEffect, useRef, useState } from 'react';
import { markUnavailable, publishLocation } from '../services/driverLocation';
import { distanceMeters } from '../utils/geo';

const MIN_INTERVAL_MS = 10_000; // nunca más de una escritura cada 10 s…
const MIN_DISTANCE_M = 30; // …y solo si se movió al menos 30 m
const HEARTBEAT_MS = 60_000; // quieto: una señal de vida por minuto

// El cupo gratis de Firestore son 20.000 escrituras al día: no se escribe cada vez que el GPS reporta
export const shouldSend = (last, coords, now) =>
  !last ||
  now - last.at >= HEARTBEAT_MS ||
  (now - last.at >= MIN_INTERVAL_MS && distanceMeters(last, coords) >= MIN_DISTANCE_M);

export function useLocationPublisher({ driverId, online }) {
  const [publishError, setPublishError] = useState(null);
  const latestRef = useRef(null); // última posición del GPS
  const lastSentRef = useRef(null); // última posición escrita en Firestore

  const trySend = useCallback(() => {
    const coords = latestRef.current;
    const now = Date.now();
    if (!driverId || !coords || !shouldSend(lastSentRef.current, coords, now)) return;
    lastSentRef.current = { at: now, latitude: coords.latitude, longitude: coords.longitude };
    // Sin internet la escritura queda en cola y no falla; si falla es el servidor (por ejemplo, reglas vencidas)
    publishLocation(driverId, coords)
      .then(() => setPublishError(null))
      .catch((e) => {
        console.warn('No se pudo publicar la ubicación:', e);
        setPublishError('No se pudo publicar tu ubicación. No te van a llegar solicitudes.');
      });
  }, [driverId]);

  useEffect(() => {
    if (!online || !driverId) return undefined;
    lastSentRef.current = null; // la primera posición después de conectarse se publica de inmediato
    // Sin posición vieja: la primera escritura espera el primer reporte del GPS
    const timer = setInterval(trySend, MIN_INTERVAL_MS); // quieto, el GPS no reporta: el intervalo da el latido

    return () => {
      clearInterval(timer);
      latestRef.current = null; // al volver no se publica una posición de hace minutos
      setPublishError(null);
      // Firestore aplica en orden las escrituras de un cliente: este false queda de último
      markUnavailable(driverId).catch((e) => console.warn('No se pudo marcar No disponible:', e));
    };
  }, [online, driverId, trySend]);

  const handleLocation = useCallback(
    (location) => {
      latestRef.current = location.coords;
      if (online) trySend();
    },
    [online, trySend]
  );

  return { handleLocation, publishError };
}
