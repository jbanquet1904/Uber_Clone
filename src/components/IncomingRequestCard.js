// AI-assisted: see docs/AI_LOG.md #11
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { OFFER_SECONDS } from '../hooks/useTripRequests';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { formatCOP } from '../utils/formatCOP';
import { formatKm } from '../utils/format';

// Cuenta regresiva contra una hora límite. deadline = null la pausa (mientras se procesa Aceptar)
function useCountdown(deadline, onExpire) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, (deadline ?? Date.now()) - Date.now()));
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadline == null) return undefined;
    let fired = false;
    const id = setInterval(() => {
      // Se recalcula contra la hora límite, no se descuenta de a uno: si el teléfono se traba, no se desfasa
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left === 0 && !fired) {
        fired = true;
        clearInterval(id);
        onExpireRef.current?.();
      }
    }, 250);
    return () => clearInterval(id); // limpieza del temporizador
  }, [deadline]);

  return remainingMs;
}

export default function IncomingRequestCard({ trip, deadline, pickupKm, busy, onAccept, onDecline, onExpire }) {
  const { t } = useI18n();
  const remainingMs = useCountdown(busy ? null : deadline, onExpire);
  const seconds = Math.ceil(remainingMs / 1000);
  const progress = Math.min(1, remainingMs / (OFFER_SECONDS * 1000));
  const urgent = seconds <= 5;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('request.title')} · {t(`category.${trip.category}`)}
        </Text>
        <Text style={[styles.timer, urgent && styles.timerUrgent]}>{seconds} s</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${progress * 100}%` }, urgent && styles.barUrgent]} />
      </View>

      {/* La ganancia neta en grande: es la cifra que el conductor necesita para decidir en 15 segundos */}
      <Text style={styles.earnings}>{formatCOP(trip.driverEarnings)}</Text>
      <Text style={styles.muted}>{t('request.earnings', { fare: formatCOP(trip.fare) })}</Text>

      <View style={styles.stop}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <View style={styles.flex}>
          <Text style={styles.stopLabel}>
            {t('request.pickup')}
            {pickupKm != null ? ` · ${t('request.pickupDistance', { km: formatKm(pickupKm) })}` : ''}
          </Text>
          <Text style={styles.stopAddress} numberOfLines={2}>
            {trip.origin.address}
          </Text>
        </View>
      </View>
      <View style={styles.stop}>
        <View style={[styles.dot, { backgroundColor: colors.text }]} />
        <View style={styles.flex}>
          <Text style={styles.stopLabel}>{t('request.destination')}</Text>
          <Text style={styles.stopAddress} numberOfLines={2}>
            {trip.destination.address}
          </Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {formatKm(trip.distanceKm)} km · {trip.durationMin} min · {t(`payment.method.${trip.paymentMethod}`)}
      </Text>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.decline]} onPress={onDecline} disabled={busy}>
          <Text style={styles.declineText}>{t('request.decline')}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.accept]} onPress={onAccept} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>{t('request.accept')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16, borderRadius: 16, gap: 10, backgroundColor: colors.surface,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  timer: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  timerUrgent: { color: colors.error },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 4, backgroundColor: colors.primary },
  barUrgent: { backgroundColor: colors.error },
  earnings: { fontSize: 28, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: -6 },
  stop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  stopLabel: { fontSize: 12, color: colors.textMuted },
  stopAddress: { fontSize: 15, color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: colors.background },
  declineText: { fontSize: 16, fontWeight: '600', color: colors.text },
  accept: { backgroundColor: colors.primary },
  acceptText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
