// AI-assisted: see docs/AI_LOG.md #2, #9, #15
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDriver } from '../context/DriverContext';
import { useI18n } from '../i18n';
import RegistrationTabs from './RegistrationTabs';
import DrawerNavigator from './DrawerNavigator';
import SplashScreen from '../screens/SplashScreen';
import AccountStatusScreen from '../screens/AccountStatusScreen';
import LoginScreen from '../screens/LoginScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { driver, restoring } = useDriver();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {restoring ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !driver ? (
        // Mismo grupo (sin sesión): aquí sí se navega entre las dos con navigate / goBack
        <>
          <Stack.Screen name="Registration" component={RegistrationTabs} />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: true, title: t('login.title'), headerTintColor: colors.primary }}
          />
        </>
      ) : driver.status === 'approved' ? (
        // Lista blanca (fail-closed): solo "approved" entra a la app; cualquier otro valor se queda afuera
        <Stack.Screen name="Main" component={DrawerNavigator} />
      ) : (
        <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
      )}
    </Stack.Navigator>
  );
}
