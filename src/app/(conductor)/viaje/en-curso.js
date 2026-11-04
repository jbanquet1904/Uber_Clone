// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';

export default function EnCursoScreen() {
  return (
    <PlaceholderScreen
      title="Viaje en curso"
      description="Ruta hacia el punto de recogida; con Pasajero a bordo la ruta cambia hacia el destino."
      actions={[{ label: 'Finalizar viaje', onPress: () => router.replace('/viaje/cobro') }]}
    />
  );
}
