// AI-assisted: see docs/AI_LOG.md #2
import { View, Text, Button } from 'react-native';
import { useDriver } from '../context/DriverContext';

export default function Placeholder({ route, navigation }) {
  const { setDriver } = useDriver();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Text style={{ fontSize: 20 }}>{route.name}</Text>
      {/* Botones temporales para probar el flujo; se borran después */}
      <Button title="Simular registro" onPress={() => setDriver({ status: 'pending' })} />
      <Button title="Simular aprobación" onPress={() => setDriver({ status: 'approved' })} />
      <Button title="Cerrar sesión" onPress={() => setDriver(null)} />
    </View>
  );
}
