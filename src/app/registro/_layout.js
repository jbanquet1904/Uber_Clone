// AI-assisted: see docs/AI_LOG.md #2
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const tabIcon = (name) =>
  function TabIcon({ color, size }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export default function RegistroLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="personal"
        options={{ title: 'Datos personales', tabBarLabel: 'Personal', tabBarIcon: tabIcon('person-outline') }}
      />
      <Tabs.Screen name="vehiculo" options={{ title: 'Vehículo', tabBarIcon: tabIcon('car-outline') }} />
      <Tabs.Screen
        name="documentos"
        options={{ title: 'Documentos y pagos', tabBarLabel: 'Documentos', tabBarIcon: tabIcon('document-text-outline') }}
      />
    </Tabs>
  );
}
