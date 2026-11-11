// AI-assisted: see docs/AI_LOG.md #10
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../../components/PrimaryButton';
import { useDriver } from '../../context/DriverContext';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { useLocationPublisher } from '../../hooks/useLocationPublisher';
import { markUnavailable } from '../../services/driverLocation';
import { colors } from '../../theme';

const AVAILABILITY_KEY = '@uberclone/last-availability';
const DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

// Solo { driverId, available }: nunca coordenadas en el teléfono
const saveAvailability = (driverId, available) =>
  AsyncStorage.setItem(AVAILABILITY_KEY, JSON.stringify({ driverId, available })).catch(() => {});

export default function HomeScreen() {
  const { driver } = useDriver();
  const driverId = driver?.id; // un instante es null al cerrar la sesión, antes de que el navegador quite la pantalla
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const userLocationRef = useRef(null);
  const toggledRef = useRef(false); // el conductor ya tocó el interruptor en esta apertura

  const [inForeground, setInForeground] = useState(AppState.currentState !== 'background');
  const [isAvailable, setIsAvailable] = useState(false); // lo que el conductor quiere
  const [wasAvailable, setWasAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  // 'inactive' (Centro de control, una llamada, el propio diálogo de permisos) no cuenta como salir
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setInForeground(state !== 'background'));
    return () => sub.remove();
  }, []);

  // Lo que de verdad pasa: quiere estar Disponible + está en esta pantalla + la app está al frente.
  // useIsFocused y no solo el desmontaje: abrir Historial en el Drawer no desmonta Inicio
  const online = isAvailable && isFocused && inForeground;
  const { handleLocation, publishError } = useLocationPublisher({ driverId, online });
  const { coords, permission, servicesEnabled, error, requestPermission, openSettings } = useDriverLocation({
    enabled: online,
    onLocation: handleLocation,
  });

  // Al abrir: si la última vez estaba Disponible, la sesión anterior se cortó sin apagar (conductor "fantasma")
  useEffect(() => {
    if (!driverId) return undefined;
    let cancelled = false;
    AsyncStorage.getItem(AVAILABILITY_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        // Si ya tocó el interruptor mientras se leía, manda lo que eligió ahora
        if (cancelled || toggledRef.current || saved?.driverId !== driverId || !saved.available) return;
        setWasAvailable(true);
        markUnavailable(driverId).catch((e) => console.warn('No se pudo limpiar la sesión anterior:', e));
        saveAvailability(driverId, false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  // Si pierde el permiso o apaga los servicios estando Disponible, se desconecta y no vuelve solo.
  // Se ajusta durante el render (patrón de React) y no en un efecto, para no pintar un render de más
  if (isAvailable && !(permission === 'granted' && servicesEnabled)) setIsAvailable(false);

  // El disco sigue a isAvailable, pero solo después de que el conductor tocó el interruptor:
  // al montar vale false y borraría el "true" que necesita la limpieza del fantasma
  useEffect(() => {
    if (driverId && toggledRef.current) saveAvailability(driverId, isAvailable);
  }, [driverId, isAvailable]);

  // Nunca se restaura Disponible solo: es un compromiso de aceptar viajes y lo decide el conductor
  const handleToggle = useCallback(
    async (next) => {
      toggledRef.current = true;
      setWasAvailable(false);
      if (!next) {
        setIsAvailable(false);
        return;
      }
      setBusy(true);
      try {
        if (await requestPermission()) setIsAvailable(true); // si ya lo dio, no vuelve a preguntar
      } finally {
        setBusy(false);
      }
    },
    [requestPermission]
  );

  // Usa la posición que reporta el mapa: funciona aunque no esté Disponible
  const recenter = () => {
    const target = userLocationRef.current ?? coords;
    if (!target) return;
    mapRef.current?.animateToRegion({ latitude: target.latitude, longitude: target.longitude, ...DELTA }, 500);
  };

  if (!driverId) return null;

  if (permission === 'checking') return <CenteredLoader />;

  if (!servicesEnabled || permission !== 'granted') {
    return (
      <PermissionPanel
        servicesEnabled={servicesEnabled}
        permission={permission}
        onRequest={requestPermission}
        onOpenSettings={openSettings}
      />
    );
  }

  if (!coords) return <CenteredLoader text={error ?? 'Buscando tu ubicación…'} />;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: coords.latitude, longitude: coords.longitude, ...DELTA }}
        // El punto azul lo dibuja el mapa de forma nativa: no gasta escrituras en Firestore
        showsUserLocation
        onUserLocationChange={(e) => {
          const point = e.nativeEvent.coordinate;
          if (point) userLocationRef.current = point;
        }}
      />

      {/* box-none: los toques que no caen en el botón o la tarjeta llegan al mapa */}
      <View style={[styles.bottom, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <Pressable style={styles.recenter} onPress={recenter} hitSlop={8}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </Pressable>

        <View style={styles.card}>
          {wasAvailable && !isAvailable && (
            <Pressable onPress={() => handleToggle(true)} style={styles.banner}>
              <Text style={styles.bannerText}>La última vez estabas Disponible. Toca aquí para conectarte de nuevo.</Text>
            </Pressable>
          )}

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.statusTitle, isAvailable && styles.statusOn]}>
                {isAvailable ? 'Disponible' : 'No disponible'}
              </Text>
              <Text style={styles.statusText}>
                {isAvailable ? 'Recibirás solicitudes de viaje cercanas.' : 'Actívate para empezar a recibir solicitudes.'}
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={isAvailable}
                onValueChange={handleToggle}
                trackColor={{ true: colors.success }}
                accessibilityLabel="Disponible"
              />
            )}
          </View>

          {isAvailable && publishError ? <Text style={styles.error}>{publishError}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function CenteredLoader({ text }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={styles.panelText}>{text}</Text> : null}
    </View>
  );
}

// El permiso se pide con una explicación antes: en iPhone el sistema pregunta una sola vez
function PermissionPanel({ servicesEnabled, permission, onRequest, onOpenSettings }) {
  let text;
  let action = null;

  if (!servicesEnabled) {
    text = 'Los servicios de ubicación del teléfono están apagados. Actívalos en Ajustes › Privacidad y seguridad › Localización.';
  } else if (permission === 'blocked') {
    text = 'Negaste el acceso a tu ubicación. Para conducir necesitas activarlo en los Ajustes de la app.';
    action = { title: 'Abrir Ajustes', onPress: onOpenSettings };
  } else {
    text = 'Necesitamos tu ubicación mientras usas la app para mostrarte en el mapa y enviarte solicitudes cercanas.';
    action = { title: 'Permitir ubicación', onPress: onRequest };
  }

  return (
    <View style={styles.center}>
      <Ionicons name="location-outline" size={64} color={colors.primary} />
      <Text style={styles.panelText}>{text}</Text>
      {action && (
        <View style={styles.panelAction}>
          <PrimaryButton title={action.title} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, backgroundColor: colors.background },
  panelText: { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22 },
  panelAction: { alignSelf: 'stretch' },
  bottom: { position: 'absolute', left: 16, right: 16, gap: 12 },
  recenter: {
    alignSelf: 'flex-end', width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowRadius: 6, ...shadow,
  },
  card: { padding: 16, borderRadius: 16, gap: 10, backgroundColor: colors.surface, shadowRadius: 10, ...shadow },
  banner: { padding: 10, borderRadius: 10, backgroundColor: colors.background },
  bannerText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  statusOn: { color: colors.success },
  statusText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  error: { fontSize: 13, color: colors.error },
});
