// AI-assisted: see docs/AI_LOG.md #3
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

// Etiqueta + control + mensaje debajo: el error reemplaza la ayuda (nunca un Alert)
export default function FormField({ label, error, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  error: { fontSize: 13, color: colors.error, marginTop: 6 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
});
