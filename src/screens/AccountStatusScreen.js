// AI-assisted: see docs/AI_LOG.md #9
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { useDriver } from '../context/DriverContext';
import { colors } from '../theme';

const CONTENT = {
  pending: {
    icon: 'hourglass-outline',
    color: colors.primary,
    title: 'Tu registro está en revisión',
    text: 'Estamos verificando tus datos y documentos. Mientras tanto no puedes ponerte Disponible. Esta pantalla cambia sola cuando tu cuenta sea aprobada.',
  },
  rejected: {
    icon: 'close-circle-outline',
    color: colors.error,
    title: 'Tu registro no fue aprobado',
    text: 'Revisa el motivo y haz un nuevo registro con los datos corregidos.',
  },
};

// Cualquier otro status (o uno mal escrito) cae aquí y no entra a la app
const UNKNOWN = {
  icon: 'help-circle-outline',
  color: colors.textMuted,
  title: 'Cuenta no habilitada',
  text: 'Tu cuenta no está habilitada para conducir en este momento.',
};

// Una sola pantalla para todo lo que no es "approved": pendiente, rechazado o desconocido
export default function AccountStatusScreen() {
  const { driver, connection, endSession } = useDriver();
  // Al cerrar la sesión driver pasa a null un instante antes de que el navegador quite esta pantalla
  if (!driver) return null;

  const content = CONTENT[driver.status] ?? UNKNOWN;
  const isRejected = driver.status === 'rejected';

  // Sin inicio de sesión no hay forma de volver a esta solicitud: por eso se confirma y se explica la consecuencia
  const confirmRestart = () => {
    Alert.alert(
      'Empezar de nuevo',
      'Tu solicitud actual dejará de estar asociada a este teléfono y tendrás que llenar el registro otra vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Empezar de nuevo', style: 'destructive', onPress: () => endSession() },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <Ionicons name={content.icon} size={72} color={content.color} />
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.text}>{content.text}</Text>

      {isRejected && driver.rejectionReason ? <Text style={styles.reason}>Motivo: {driver.rejectionReason}</Text> : null}

      {driver.status === 'pending' && connection === 'online' && (
        <View style={styles.live}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.liveText}>Esperando aprobación…</Text>
        </View>
      )}

      {connection !== 'online' && (
        <Text style={styles.warning}>
          {connection === 'offline'
            ? 'Sin conexión: se muestra el último estado conocido.'
            : 'No pudimos consultar el estado de tu cuenta. Revisa tu conexión y vuelve a abrir la app.'}
        </Text>
      )}

      <View style={styles.actions}>
        {isRejected ? (
          <PrimaryButton title="Hacer un nuevo registro" onPress={() => endSession()} />
        ) : (
          <Pressable onPress={confirmRestart} hitSlop={8}>
            <Text style={styles.secondary}>Cancelar y empezar de nuevo</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 16 },
  text: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  reason: { fontSize: 15, color: colors.error, textAlign: 'center', marginTop: 16 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  liveText: { fontSize: 14, color: colors.primary },
  warning: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  actions: { alignSelf: 'stretch', alignItems: 'center', marginTop: 40 },
  secondary: { fontSize: 15, fontWeight: '600', color: colors.error },
});
