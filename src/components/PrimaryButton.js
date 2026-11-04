// AI-assisted: see docs/AI_LOG.md #3
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export default function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  disabled: { backgroundColor: colors.border },
  pressed: { opacity: 0.85 },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textDisabled: { color: colors.textMuted },
});
