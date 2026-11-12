// AI-assisted: see docs/AI_LOG.md #2, #9, #11, #15
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../config/configFireBase';
import { deleteRegistration } from '../services/driverRegistration';

const SESSION_KEY = '@uberclone/driver-session';
// Solo el id del viaje activo: el estado real siempre lo manda Firestore
const TRIP_KEY = '@uberclone/active-trip';
// Al llegar a uno de estos estados, el viaje deja de ser del conductor. "paid" no está: el resumen necesita ver el pago
const ENDED_TRIP_STATUSES = ['cancelled', 'rejected'];
const DriverContext = createContext(null);

async function readSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return typeof session?.id === 'string' && session.id ? session : null;
  } catch (error) {
    // JSON dañado o error del disco: se descarta y se empieza sin sesión
    console.warn('Sesión guardada ilegible, se descarta:', error);
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    return null;
  }
}

// Solo id y status, armado campo por campo: nunca datos sensibles en el teléfono
const writeSession = ({ id, status }) => AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ id, status }));

export function DriverProvider({ children }) {
  const [driver, setDriver] = useState(null);
  // El documento completo del conductor, solo en memoria (para Perfil). Sale del mismo listener: no cuesta lecturas extra
  const [profile, setProfile] = useState(null);
  const [restoring, setRestoring] = useState(true); // "todavía no sé": evita que se vea el registro un instante
  const [connection, setConnection] = useState('online'); // 'online' | 'offline' | 'error'
  const [sessionNotice, setSessionNotice] = useState(null);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  // id de la sesión vigente, sin esperar un render: un snapshot que llega mientras se cierra la sesión no la vuelve a guardar
  const sessionIdRef = useRef(null);

  // 1) Restaurar la sesión y el viaje activo guardados al abrir la app
  useEffect(() => {
    let cancelled = false;
    Promise.all([readSession(), AsyncStorage.getItem(TRIP_KEY).catch(() => null)]).then(([session, tripId]) => {
      if (cancelled) return;
      sessionIdRef.current = session?.id ?? null;
      setDriver(session);
      setActiveTripId(session ? tripId : null);
      setRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Primero el disco y después la pantalla: setDriver desmonta el registro y si el disco fallara después nadie se enteraría
  const startSession = useCallback(async ({ id, status }) => {
    await writeSession({ id, status });
    sessionIdRef.current = id;
    setSessionNotice(null);
    setDriver({ id, status });
  }, []);

  const endSession = useCallback(async (notice = null) => {
    sessionIdRef.current = null;
    await AsyncStorage.multiRemove([SESSION_KEY, TRIP_KEY]).catch((error) => console.warn(error));
    setActiveTrip(null);
    setActiveTripId(null);
    setProfile(null);
    setConnection('online');
    setSessionNotice(notice);
    setDriver(null);
  }, []);

  // Cancelar la solicitud: primero se borra en Firestore y solo si eso funciona se cierra la sesión.
  // Si fallara (sin internet), el conductor sigue en Pendiente y puede reintentar: no queda un documento huérfano
  const cancelRegistration = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    // Se suelta antes de borrar: así el listener no confunde este borrado con uno hecho en la consola
    sessionIdRef.current = null;
    try {
      await deleteRegistration(id);
    } catch (error) {
      sessionIdRef.current = id; // no se borró: la sesión sigue igual
      throw error;
    }
    await endSession();
  }, [endSession]);

  // Al aceptar: si el disco falla, el viaje sigue en memoria, porque en Firestore ya es del conductor
  const startTrip = useCallback(async (tripId) => {
    await AsyncStorage.setItem(TRIP_KEY, tripId).catch((error) => console.warn(error));
    setActiveTripId(tripId);
  }, []);

  const clearTrip = useCallback(async () => {
    await AsyncStorage.removeItem(TRIP_KEY).catch((error) => console.warn(error));
    setActiveTrip(null);
    setActiveTripId(null);
  }, []);

  const driverId = driver?.id;

  // 2) Escuchar el estado en Firestore mientras haya sesión.
  // Depende de driverId y no de driver: cada snapshot crea un driver nuevo y eso recrearía el listener sin fin
  useEffect(() => {
    if (!driverId) return undefined;

    const unsubscribe = onSnapshot(
      doc(db, 'drivers', driverId),
      { includeMetadataChanges: true }, // avisa también cuando pasa de caché a servidor
      (snap) => {
        const fromServer = !snap.metadata.fromCache;
        setConnection(fromServer ? 'online' : 'offline');

        if (!snap.exists()) {
          // Desde caché, "no existe" puede ser solo falta de señal: no se cierra la sesión.
          // Si el conductor mismo está cancelando (sessionIdRef ya es null), no se muestra el aviso
          if (fromServer && sessionIdRef.current === driverId) {
            endSession('Tu registro ya no existe. Puedes registrarte de nuevo.');
          }
          return;
        }

        const data = snap.data();
        const { status, rejectionReason = null } = data;
        setProfile(data);
        setDriver((prev) =>
          prev?.id === driverId && (prev.status !== status || prev.rejectionReason !== rejectionReason)
            ? { ...prev, status, rejectionReason }
            : prev
        );
        // Al caché solo va lo que confirmó el servidor, y solo si la sesión sigue abierta
        if (fromServer && sessionIdRef.current === driverId) {
          writeSession({ id: driverId, status }).catch((error) => console.warn(error));
        }
      },
      (error) => {
        // Por ejemplo permission-denied si vencieron las reglas de prueba. Tras un error el listener queda cerrado
        console.warn('No se pudo escuchar el estado del conductor:', error);
        setConnection('error');
      }
    );

    return unsubscribe; // limpieza: corta el listener al cambiar de id o desmontar
  }, [driverId, endSession]);

  // 3) Escuchar el viaje activo: su status decide qué pantalla del viaje se muestra
  useEffect(() => {
    if (!activeTripId || !driverId) return undefined;

    const unsubscribe = onSnapshot(
      doc(db, 'trips', activeTripId),
      { includeMetadataChanges: true },
      (snap) => {
        const fromServer = !snap.metadata.fromCache;
        if (!snap.exists()) {
          if (fromServer) clearTrip(); // borrado de verdad
          return;
        }
        // 'estimate': mientras el servidor no confirma, un serverTimestamp() da una hora estimada y no null
        const trip = { id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) };
        const ended = ENDED_TRIP_STATUSES.includes(trip.status) || trip.driverId !== driverId;
        // El caché puede traer la versión de antes de aceptar (requested, driverId null): solo el servidor decide soltarlo
        if (ended) {
          if (fromServer) clearTrip();
          return;
        }
        setActiveTrip(trip);
      },
      (error) => console.warn('No se pudo escuchar el viaje activo:', error)
    );

    return unsubscribe;
  }, [activeTripId, driverId, clearTrip]);

  // setDriver no se expone: la sesión solo cambia con startSession, endSession y cancelRegistration, que pasan por AsyncStorage
  const value = useMemo(
    () => ({
      driver, profile, restoring, connection, sessionNotice,
      startSession, endSession, cancelRegistration,
      activeTripId, activeTrip, startTrip, clearTrip,
    }),
    [driver, profile, restoring, connection, sessionNotice, startSession, endSession, cancelRegistration,
      activeTripId, activeTrip, startTrip, clearTrip]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver debe usarse dentro de DriverProvider');
  return ctx;
}
