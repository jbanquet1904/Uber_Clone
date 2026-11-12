// AI-assisted: see docs/AI_LOG.md #2, #14, #15
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useI18n } from '../i18n';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../theme';
import HistoryStack from './HistoryStack';
import TripStack from './TripStack';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { t } = useI18n();
  return (
    <Drawer.Navigator screenOptions={{ drawerActiveTintColor: colors.primary, headerTintColor: colors.primary }}>
      <Drawer.Screen name="Trip" component={TripStack} options={{ title: t('drawer.home') }} />
      <Drawer.Screen name="History" component={HistoryStack} options={{ title: t('drawer.history'), headerShown: false }} />
      <Drawer.Screen name="Earnings" component={EarningsScreen} options={{ title: t('drawer.earnings') }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: t('drawer.profile') }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: t('drawer.settings') }} />
    </Drawer.Navigator>
  );
}
