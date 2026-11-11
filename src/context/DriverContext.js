// AI-assisted: see docs/AI_LOG.md #2, #9
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../config/configFireBase';

const SESSION_KEY = '@uberclone/driver-session';
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
  const [restoring, setRestoring] = useState(true); // "todavía no sé": evita que se vea el registro un instante
  const [connection, setConnection] = useState('online'); // 'online' | 'offline' | 'error'
  const [sessionNotice, setSessionNotice] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  // id de la sesión vigente, sin esperar un render: un snapshot que llega mientras se cierra la sesión no la vuelve a guardar
  const sessionIdRef = useRef(null);

  // 1) Restaurar la sesión guardada al abrir la app
  useEffect(() => {
    let cancelled = false;
    readSession().then((session) => {
      if (cancelled) return;
      sessionIdRef.current = session?.id ?? null;
      setDriver(session);
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
    await AsyncStorage.removeItem(SESSION_KEY).catch((error) => console.warn(error));
    setActiveTrip(null);
    setConnection('online');
    setSessionNotice(notice);
    setDriver(null);
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
          // Desde caché, "no existe" puede ser solo falta de señal: no se cierra la sesión
          if (fromServer) endSession('Tu registro ya no existe. Puedes registrarte de nuevo.');
          return;
        }

        const { status, rejectionReason = null } = snap.data();
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

  // setDriver no se expone: la sesión solo cambia con startSession y endSession, que pasan por AsyncStorage
  const value = useMemo(
    () => ({ driver, restoring, connection, sessionNotice, startSession, endSession, activeTrip, setActiveTrip }),
    [driver, restoring, connection, sessionNotice, startSession, endSession, activeTrip]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver debe usarse dentro de DriverProvider');
  return ctx;
}
