// AI-assisted: see docs/AI_LOG.md #10
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

// En iOS no existe timeInterval (solo Android): la frecuencia de escritura la controla useLocationPublisher
const WATCH_OPTIONS = { accuracy: Location.Accuracy.High, distanceInterval: 10 };

function toPermissionState(perm) {
  if (perm.granted) return 'granted';
  if (perm.status === 'undetermined') return 'undetermined';
  return perm.canAskAgain ? 'denied' : 'blocked'; // blocked = solo se puede dar desde Ajustes
}

// Solo GPS y permisos: no sabe nada de Firestore. Qué hacer con cada posición lo decide onLocation
export function useDriverLocation({ enabled, onLocation }) {
  const [permission, setPermission] = useState('checking');
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  // El callback más reciente, sin reiniciar el seguimiento cada vez que cambia
  const onLocationRef = useRef(onLocation);
  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  const requestPermission = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync(); // "Mientras se usa la app"
      setPermission(toPermissionState(perm));
      if (!perm.granted) return false;
      const services = await Location.hasServicesEnabledAsync();
      setServicesEnabled(services);
      return services;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  // Al montar y cada vez que la app vuelve al frente: "Permitir una vez" o un cambio en Ajustes cambian el permiso
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      Promise.all([
        Location.getForegroundPermissionsAsync(), // consulta sin mostrar el diálogo
        Location.hasServicesEnabledAsync(), // los Servicios de ubicación del teléfono son un interruptor aparte
      ])
        .then(([perm, services]) => {
          if (cancelled) return;
          setPermission(toPermissionState(perm));
          setServicesEnabled(services);
        })
        .catch((e) => !cancelled && setError(e.message));

    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Una primera posición para centrar el mapa, aunque no esté Disponible
  useEffect(() => {
    if (permission !== 'granted' || !servicesEnabled) return undefined;
    let cancelled = false;
    Location.getLastKnownPositionAsync()
      .then((last) => last ?? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
      .then((loc) => {
        if (!cancelled && loc) setCoords((prev) => prev ?? loc.coords);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [permission, servicesEnabled]);

  const canWatch = enabled && permission === 'granted' && servicesEnabled;

  // Seguimiento continuo, solo mientras canWatch sea true
  useEffect(() => {
    if (!canWatch) return undefined;
    let cancelled = false;
    let subscription = null;

    Location.watchPositionAsync(
      WATCH_OPTIONS,
      (location) => {
        if (cancelled) return;
        setError(null);
        setCoords(location.coords);
        onLocationRef.current?.(location);
      },
      (reason) => !cancelled && setError(reason)
    )
      .then((sub) => {
        // La suscripción llega en una promesa: si la pantalla se fue antes, se quita apenas llega
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [canWatch]);

  return { coords, permission, servicesEnabled, error, requestPermission, openSettings: Linking.openSettings };
}
