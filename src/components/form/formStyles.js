// AI-assisted: see docs/AI_LOG.md #3
import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const formStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.textMuted },
});
