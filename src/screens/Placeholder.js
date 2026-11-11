// AI-assisted: see docs/AI_LOG.md #2, #9
import { Text, View } from 'react-native';

// Pantalla temporal: solo dice su nombre hasta que se haga la de verdad.
// Los botones de "Simular" se quitaron: ahora el estado lo manda Firestore
export default function Placeholder({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>{route.name}</Text>
    </View>
  );
}
