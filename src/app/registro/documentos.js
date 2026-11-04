// AI-assisted: see docs/AI_LOG.md #2
import { router } from 'expo-router';
import PlaceholderScreen from '../../components/PlaceholderScreen';
import { useDriver } from '../../context/DriverContext';

export default function DocumentosScreen() {
  const { submitRegistration } = useDriver();

  const handleSubmit = () => {
    submitRegistration();
    router.replace('/viaje');
  };

  return (
    <PlaceholderScreen
      title="Pestaña 3 — Documentos y pagos"
      description="Licencia, SOAT, revisión técnico-mecánica, correo de Mercado Pago y aceptación de términos."
      actions={[{ label: 'Enviar registro (simulado)', onPress: handleSubmit }]}
    />
  );
}
