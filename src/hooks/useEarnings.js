// AI-assisted: see docs/AI_LOG.md #14
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../config/configFireBase';
import { driverBalance, earningsByPeriod } from '../utils/earnings';

// Viajes pagados del conductor, en tiempo real: al confirmarse un pago, las ganancias se actualizan solas.
// Dos igualdades: no necesita índice compuesto. Para un proyecto de clase se traen todos los pagados;
// con miles de viajes convendría guardar totales por día en el backend
export function useEarnings(driverId) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) return undefined;
    const q = query(collection(db, 'trips'), where('driverId', '==', driverId), where('status', '==', 'paid'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('No se pudieron cargar las ganancias:', err);
        setError(err.code ?? 'unknown');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [driverId]);

  // useMemo: los totales solo se recalculan cuando cambia la lista de viajes, no en cada render
  const periods = useMemo(() => earningsByPeriod(trips), [trips]);
  const balance = useMemo(() => driverBalance(trips), [trips]);

  return { periods, balance, loading, error };
}
