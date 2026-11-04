// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';

export default function VehiculoScreen() {
  return (
    <PlaceholderScreen
      title="Pestaña 2 — Vehículo"
      description="Categoría, placa, marca, modelo, año, color, capacidad y foto del vehículo."
      actions={[{ label: 'Siguiente: Documentos', onPress: () => router.navigate('/registro/documentos') }]}
    />
  );
}
