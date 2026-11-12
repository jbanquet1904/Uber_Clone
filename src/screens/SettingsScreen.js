// AI-assisted: see docs/AI_LOG.md #15
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '../components/Chip';
import { PRICING } from '../config/pricing';
import { LANGUAGES } from '../config/registrationOptions';
import { useDriver } from '../context/DriverContext';
import { SUPPORTED_LANGUAGES, useI18n } from '../i18n';
import { colors } from '../theme';
import { formatPercent } from '../utils/format';

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { endSession, activeTripId } = useDriver();

  // Con un viaje activo no se puede salir: el viaje quedaría sin conductor
  const confirmLogout = () =>
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMessage'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => endSession() },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.chips}>
          {LANGUAGES.filter((l) => SUPPORTED_LANGUAGES.includes(l.value)).map((l) => (
            <Chip key={l.value} label={l.label} selected={language === l.value} onPress={() => setLanguage(l.value)} />
          ))}
        </View>
        <Text style={styles.note}>{t('settings.languageNote')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.platform')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('settings.commission')}</Text>
          <Text style={styles.value}>{formatPercent(PRICING.commissionRate)}</Text>
        </View>
        <Text style={styles.note}>{t('settings.commissionNote')}</Text>
      </View>

      <View style={styles.card}>
        <Pressable onPress={confirmLogout} disabled={!!activeTripId} hitSlop={8}>
          <Text style={[styles.logout, activeTripId && styles.disabled]}>{t('settings.logout')}</Text>
        </Pressable>
        {activeTripId ? <Text style={styles.note}>{t('settings.logoutBlocked')}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 15, color: colors.textMuted },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  logout: { fontSize: 16, fontWeight: '700', color: colors.error, textAlign: 'center', paddingVertical: 4 },
  disabled: { color: colors.textMuted },
});
