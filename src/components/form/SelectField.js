// AI-assisted: see docs/AI_LOG.md #3, #4
import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormField from './FormField';
import { formStyles } from './formStyles';
import { colors } from '../../theme';

// Lista desplegable con una hoja que sube desde abajo; igual en Android e iOS
export default function SelectField({ label, value, options, onChange, error, hint, placeholder = 'Selecciona una opción' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const choose = (newValue) => {
    onChange(newValue);
    setOpen(false);
  };

  const openList = () => {
    Keyboard.dismiss(); // si vienes del celular, el teclado quedaría encima de la hoja
    setOpen(true);
  };

  return (
    <FormField label={label} error={error} hint={hint}>
      <Pressable style={[formStyles.input, formStyles.row, error && formStyles.inputError]} onPress={openList}>
        <Text style={selected ? formStyles.value : formStyles.placeholder}>{selected ? selected.label : placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {/* onPress vacío para que tocar dentro de la hoja no la cierre */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{label}</Text>
            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable key={option.value} style={styles.option} onPress={() => choose(option.value)}>
                    <Text style={[styles.optionText, active && styles.optionActive]}>{option.label}</Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </FormField>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28,36,48,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '60%',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 16, color: colors.text },
  optionActive: { fontWeight: '700' },
});
