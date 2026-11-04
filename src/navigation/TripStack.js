// AI-assisted: see docs/AI_LOG.md #2
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Placeholder from '../screens/Placeholder';

const Stack = createNativeStackNavigator();

export default function TripStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Placeholder} />
      <Stack.Screen name="IncomingRequest" component={Placeholder} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TripInProgress" component={Placeholder} />
      <Stack.Screen name="TripSummary" component={Placeholder} />
    </Stack.Navigator>
  );
}
