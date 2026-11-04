// AI-assisted: see docs/AI_LOG.md #2
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Pantalla temporal del esqueleto: muestra su nombre y botones para probar la navegación
export default function PlaceholderScreen({ title, description, actions = [], children }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [styles.button, action.secondary && styles.buttonSecondary, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonText, action.secondary && styles.buttonTextSecondary]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  description: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
  actions: { marginTop: 12, gap: 10 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonTextSecondary: { color: colors.text },
  pressed: { opacity: 0.8 },
});
