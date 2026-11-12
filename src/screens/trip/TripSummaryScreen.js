// AI-assisted: see docs/AI_LOG.md #13
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '../../components/Chip';
import PrimaryButton from '../../components/PrimaryButton';
import { useDriver } from '../../context/DriverContext';
import { useI18n } from '../../i18n';
import { createCheckout, PaymentServerError, syncPayment } from '../../services/payments';
import { markCashPaid, ratePassenger, setTip } from '../../services/trips';
import { colors } from '../../theme';
import { formatCOP } from '../../utils/formatCOP';
import { formatKm, formatPercent } from '../../utils/format';

const TIP_OPTIONS = [0, 2000, 5000, 10000];

// Aprobado, Pendiente, Rechazado o Efectivo: los cuatro estados de pago que pide el PDF
export function paymentStatusKey(trip) {
  if (trip.paymentStatus === 'cash') return 'cash';
  if (trip.paymentStatus === 'approved' || trip.status === 'paid') return 'approved';
  if (trip.paymentStatus === 'rejected') return 'rejected';
  return 'pending';
}

const STATUS_COLORS = { approved: colors.success, cash: colors.success, rejected: colors.error, pending: colors.textMuted };

export function PaymentBadge({ trip }) {
  const { t } = useI18n();
  const key = paymentStatusKey(trip);
  return (
    <View style={[styles.badge, { borderColor: STATUS_COLORS[key] }]}>
      <Text style={[styles.badgeText, { color: STATUS_COLORS[key] }]}>{t(`payment.status.${key}`)}</Text>
    </View>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong, muted && styles.rowMuted]}>{value}</Text>
    </View>
  );
}

// Cobro y resumen: tarifa final, comisión, ganancia neta y estado del pago
export default function TripSummaryScreen() {
  const { t } = useI18n();
  const { driver, activeTrip: trip, clearTrip } = useDriver();
  const driverId = driver?.id;
  const [busy, setBusy] = useState(null); // 'tip' | 'checkout' | 'sync' | 'cash'
  const [error, setError] = useState(null);

  if (!trip) return null;

  const paid = trip.status === 'paid';
  const total = trip.fare + (trip.tip ?? 0); // lo que paga el pasajero
  const canChangeTip = !paid && !trip.paymentPreferenceId;
  const isMercadoPago = trip.paymentMethod === 'mercadopago';

  const run = async (kind, action) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.warn(`Cobro (${kind}):`, err);
      setError(err instanceof PaymentServerError ? err.message : t('summary.error'));
    } finally {
      setBusy(null);
    }
  };

  // 1) el backend crea la preferencia con el monto que lee de Firestore, 2) el pasajero paga en el checkout,
  // 3) al cerrar el navegador se le pide al backend que confirme el pago con Mercado Pago y actualice el viaje
  const handleCheckout = () =>
    run('checkout', async () => {
      const { initPoint } = await createCheckout(trip.id);
      await WebBrowser.openBrowserAsync(initPoint);
      await syncPayment(trip.id);
    });

  const handleSync = () => run('sync', () => syncPayment(trip.id));

  const handleCash = () =>
    Alert.alert(t('summary.cashTitle'), t('summary.cashMessage', { amount: formatCOP(total) }), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('summary.cashConfirm'), onPress: () => run('cash', () => markCashPaid(trip.id, driverId)) },
    ]);

  const handleTip = (tip) => run('tip', () => setTip(trip.id, driverId, tip));

  const handleRate = (rating) =>
    ratePassenger(trip.id, rating).catch((err) => {
      console.warn('No se pudo guardar la calificación:', err);
      setError(t('summary.error'));
    });

  const statusKey = paymentStatusKey(trip);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name={paid ? 'checkmark-circle' : 'flag'} size={56} color={paid ? colors.success : colors.primary} />
        <Text style={styles.title}>{paid ? t('summary.paidTitle') : t('summary.title')}</Text>
        <PaymentBadge trip={trip} />
      </View>

      <View style={styles.card}>
        <Row label={t('summary.fare')} value={formatCOP(trip.fare)} />
        <Row label={t('summary.commission', { rate: formatPercent(trip.commissionRate) })} value={`− ${formatCOP(trip.commission)}`} muted />
        <Row label={t('summary.tip')} value={`+ ${formatCOP(trip.tip ?? 0)}`} muted />
        <View style={styles.divider} />
        <Row label={t('summary.net')} value={formatCOP(trip.driverEarnings)} strong />
        <Text style={styles.small}>
          {formatKm(trip.distanceKm)} km · {trip.durationMin} min · {t(`category.${trip.category}`)}
          {trip.estimate?.fare != null && trip.estimate.fare !== trip.fare
            ? ` · ${t('summary.estimated', { amount: formatCOP(trip.estimate.fare) })}`
            : ''}
        </Text>
      </View>

      {canChangeTip && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('summary.tipTitle')}</Text>
          <View style={styles.chips}>
            {TIP_OPTIONS.map((tip) => (
              <Chip
                key={tip}
                label={tip === 0 ? t('summary.noTip') : formatCOP(tip)}
                selected={(trip.tip ?? 0) === tip}
                disabled={busy != null}
                onPress={() => handleTip(tip)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Row label={t('summary.method')} value={t(`payment.method.${trip.paymentMethod}`)} />
        <Row label={t('summary.toCharge')} value={formatCOP(total)} strong />
        {trip.paymentMethod === 'cash' ? <Text style={styles.small}>{t('summary.cashNote', { amount: formatCOP(trip.commission) })}</Text> : null}
        {statusKey === 'rejected' && !paid ? <Text style={styles.errorText}>{t('summary.rejectedHint')}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!paid && isMercadoPago && (
          <View style={styles.actions}>
            <PrimaryButton
              title={busy === 'checkout' ? t('summary.openingCheckout') : t('summary.chargeMp', { amount: formatCOP(total) })}
              onPress={handleCheckout}
              disabled={busy != null}
            />
            {trip.paymentPreferenceId ? (
              <Pressable onPress={handleSync} disabled={busy != null} style={styles.link} hitSlop={8}>
                {busy === 'sync' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.linkText}>{t('summary.checkPayment')}</Text>}
              </Pressable>
            ) : null}
            <Pressable onPress={handleCash} disabled={busy != null} style={styles.link} hitSlop={8}>
              <Text style={styles.linkMuted}>{t('summary.switchToCash')}</Text>
            </Pressable>
          </View>
        )}

        {!paid && !isMercadoPago && (
          <View style={styles.actions}>
            <PrimaryButton
              title={busy === 'cash' ? t('summary.saving') : t('summary.cashReceived', { amount: formatCOP(total) })}
              onPress={handleCash}
              disabled={busy != null}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('summary.rateTitle')}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => handleRate(n)} hitSlop={6} accessibilityLabel={`${n}`}>
              <Ionicons name={(trip.rating ?? 0) >= n ? 'star' : 'star-outline'} size={34} color="#E0A800" />
            </Pressable>
          ))}
        </View>
      </View>

      {/* El viaje se suelta solo cuando el pago quedó confirmado */}
      {paid && <PrimaryButton title={t('summary.done')} onPress={() => clearTrip()} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  badge: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, color: colors.text, flexShrink: 1 },
  rowValue: { fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  rowMuted: { color: colors.textMuted },
  strong: { fontSize: 17, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  small: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { gap: 6, marginTop: 4 },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  linkMuted: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
  errorText: { fontSize: 13, color: colors.error, lineHeight: 18 },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
});
