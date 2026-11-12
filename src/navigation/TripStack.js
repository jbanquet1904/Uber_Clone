// AI-assisted: see docs/AI_LOG.md #2, #10, #11, #12
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDriver } from '../context/DriverContext';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/trip/HomeScreen';
import TripScreen from '../screens/trip/TripScreen';
import TripSummaryScreen from '../screens/trip/TripSummaryScreen';

const Stack = createNativeStackNavigator();

// Navegación condicional, igual que RootNavigator: el status del viaje decide la pantalla, no un navigate().
// La solicitud entrante no es una pantalla: es una tarjeta sobre el mapa de Inicio (ver HomeScreen)
export default function TripStack() {
  const { activeTripId, activeTrip } = useDriver();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!activeTripId ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : !activeTrip ? (
        // Hay un viaje guardado pero todavía no llega de Firestore
        <Stack.Screen name="TripLoading" component={SplashScreen} />
      ) : activeTrip.status === 'completed' || activeTrip.status === 'paid' ? (
        <Stack.Screen name="TripSummary" component={TripSummaryScreen} />
      ) : (
        <Stack.Screen name="TripInProgress" component={TripScreen} />
      )}
    </Stack.Navigator>
  );
}
