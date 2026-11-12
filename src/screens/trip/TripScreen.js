// AI-assisted: see docs/AI_LOG.md #12
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from '../../components/Map';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../../components/PrimaryButton';
import { useDriver } from '../../context/DriverContext';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { useI18n } from '../../i18n';
import { boardPassenger, cancelTripByDriver, completeTrip, startPickup, TripUnavailableError } from '../../services/trips';
import { colors } from '../../theme';
import { formatCOP } from '../../utils/formatCOP';
import { formatKm } from '../../utils/format';
import { decodePolyline, toLatLng } from '../../utils/geo';

const EDGE_PADDING = { top: 60, right: 50, bottom: 340, left: 50 };

// Abre la app de mapas del teléfono con la ruta paso a paso (Apple Maps en iPhone, Google Maps en Android)
function openNavigation({ lat, lng }) {
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
      : `google.navigation:q=${lat},${lng}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`)
  );
}

// Viaje en curso. El status del viaje decide qué se ve: primero la ruta a la recogida y, con el pasajero a bordo, al destino
export default function TripScreen() {
  const { t } = useI18n();
  const { driver, activeTrip: trip } = useDriver();
  const driverId = driver?.id;
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const userLocationRef = useRef(null);
  const coordsRef = useRef(null);
  const pickupStartedRef = useRef(null); // la ruta a la recogida se calcula una sola vez por viaje
  // enabled: false → solo permisos y una primera posición; el punto azul lo dibuja el mapa
  const { coords } = useDriverLocation({ enabled: false });
  const [busy, setBusy] = useState(null); // 'board' | 'finish' | 'cancel'
  const [error, setError] = useState(null);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  const tripId = trip?.id;
  const status = trip?.status;
  const pickupPhase = status === 'accepted' || status === 'driver_arriving';
  const target = trip ? (pickupPhase ? trip.origin : trip.destination) : null;
  const hasCoords = coords != null;

  // Recién aceptado: se calcula la ruta hasta el pasajero y el viaje pasa a driver_arriving.
  // Es un efecto porque sincroniza con un sistema externo (Firestore), y también corre si la app se cerró justo después de aceptar
  useEffect(() => {
    if (!tripId || status !== 'accepted' || !hasCoords || pickupStartedRef.current === tripId) return;
    pickupStartedRef.current = tripId;
    startPickup(trip, driverId, userLocationRef.current ?? coordsRef.current).catch((err) => {
      // Sin ruta igual se puede seguir: "Pasajero a bordo" también acepta el estado accepted
      console.warn('No se pudo calcular la ruta a la recogida:', err);
    });
  }, [tripId, status, hasCoords, trip, driverId]);

  const encoded = pickupPhase ? trip?.pickupRoute?.polyline : trip?.tripRoute?.polyline;
  const routeCoords = useMemo(() => decodePolyline(encoded), [encoded]);
  // Sin ruta real (estimación), con el pasajero a bordo se dibuja una línea recta punteada al destino
  const straightLine = !routeCoords.length && !pickupPhase && trip ? [toLatLng(trip.origin), toLatLng(trip.destination)] : null;

  const fitMap = useCallback(() => {
    const here = userLocationRef.current ?? coordsRef.current;
    const points = routeCoords.length
      ? routeCoords
      : [here && { latitude: here.latitude, longitude: here.longitude }, target && toLatLng(target)].filter(Boolean);
    if (points.length > 1) mapRef.current?.fitToCoordinates(points, { edgePadding: EDGE_PADDING, animated: true });
  }, [routeCoords, target]);

  // Encuadrar cada vez que cambia la ruta (al llegar la de recogida y al subir el pasajero)
  useEffect(() => {
    fitMap();
  }, [fitMap]);

  const run = async (kind, action) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.warn(`No se pudo completar "${kind}":`, err);
      setError(err instanceof TripUnavailableError ? t('trip.changed') : t('trip.error'));
    } finally {
      setBusy(null);
    }
  };

  const handleBoard = () => run('board', () => boardPassenger(trip, driverId, userLocationRef.current ?? coords));

  const handleFinish = () =>
    Alert.alert(t('trip.finishTitle'), t('trip.finishMessage'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('trip.finish'), onPress: () => run('finish', () => completeTrip(trip.id, driverId)) },
    ]);

  const handleCancel = () =>
    Alert.alert(t('trip.cancelTitle'), t('trip.cancelMessage'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('trip.cancelConfirm'), style: 'destructive', onPress: () => run('cancel', () => cancelTripByDriver(trip.id, driverId)) },
    ]);

  if (!trip) return null;

  const leg = pickupPhase ? trip.pickupRoute : trip.tripRoute;
  const etaText = leg ? t('trip.eta', { min: leg.durationMin, km: formatKm(leg.distanceKm) }) : status === 'accepted' ? t('trip.calculating') : null;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...toLatLng(target), latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation
        onMapReady={fitMap}
        onUserLocationChange={(e) => {
          const point = e.nativeEvent.coordinate;
          if (point) userLocationRef.current = point;
        }}
      >
        <Marker coordinate={toLatLng(trip.origin)} title={t('request.pickup')} pinColor={colors.success} />
        <Marker coordinate={toLatLng(trip.destination)} title={t('request.destination')} pinColor={colors.primary} />
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor={colors.primary} />}
        {straightLine && <Polyline coordinates={straightLine} strokeWidth={3} strokeColor={colors.textMuted} lineDashPattern={[8, 6]} />}
      </MapView>

      <View style={[styles.card, { bottom: insets.bottom + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.phase}>{pickupPhase ? t('trip.toPickup') : t('trip.toDestination')}</Text>
          <Pressable style={styles.navButton} onPress={() => openNavigation(target)} hitSlop={6}>
            <Ionicons name="navigate" size={16} color={colors.primary} />
            <Text style={styles.navText}>{t('trip.navigate')}</Text>
          </Pressable>
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {target.address}
        </Text>
        {etaText ? <Text style={styles.eta}>{etaText}</Text> : null}
        {leg?.source === 'estimate' ? <Text style={styles.muted}>{t('trip.routeEstimate')}</Text> : null}

        <Text style={styles.muted}>
          {t(`category.${trip.category}`)} · {t(`payment.method.${trip.paymentMethod}`)} · {t('trip.estimatedEarnings', { amount: formatCOP(trip.driverEarnings) })}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pickupPhase ? (
          <>
            <PrimaryButton title={busy === 'board' ? t('trip.boarding') : t('trip.board')} onPress={handleBoard} disabled={busy != null} />
            <Pressable onPress={handleCancel} disabled={busy != null} style={styles.linkButton} hitSlop={8}>
              {busy === 'cancel' ? <ActivityIndicator color={colors.error} /> : <Text style={styles.cancelText}>{t('trip.cancel')}</Text>}
            </Pressable>
          </>
        ) : (
          <PrimaryButton title={busy === 'finish' ? t('trip.finishing') : t('trip.finish')} onPress={handleFinish} disabled={busy != null} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    position: 'absolute', left: 12, right: 12, padding: 16, borderRadius: 16, gap: 8, backgroundColor: colors.surface,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phase: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.background },
  navText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  address: { fontSize: 18, fontWeight: '700', color: colors.text },
  eta: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  error: { fontSize: 13, color: colors.error },
  linkButton: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.error },
});
