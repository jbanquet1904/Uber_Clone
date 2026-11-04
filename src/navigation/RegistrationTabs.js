// AI-assisted: see docs/AI_LOG.md #2, #3
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Placeholder from '../screens/Placeholder';
import PersonalDataScreen from '../screens/registration/PersonalDataScreen';
import { RegistrationProvider, useRegistration } from '../context/RegistrationContext';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

// La pestaña muestra un check verde cuando todos sus campos son válidos
const tabIcon = (name, complete) =>
  function TabIcon({ color, size }) {
    return <Ionicons name={complete ? 'checkmark-circle' : name} size={size} color={complete ? colors.success : color} />;
  };

function RegistrationTabNavigator() {
  const { isPersonalValid } = useRegistration();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="PersonalData"
        component={PersonalDataScreen}
        options={{ title: 'Datos personales', tabBarIcon: tabIcon('person-outline', isPersonalValid) }}
      />
      <Tab.Screen name="Vehicle" component={Placeholder} options={{ title: 'Vehículo', tabBarIcon: tabIcon('car-outline', false) }} />
      <Tab.Screen
        name="Documents"
        component={Placeholder}
        options={{ title: 'Documentos', tabBarIcon: tabIcon('document-text-outline', false) }}
      />
    </Tab.Navigator>
  );
}

// El Provider envuelve las tres pestañas para que compartan los datos del registro
export default function RegistrationTabs() {
  return (
    <RegistrationProvider>
      <RegistrationTabNavigator />
    </RegistrationProvider>
  );
}
