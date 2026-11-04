// AI-assisted: see docs/AI_LOG.md #2
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDriver } from '../context/DriverContext';
import RegistrationTabs from './RegistrationTabs';
import DrawerNavigator from './DrawerNavigator';
import Placeholder from '../screens/Placeholder';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { driver } = useDriver();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!driver ? (
        <Stack.Screen name="Registration" component={RegistrationTabs} />
      ) : driver.status === 'pending' ? (
        <Stack.Screen name="Pending" component={Placeholder} />
      ) : (
        <Stack.Screen name="Main" component={DrawerNavigator} />
      )}
    </Stack.Navigator>
  );
}
