// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';

export default function CobroScreen() {
  return (
    <PlaceholderScreen
      title="Cobro y resumen"
      description="Tarifa final, comisión, ganancia neta y estado del pago (Aprobado, Pendiente, Rechazado o Efectivo)."
      actions={[{ label: 'Volver al inicio', onPress: () => router.dismissTo('/viaje') }]}
    />
  );
}
