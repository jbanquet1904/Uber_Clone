// AI-assisted: see docs/AI_LOG.md #6
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

// React Native no trae checkbox: el Pressable envuelve el ícono y el texto, así todo es tocable
export default function CheckboxField({ checked, onChange, error, children }) {
  return (
    <View style={styles.field}>
      <Pressable
        style={styles.row}
        onPress={() => onChange(!checked)}
        // VoiceOver lo anuncia como casilla marcada o sin marcar
        role="checkbox"
        aria-checked={checked}
        hitSlop={6}
      >
        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={error ? colors.error : colors.primary} />
        <Text style={styles.text}>{children}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  text: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  error: { fontSize: 13, color: colors.error, marginTop: 6 },
});
