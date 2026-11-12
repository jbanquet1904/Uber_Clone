// AI-assisted: see docs/AI_LOG.md #14
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from '../../components/Map';
import { db } from '../../config/configFireBase';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { formatDateTime, toDate } from '../../utils/dates';
import { formatCOP } from '../../utils/formatCOP';
import { formatKm, formatPercent } from '../../utils/format';
import { decodePolyline, toLatLng } from '../../utils/geo';
import { PaymentBadge } from '../trip/TripSummaryScreen';

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// Detalle de un viaje: la ruta guardada se dibuja con Polyline (no se usa Static Maps ni se vuelve a pedir la ruta).
// Por navegación solo viaja el tripId: un objeto con Timestamp de Firestore no es serializable
export default function TripDetailScreen({ route }) {
  const { t } = useI18n();
  const { tripId } = route.params;
  const [state, setState] = useState({ trip: null, error: false });

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'trips', tripId))
      .then((snap) => !cancelled && setState({ trip: snap.exists() ? { id: snap.id, ...snap.data() } : null, error: !snap.exists() }))
      .catch((err) => {
        console.warn('No se pudo cargar el viaje:', err);
        if (!cancelled) setState({ trip: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const { trip, error } = state;
  const routeCoords = useMemo(() => decodePolyline(trip?.tripRoute?.polyline), [trip?.tripRoute?.polyline]);

  if (error) return <Text style={styles.error}>{t('history.detailError')}</Text>;
  if (!trip) return <ActivityIndicator style={styles.spinner} color={colors.primary} />;

  const origin = toLatLng(trip.origin);
  const destination = toLatLng(trip.destination);
  const line = routeCoords.length ? routeCoords : [origin, destination];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 1.8 + 0.01,
          longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 1.8 + 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={origin} pinColor={colors.success} />
        <Marker coordinate={destination} pinColor={colors.primary} />
        <Polyline
          coordinates={line}
          strokeWidth={routeCoords.length ? 4 : 3}
          strokeColor={routeCoords.length ? colors.primary : colors.textMuted}
          lineDashPattern={routeCoords.length ? undefined : [8, 6]}
        />
      </MapView>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDateTime(toDate(trip.completedAt))}</Text>
          <PaymentBadge trip={trip} />
        </View>
        <View style={styles.stop}>
          <Ionicons name="radio-button-on" size={14} color={colors.success} />
          <Text style={styles.address}>{trip.origin.address}</Text>
        </View>
        <View style={styles.stop}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={styles.address}>{trip.destination.address}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label={t('history.category')} value={t(`category.${trip.category}`)} />
        <Row label={t('summary.method')} value={t(`payment.method.${trip.paymentMethod}`)} />
        <Row label={t('history.distance')} value={`${formatKm(trip.distanceKm)} km`} />
        <Row label={t('history.duration')} value={`${trip.durationMin} min`} />
        <Row label={t('summary.fare')} value={formatCOP(trip.fare)} />
        <Row label={t('summary.commission', { rate: formatPercent(trip.commissionRate) })} value={`− ${formatCOP(trip.commission)}`} />
        <Row label={t('summary.tip')} value={formatCOP(trip.tip ?? 0)} />
        <Row label={t('summary.net')} value={formatCOP(trip.driverEarnings)} />
        <Row label={t('history.rating')} value={trip.rating ? '★'.repeat(trip.rating) + '☆'.repeat(5 - trip.rating) : t('history.noRating')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  map: { height: 240, borderRadius: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  stop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  address: { flex: 1, fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 15, color: colors.textMuted, flexShrink: 1 },
  value: { fontSize: 15, color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  spinner: { marginTop: 40 },
  error: { fontSize: 15, color: colors.error, textAlign: 'center', marginTop: 40, padding: 16 },
});
