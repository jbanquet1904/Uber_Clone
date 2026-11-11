// AI-assisted: see docs/AI_LOG.md #2, #9
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDriver } from '../context/DriverContext';
import RegistrationTabs from './RegistrationTabs';
import DrawerNavigator from './DrawerNavigator';
import SplashScreen from '../screens/SplashScreen';
import AccountStatusScreen from '../screens/AccountStatusScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { driver, restoring } = useDriver();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {restoring ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !driver ? (
        <Stack.Screen name="Registration" component={RegistrationTabs} />
      ) : driver.status === 'approved' ? (
        // Lista blanca (fail-closed): solo "approved" entra a la app; cualquier otro valor se queda afuera
        <Stack.Screen name="Main" component={DrawerNavigator} />
      ) : (
        <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
      )}
    </Stack.Navigator>
  );
}
