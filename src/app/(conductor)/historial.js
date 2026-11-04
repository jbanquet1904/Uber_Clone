// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';

export default function HistorialScreen() {
  return (
    <PlaceholderScreen
      title="Historial de carreras"
      description="Lista del viaje más reciente al más antiguo, con filtros Hoy, Semana, Mes, Rango de fechas y método de pago."
      actions={[{ label: 'Ver un viaje de ejemplo', onPress: () => router.push('/carrera/ejemplo') }]}
    />
  );
}
