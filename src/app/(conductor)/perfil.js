// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';
import { useDriver } from '../../context/DriverContext';

export default function PerfilScreen() {
  const { signOut } = useDriver();

  const handleSignOut = () => {
    signOut();
    router.replace('/registro/personal');
  };

  return (
    <PlaceholderScreen
      title="Perfil y configuración"
      description="Datos editables, vehículo, documentos, idioma y cierre de sesión."
      actions={[{ label: 'Cerrar sesión', onPress: handleSignOut, secondary: true }]}
    />
  );
}
