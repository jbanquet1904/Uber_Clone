// AI-assisted: see docs/AI_LOG.md #3, #4
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import FormField from './FormField';
import { formStyles } from './formStyles';
import { colors } from '../../theme';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Formato propio para no depender de Intl en el celular: 3 de noviembre de 2000
const formatDate = (date) => `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;

export default function DateField({ label, value, onChange, onClose, error, hint, maximumDate, minimumDate, initialDate }) {
  const [open, setOpen] = useState(false);
  const isIOS = Platform.OS === 'ios';
  const pickerValue = value ?? initialDate ?? maximumDate ?? new Date();

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  // datetimepicker v9: onChange está deprecado, se usan onValueChange y onDismiss
  const handleValueChange = (_event, date) => {
    if (date) onChange(date);
    // En Android el selector es un diálogo que se cierra solo al elegir
    if (!isIOS) close();
  };

  // En iOS la rueda queda abierta hasta tocar Listo; si no la movió, se toma la fecha que estaba viendo
  const confirmIOS = () => {
    if (!value) onChange(pickerValue);
    close();
  };

  const openPicker = () => {
    Keyboard.dismiss(); // el phone-pad de iPhone no tiene tecla para cerrarse
    setOpen(true);
  };

  return (
    <FormField label={label} error={error} hint={hint}>
      <Pressable style={[formStyles.input, formStyles.row, error && formStyles.inputError]} onPress={openPicker}>
        <Text style={value ? formStyles.value : formStyles.placeholder}>{value ? formatDate(value) : 'Selecciona una fecha'}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </Pressable>

      {open && !isIOS && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onValueChange={handleValueChange}
          onDismiss={close}
        />
      )}

      {isIOS && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
          <View style={styles.overlay}>
            {/* Tocar el fondo oscuro cierra sin elegir */}
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Pressable onPress={confirmIOS} hitSlop={10}>
                  <Text style={styles.doneText}>Listo</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onValueChange={handleValueChange}
                locale="es-CO"
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}
    </FormField>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28,36,48,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  doneText: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
