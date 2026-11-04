// AI-assisted: see docs/AI_LOG.md #2
import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';

export default function CarreraDetalleScreen() {
  const { id } = useLocalSearchParams();

  return (
    <PlaceholderScreen
      title={`Viaje ${id}`}
      description="Ruta dibujada en el mapa, duración, distancia, comisión, propina y calificación del pasajero."
    />
  );
}
