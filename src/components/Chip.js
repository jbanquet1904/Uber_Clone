// AI-assisted: see docs/AI_LOG.md #14
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

// Botón de filtro: marcado o no marcado
export default function Chip({ label, selected, onPress, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  text: { fontSize: 14, color: colors.text, fontWeight: '500' },
  textSelected: { color: '#FFFFFF', fontWeight: '700' },
});
