// AI-assisted: see docs/AI_LOG.md #2
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DriverProvider } from '../context/DriverContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DriverProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen
            name="carrera/[id]"
            options={{
              headerShown: true,
              title: 'Detalle del viaje',
              headerTintColor: colors.text,
              // Solo la flecha: si no, iOS mostraría "(conductor)" como texto de regreso
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: 'Historial',
            }}
          />
        </Stack>
      </DriverProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
