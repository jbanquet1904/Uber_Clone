// AI-assisted: see docs/AI_LOG.md #3, #5
import { useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import FormField from './FormField';
import { colors } from '../../theme';

function PhotoButton({ icon, text, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

// Foto desde cámara o galería. Si niegan el permiso, el aviso sale debajo del campo
export default function PhotoField({ label, value, onChange, error, hint, aspect = [4, 3], circular = false, emptyIcon = 'image-outline' }) {
  const [permissionError, setPermissionError] = useState('');

  const pick = async (source) => {
    Keyboard.dismiss(); // igual que en la fecha: el teclado no debe quedar abierto encima
    setPermissionError('');
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPermissionError(
        source === 'camera'
          ? 'La app no tiene permiso para usar la cámara. Actívalo en Ajustes.'
          : 'La app no tiene permiso para ver tus fotos. Actívalo en Ajustes.'
      );
      return;
    }

    // mediaTypes como arreglo: MediaTypeOptions está deprecado en SDK 58
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets?.length) onChange(result.assets[0].uri);
  };

  const frame = circular ? styles.avatar : [styles.photo, { aspectRatio: aspect[0] / aspect[1] }];
  const message = error || permissionError;

  return (
    <FormField label={label} error={message} hint={hint}>
      <View style={circular ? styles.row : null}>
        {value ? (
          <Image source={{ uri: value }} style={frame} />
        ) : (
          <View style={[frame, styles.empty, message && styles.emptyError]}>
            <Ionicons name={emptyIcon} size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={circular ? styles.buttonsColumn : styles.buttonsRow}>
          <PhotoButton icon="camera-outline" text="Tomar foto" onPress={() => pick('camera')} />
          <PhotoButton icon="images-outline" text="Elegir de galería" onPress={() => pick('library')} />
        </View>
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  photo: { width: '100%', borderRadius: 10 },
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyError: { borderColor: colors.error },
  buttonsColumn: { flex: 1, gap: 8 },
  buttonsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
