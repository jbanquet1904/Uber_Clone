// AI-assisted: see docs/AI_LOG.md #14
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../config/configFireBase';

export const PAGE_SIZE = 20;

// Historial paginado, del más reciente al más antiguo.
// driverId + rango de completedAt + orderBy necesita un índice compuesto (está en firestore.indexes.json).
// Si el índice aún no existe, se usa fetchWithoutIndex (abajo) y el historial funciona igual.
// Solo entran viajes terminados: los cancelados o rechazados tienen completedAt en null y el rango los deja fuera
async function fetchPage(driverId, { fromMs, toMs, paymentMethod }, cursor) {
  const q = query(
    collection(db, 'trips'),
    where('driverId', '==', driverId),
    ...(paymentMethod ? [where('paymentMethod', '==', paymentMethod)] : []),
    where('completedAt', '>=', Timestamp.fromMillis(fromMs)),
    where('completedAt', '<', Timestamp.fromMillis(toMs)),
    orderBy('completedAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE)
  );
  try {
    const snap = await getDocs(q);
    return {
      trips: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      cursor: snap.docs[snap.docs.length - 1] ?? cursor,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    // failed-precondition = el índice compuesto todavía no existe (o se está construyendo).
    // En vez de mostrar un error, se usa una consulta que no necesita índice y se filtra en el teléfono
    if (err?.code !== 'failed-precondition') throw err;
    console.warn('Falta el índice compuesto de trips; el historial se filtra en el teléfono:', err.message);
    return fetchWithoutIndex(driverId, { fromMs, toMs, paymentMethod });
  }
}

// Plan B: solo driverId == X (Firestore indexa cada campo solo, así que no pide índice compuesto).
// Rango, método de pago y orden se aplican aquí. Trae todo de una vez: sin paginación
async function fetchWithoutIndex(driverId, { fromMs, toMs, paymentMethod }) {
  const snap = await getDocs(query(collection(db, 'trips'), where('driverId', '==', driverId)));
  const trips = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((trip) => {
      const completedMs = trip.completedAt?.toMillis?.();
      if (completedMs == null || completedMs < fromMs || completedMs >= toMs) return false;
      return !paymentMethod || trip.paymentMethod === paymentMethod;
    })
    .sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());
  return { trips, cursor: null, hasMore: false };
}


export function useTripHistory(driverId, { from, to, paymentMethod }) {
  const [reloadToken, setReloadToken] = useState(0);
  // El resultado recuerda para qué filtros se pidió: si no coincide con los actuales, está cargando
  const [result, setResult] = useState({ key: null, trips: [], hasMore: false, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null); // último documento cargado, para pedir la siguiente página

  const filters = { fromMs: from.getTime(), toMs: to.getTime(), paymentMethod };
  const key = `${driverId}|${filters.fromMs}|${filters.toMs}|${paymentMethod ?? 'all'}|${reloadToken}`;
  const { fromMs, toMs } = filters;

  useEffect(() => {
    if (!driverId) return undefined;
    let cancelled = false; // si cambian los filtros mientras carga, la respuesta vieja se ignora
    fetchPage(driverId, { fromMs, toMs, paymentMethod }, null)
      .then((page) => {
        if (cancelled) return;
        cursorRef.current = page.cursor;
        setResult({ key, trips: page.trips, hasMore: page.hasMore, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('No se pudo cargar el historial:', err.message);
        setResult({ key, trips: [], hasMore: false, error: 'connection' });
      });
    return () => {
      cancelled = true;
    };
  }, [driverId, fromMs, toMs, paymentMethod, key]);

  const loading = result.key !== key;

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !result.hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(driverId, { fromMs, toMs, paymentMethod }, cursorRef.current);
      cursorRef.current = page.cursor;
      setResult((prev) => (prev.key === key ? { ...prev, trips: [...prev.trips, ...page.trips], hasMore: page.hasMore } : prev));
    } catch (err) {
      console.warn('No se pudo cargar más historial:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, result.hasMore, driverId, fromMs, toMs, paymentMethod, key]);

  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  return {
    trips: loading ? [] : result.trips,
    loading,
    loadingMore,
    error: loading ? null : result.error,
    hasMore: result.hasMore,
    loadMore,
    refresh,
  };
}
