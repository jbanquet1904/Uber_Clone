// AI-assisted: see docs/AI_LOG.md #2
import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme';

// El Stack está dentro del Drawer: getParent() es el Drawer, así el botón lo abre directamente
function MenuButton({ navigation }) {
  return (
    <Pressable
      onPress={() => navigation.getParent()?.openDrawer()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      style={{ paddingRight: 16 }}
    >
      <Ionicons name="menu" size={24} color={colors.text} />
    </Pressable>
  );
}

// Stack del flujo del viaje: inicio → solicitud → viaje en curso → cobro
export default function ViajeLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen
        name="index"
        options={({ navigation }) => ({ title: 'Inicio', headerLeft: () => <MenuButton navigation={navigation} /> })}
      />
      <Stack.Screen name="solicitud" options={{ title: 'Solicitud entrante' }} />
      <Stack.Screen name="en-curso" options={{ title: 'Viaje en curso' }} />
      <Stack.Screen name="cobro" options={{ title: 'Cobro y resumen' }} />
    </Stack>
  );
}
