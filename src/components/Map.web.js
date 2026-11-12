// AI-assisted: see docs/AI_LOG.md #12
// Reemplazo para web: react-native-maps solo existe en iOS y Android. Así la app abre en el navegador sin el mapa
import { useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function MapView({ style, ref }) {
  // Los métodos que usan las pantallas existen, pero no hacen nada
  useImperativeHandle(ref, () => ({ animateToRegion() {}, fitToCoordinates() {} }), []);
  return (
    <View style={[style, styles.map]}>
      <Text style={styles.text}>Mapa no disponible en web</Text>
    </View>
  );
}

export const Marker = () => null;
export const Polyline = () => null;

const styles = StyleSheet.create({
  map: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textMuted, fontSize: 14 },
});
