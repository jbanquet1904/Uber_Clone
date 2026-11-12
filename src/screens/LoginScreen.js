// AI-assisted: see docs/AI_LOG.md #15
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import FormScreen from '../components/FormScreen';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/form/TextField';
import { useDriver } from '../context/DriverContext';
import { SUPPORTED_LANGUAGES, useI18n } from '../i18n';
import { findDriver } from '../services/driverAccount';
import { colors } from '../theme';
import { isValidPhone, onlyDigits } from '../utils/registrationValidators';

// Volver a entrar después de cerrar sesión, con el documento y el celular del registro
export default function LoginScreen({ navigation }) {
  const { t, setLanguage } = useI18n();
  const { startSession } = useDriver();
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const phoneRef = useRef(null);

  const valid = /^\d{6,10}$/.test(documentNumber) && isValidPhone(phone);

  const login = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const found = await findDriver(documentNumber, phone);
      if (!found) {
        setError(t('login.notFound'));
        setLoading(false);
        return;
      }
      if (SUPPORTED_LANGUAGES.includes(found.personal?.language)) setLanguage(found.personal.language);
      // startSession cambia el grupo de pantallas: esta se desmonta, no hay que volver a habilitar el botón
      await startSession({ id: found.id, status: found.status });
    } catch (err) {
      console.warn('No se pudo ingresar:', err);
      setError(t('login.error'));
      setLoading(false);
    }
  };

  return (
    <FormScreen
      notice={error}
      footer={<PrimaryButton title={loading ? t('login.loading') : t('login.submit')} onPress={login} disabled={!valid || loading} />}
    >
      <Text style={styles.intro}>{t('login.intro')}</Text>
      <TextField
        label={t('profile.document')}
        value={documentNumber}
        onChangeText={(text) => setDocumentNumber(onlyDigits(text))}
        keyboardType="number-pad"
        maxLength={10}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label={t('profile.phone')}
        value={phone}
        onChangeText={(text) => setPhone(onlyDigits(text))}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
        <Text style={styles.link}>{t('login.register')}</Text>
      </Pressable>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: 18 },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary, textAlign: 'center', marginTop: 8 },
});
