// AI-assisted: see docs/AI_LOG.md #2
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const drawerIcon = (name) =>
  function DrawerIcon({ color, size }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export default function ConductorLayout() {
  return (
    <Drawer
      screenOptions={{
        headerTintColor: colors.text,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Inicio tiene su propio Stack (flujo del viaje), por eso oculta el encabezado del Drawer */}
      <Drawer.Screen
        name="viaje"
        options={{ title: 'Inicio', headerShown: false, drawerIcon: drawerIcon('map-outline') }}
      />
      <Drawer.Screen
        name="historial"
        options={{ title: 'Historial de carreras', drawerLabel: 'Historial', drawerIcon: drawerIcon('time-outline') }}
      />
      <Drawer.Screen name="ganancias" options={{ title: 'Ganancias', drawerIcon: drawerIcon('wallet-outline') }} />
      <Drawer.Screen
        name="perfil"
        options={{ title: 'Perfil y configuración', drawerIcon: drawerIcon('person-circle-outline') }}
      />
    </Drawer>
  );
}
