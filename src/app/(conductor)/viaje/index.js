// AI-assisted: see docs/AI_LOG.md #2
import { Text } from 'react-native';
import { router } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import { REGISTRATION_STATUS, useDriver } from '../../../context/DriverContext';
import { colors } from '../../../theme';

const STATUS_LABELS = {
  [REGISTRATION_STATUS.NONE]: 'Sin registro',
  [REGISTRATION_STATUS.PENDING]: 'Pendiente de aprobación',
  [REGISTRATION_STATUS.APPROVED]: 'Aprobado',
};

export default function InicioScreen() {
  const { registrationStatus } = useDriver();

  return (
    <PlaceholderScreen
      title="Inicio"
      description="Mapa con tu ubicación actual y el interruptor Disponible / No disponible."
      actions={[{ label: 'Simular solicitud entrante', onPress: () => router.push('/viaje/solicitud') }]}
    >
      <Text style={{ fontSize: 15, color: colors.text }}>
        Estado de la cuenta: <Text style={{ fontWeight: '700' }}>{STATUS_LABELS[registrationStatus]}</Text>
      </Text>
    </PlaceholderScreen>
  );
}
