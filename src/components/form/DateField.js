// AI-assisted: see docs/AI_LOG.md #3
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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

  return (
    <FormField label={label} error={error} hint={hint}>
      <Pressable style={[formStyles.input, formStyles.row, error && formStyles.inputError]} onPress={() => setOpen(true)}>
        <Text style={value ? formStyles.value : formStyles.placeholder}>{value ? formatDate(value) : 'Selecciona una fecha'}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View style={isIOS ? styles.iosContainer : null}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={isIOS ? 'spinner' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onValueChange={handleValueChange}
            onDismiss={close}
            locale="es-CO"
            themeVariant="light"
          />
          {isIOS && (
            <Pressable style={styles.done} onPress={confirmIOS}>
              <Text style={styles.doneText}>Listo</Text>
            </Pressable>
          )}
        </View>
      )}
    </FormField>
  );
}

const styles = StyleSheet.create({
  iosContainer: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 },
  doneText: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
