// AI-assisted: see docs/AI_LOG.md #2
import { useMemo } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import { calculateFare } from '../../../utils/calculateFare';
import { formatCOP } from '../../../utils/formatCOP';
import { colors } from '../../../theme';

// Viaje de ejemplo de la sección 5 del PDF, para comprobar calculateFare en el celular
const SAMPLE_TRIP = { distanceKm: 8.5, durationMin: 22, category: 'economy' };

export default function SolicitudScreen() {
  const estimate = useMemo(() => calculateFare(SAMPLE_TRIP), []);

  return (
    <PlaceholderScreen
      title="Solicitud entrante"
      description="Origen, destino, distancia, duración, categoría, método de pago, tarifa y ganancia estimadas, con 15 segundos para responder."
      actions={[
        { label: 'Aceptar', onPress: () => router.replace('/viaje/en-curso') },
        { label: 'Rechazar', onPress: () => router.back(), secondary: true },
      ]}
    >
      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text }}>
        Ejemplo 8,5 km · 22 min · Económico{'\n'}
        Tarifa: {formatCOP(estimate.fare)}{'\n'}
        Comisión: {formatCOP(estimate.commission)}{'\n'}
        Ganancia neta: {formatCOP(estimate.driverEarnings)}
      </Text>
    </PlaceholderScreen>
  );
}
