// AI-assisted: see docs/AI_LOG.md #14
import { DrawerToggleButton } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useI18n } from '../i18n';
import HistoryScreen from '../screens/history/HistoryScreen';
import TripDetailScreen from '../screens/history/TripDetailScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

// Lista → detalle. El encabezado lo pone este Stack (con el botón del menú en la lista), no el Drawer
export default function HistoryStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="HistoryList"
        component={HistoryScreen}
        options={{ title: t('drawer.history'), headerLeft: () => <DrawerToggleButton tintColor={colors.primary} /> }}
      />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: t('history.detailTitle') }} />
    </Stack.Navigator>
  );
}
