// AI-assisted: see docs/AI_LOG.md #2
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Placeholder from '../screens/Placeholder';

const Tab = createBottomTabNavigator();

export default function RegistrationTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="PersonalData" component={Placeholder} options={{ title: 'Datos personales' }} />
      <Tab.Screen name="Vehicle" component={Placeholder} options={{ title: 'Vehículo' }} />
      <Tab.Screen name="Documents" component={Placeholder} options={{ title: 'Documentos' }} />
    </Tab.Navigator>
  );
}
