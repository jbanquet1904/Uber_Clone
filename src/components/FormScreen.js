// AI-assisted: see docs/AI_LOG.md #3
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors } from '../theme';

// Formulario con scroll que se corre cuando aparece el teclado, y un pie fijo para el botón
export default function FormScreen({ children, footer, notice }) {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? (
        <View style={styles.footer}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  notice: { color: colors.error, fontSize: 13, marginBottom: 10, textAlign: 'center' },
});
