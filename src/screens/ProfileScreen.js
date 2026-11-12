// AI-assisted: see docs/AI_LOG.md #15
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/form/TextField';
import { useDriver } from '../context/DriverContext';
import { useI18n } from '../i18n';
import { updateContact } from '../services/driverAccount';
import { colors } from '../theme';
import { formatDate, toDate } from '../utils/dates';
import { isAfterToday, isValidEmail, isValidPhone, onlyDigits } from '../utils/registrationValidators';

function Row({ label, value, tone }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'bad' && styles.bad, tone === 'good' && styles.good]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Datos de contacto editables. Se monta cuando ya llegó el perfil, así el formulario arranca con los datos reales
function ContactForm({ driverId, initial }) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const errors = {
    phone: isValidPhone(form.phone) ? null : t('profile.phoneError'),
    email: isValidEmail(form.email) ? null : t('profile.emailError'),
    mercadoPagoEmail: isValidEmail(form.mercadoPagoEmail) ? null : t('profile.emailError'),
  };
  const valid = !errors.phone && !errors.email && !errors.mercadoPagoEmail;
  const changed = Object.keys(initial).some((key) => form[key].trim() !== initial[key]);

  const update = (field) => (value) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateContact(driverId, form);
      setMessage({ ok: true, text: t('profile.saved') });
    } catch (err) {
      console.warn('No se pudo guardar el perfil:', err);
      setMessage({ ok: false, text: t('profile.saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={t('profile.contact')}>
      <TextField
        label={t('profile.phone')}
        value={form.phone}
        onChangeText={(text) => update('phone')(onlyDigits(text))}
        error={errors.phone}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <TextField
        label={t('profile.email')}
        value={form.email}
        onChangeText={update('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label={t('profile.mpEmail')}
        value={form.mercadoPagoEmail}
        onChangeText={update('mercadoPagoEmail')}
        error={errors.mercadoPagoEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {message ? <Text style={message.ok ? styles.good : styles.bad}>{message.text}</Text> : null}
      <PrimaryButton title={saving ? t('profile.saving') : t('profile.save')} onPress={save} disabled={!valid || !changed || saving} />
    </Section>
  );
}

export default function ProfileScreen() {
  const { t } = useI18n();
  const { driver, profile } = useDriver();

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { personal = {}, vehicle = {}, documents = {} } = profile;
  // Vigente si vence después de hoy (la misma regla del registro)
  const expiry = (value) => {
    const date = toDate(value);
    if (!date) return { text: t('profile.notApplicable') };
    const ok = isAfterToday(date);
    return { text: `${formatDate(date)} · ${ok ? t('profile.valid') : t('profile.expired')}`, tone: ok ? 'good' : 'bad' };
  };
  const license = expiry(documents.licenseExpiry);
  const soat = expiry(documents.soatExpiry);
  const rtm = expiry(documents.rtmExpiry);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        {personal.photoUrl ? <Image source={{ uri: personal.photoUrl }} style={styles.avatar} /> : null}
        <Text style={styles.name}>{personal.fullName}</Text>
        <Text style={styles.status}>{t(`profile.status.${profile.status}`)}</Text>
      </View>

      <Section title={t('profile.personal')}>
        <Row label={t('profile.document')} value={personal.documentNumber} />
        <Row label={t('profile.birthDate')} value={formatDate(toDate(personal.birthDate))} />
        <Row label={t('profile.gender')} value={t(`gender.${personal.gender}`)} />
      </Section>

      <ContactForm
        key={driver.id}
        driverId={driver.id}
        initial={{
          phone: personal.phone ?? '',
          email: personal.email ?? '',
          mercadoPagoEmail: documents.mercadoPagoEmail ?? '',
        }}
      />

      <Section title={t('profile.vehicle')}>
        {vehicle.photoUrl ? <Image source={{ uri: vehicle.photoUrl }} style={styles.vehiclePhoto} /> : null}
        <Row label={t('history.category')} value={t(`category.${vehicle.category}`)} />
        <Row label={t('profile.plate')} value={vehicle.plate} />
        <Row label={t('profile.brandModel')} value={`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim()} />
        <Row label={t('profile.year')} value={String(vehicle.year ?? '—')} />
        <Row label={t('profile.color')} value={t(`color.${vehicle.color}`)} />
        <Row label={t('profile.capacity')} value={String(vehicle.capacity ?? '—')} />
      </Section>

      <Section title={t('profile.documents')}>
        <Row label={t('profile.licenseNumber')} value={documents.licenseNumber} />
        <Row label={t('profile.license')} value={license.text} tone={license.tone} />
        <Row label="SOAT" value={soat.text} tone={soat.tone} />
        <Row label={t('profile.rtm')} value={rtm.text} tone={rtm.tone} />
        <Text style={styles.note}>{t('profile.reviewNote')}</Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.border },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  status: { fontSize: 14, color: colors.success, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 15, color: colors.textMuted, flexShrink: 1 },
  value: { fontSize: 15, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  good: { color: colors.success },
  bad: { color: colors.error },
  vehiclePhoto: { width: '100%', height: 160, borderRadius: 10, backgroundColor: colors.border },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
