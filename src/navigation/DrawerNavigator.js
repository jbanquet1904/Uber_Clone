// AI-assisted: see docs/AI_LOG.md #2
import { createDrawerNavigator } from '@react-navigation/drawer';
import TripStack from './TripStack';
import Placeholder from '../screens/Placeholder';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Trip" component={TripStack} options={{ title: 'Inicio' }} />
      <Drawer.Screen name="History" component={Placeholder} options={{ title: 'Historial' }} />
      <Drawer.Screen name="Earnings" component={Placeholder} options={{ title: 'Ganancias' }} />
      <Drawer.Screen name="Profile" component={Placeholder} options={{ title: 'Perfil' }} />
      <Drawer.Screen name="Settings" component={Placeholder} options={{ title: 'Configuración' }} />
    </Drawer.Navigator>
  );
}
