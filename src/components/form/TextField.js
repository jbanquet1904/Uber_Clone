// AI-assisted: see docs/AI_LOG.md #3
import { TextInput } from 'react-native';
import FormField from './FormField';
import { formStyles } from './formStyles';
import { colors } from '../../theme';

// En React 19 el ref llega como prop normal y pasa al TextInput con el resto de props
export default function TextField({ label, error, hint, ...inputProps }) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <TextInput
        style={[formStyles.input, error && formStyles.inputError]}
        placeholderTextColor={colors.textMuted}
        {...inputProps}
      />
    </FormField>
  );
}
