// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';

export default function PersonalScreen() {
  return (
    <PlaceholderScreen
      title="Pestaña 1 — Datos personales"
      description="Foto de perfil, nombre, documento, celular, fecha de nacimiento, género, correo e idioma."
      actions={[{ label: 'Siguiente: Vehículo', onPress: () => router.navigate('/registro/vehiculo') }]}
    />
  );
}
