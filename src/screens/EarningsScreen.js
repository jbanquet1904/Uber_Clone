// AI-assisted: see docs/AI_LOG.md #14
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '../components/Chip';
import { useDriver } from '../context/DriverContext';
import { useEarnings } from '../hooks/useEarnings';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { formatCOP } from '../utils/formatCOP';

const PERIODS = ['today', 'week', 'month'];

function Stat({ label, value, highlight }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statLabel, highlight && styles.statLabelHighlight]}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

export default function EarningsScreen() {
  const { t } = useI18n();
  const { driver } = useDriver();
  const { periods, balance, loading, error } = useEarnings(driver?.id);
  const [period, setPeriod] = useState('today');
  const summary = periods[period];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Saldo: pasarela suma la ganancia neta, efectivo resta la comisión que el conductor ya cobró */}
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>{t('earnings.balance')}</Text>
        <Text style={[styles.balanceValue, balance < 0 && styles.negative]}>
          {balance < 0 ? `− ${formatCOP(-balance)}` : formatCOP(balance)}
        </Text>
        <Text style={styles.balanceHint}>{t('earnings.balanceHint')}</Text>
      </View>

      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Chip key={p} label={t(`period.${p}`)} selected={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>

      {error ? <Text style={styles.error}>{t('earnings.error')}</Text> : null}

      {summary.count === 0 ? (
        <Text style={styles.empty}>{t('earnings.empty')}</Text>
      ) : (
        <View style={styles.grid}>
          <Stat label={t('earnings.net')} value={formatCOP(summary.net)} highlight />
          <Stat label={t('earnings.trips')} value={String(summary.count)} />
          <Stat label={t('earnings.average')} value={formatCOP(summary.average)} />
          <Stat label={t('earnings.billed')} value={formatCOP(summary.billed)} />
          <Stat label={t('earnings.commissions')} value={formatCOP(summary.commissions)} />
          <Stat label={t('earnings.tips')} value={formatCOP(summary.tips)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  balance: { backgroundColor: colors.primary, borderRadius: 16, padding: 18, gap: 4 },
  balanceLabel: { color: '#FFFFFFB3', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  negative: { color: '#FFB4AB' },
  balanceHint: { color: '#FFFFFFB3', fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 4 },
  statHighlight: { flexBasis: '100%', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.success },
  statLabel: { fontSize: 13, color: colors.textMuted },
  statLabelHighlight: { color: colors.success, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  statValueHighlight: { fontSize: 26 },
  empty: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  error: { fontSize: 13, color: colors.error },
});
