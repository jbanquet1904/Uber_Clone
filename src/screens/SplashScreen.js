// AI-assisted: see docs/AI_LOG.md #9
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Se ve mientras AsyncStorage responde si hay una sesión guardada
export default function SplashScreen() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
