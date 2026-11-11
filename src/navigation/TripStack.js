// AI-assisted: see docs/AI_LOG.md #2, #10
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Placeholder from '../screens/Placeholder';
import HomeScreen from '../screens/trip/HomeScreen';

const Stack = createNativeStackNavigator();

export default function TripStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="IncomingRequest" component={Placeholder} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TripInProgress" component={Placeholder} />
      <Stack.Screen name="TripSummary" component={Placeholder} />
    </Stack.Navigator>
  );
}
