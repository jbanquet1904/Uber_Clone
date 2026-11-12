// AI-assisted: see docs/AI_LOG.md #14
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Chip from '../../components/Chip';
import DateField from '../../components/form/DateField';
import { useDriver } from '../../context/DriverContext';
import { useTripHistory } from '../../hooks/useTripHistory';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { addDays, formatDateTime, periodRange, toDate } from '../../utils/dates';
import { formatCOP } from '../../utils/formatCOP';
import { PaymentBadge } from '../trip/TripSummaryScreen';

const PERIODS = ['today', 'week', 'month', 'range'];
const METHODS = [null, 'mercadopago', 'cash'];

function HistoryItem({ trip, onPress }) {
  const { t } = useI18n();
  return (
    <Pressable style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.itemHeader}>
        <Text style={styles.date}>{formatDateTime(toDate(trip.completedAt))}</Text>
        <PaymentBadge trip={trip} />
      </View>
      <Text style={styles.route} numberOfLines={1}>
        {trip.origin?.address}
      </Text>
      <Text style={styles.route} numberOfLines={1}>
        → {trip.destination?.address}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.meta}>
          {t(`category.${trip.category}`)} · {t('history.fare', { amount: formatCOP(trip.fare) })}
        </Text>
        <Text style={styles.net}>{formatCOP(trip.driverEarnings)}</Text>
      </View>
    </Pressable>
  );
}

// Historial con FlatList, del más reciente al más antiguo, filtros de fecha y de método de pago, 20 por carga
export default function HistoryScreen({ navigation }) {
  const { t } = useI18n();
  const { driver } = useDriver();
  const [period, setPeriod] = useState('week');
  const [method, setMethod] = useState(null);
  const [rangeFrom, setRangeFrom] = useState(() => addDays(new Date(), -30));
  const [rangeTo, setRangeTo] = useState(() => new Date());

  const { from, to } = useMemo(
    () => periodRange(period, new Date(), { from: rangeFrom, to: rangeTo }),
    [period, rangeFrom, rangeTo]
  );
  const { trips, loading, loadingMore, error, hasMore, loadMore, refresh } = useTripHistory(driver?.id, {
    from,
    to,
    paymentMethod: method,
  });

  const header = (
    <View style={styles.filters}>
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Chip key={p} label={t(`period.${p}`)} selected={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>
      {period === 'range' && (
        <View style={styles.rangeRow}>
          <View style={styles.flex}>
            <DateField label={t('history.from')} value={rangeFrom} onChange={setRangeFrom} maximumDate={new Date()} />
          </View>
          <View style={styles.flex}>
            <DateField label={t('history.to')} value={rangeTo} onChange={setRangeTo} maximumDate={new Date()} />
          </View>
        </View>
      )}
      <View style={styles.chips}>
        {METHODS.map((m) => (
          <Chip
            key={m ?? 'all'}
            label={m ? t(`payment.method.${m}`) : t('history.allMethods')}
            selected={method === m}
            onPress={() => setMethod(m)}
          />
        ))}
      </View>
    </View>
  );

  let empty;
  if (loading) empty = <ActivityIndicator style={styles.spinner} color={colors.primary} />;
  else if (error) empty = <Text style={styles.error}>{t(`history.error.${error}`)}</Text>;
  // Mensaje vacío en lugar de una lista en blanco
  else empty = <Text style={styles.empty}>{t('history.empty')}</Text>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={trips}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <HistoryItem trip={item} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.4}
      refreshing={false}
      onRefresh={refresh}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, flexGrow: 1 },
  flex: { flex: 1 },
  filters: { gap: 10, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeRow: { flexDirection: 'row', gap: 10 },
  item: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 4 },
  pressed: { opacity: 0.8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  date: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  route: { fontSize: 15, color: colors.text },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted },
  net: { fontSize: 17, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  spinner: { marginTop: 24 },
  empty: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  error: { fontSize: 14, color: colors.error, textAlign: 'center', marginTop: 32, lineHeight: 20 },
});
