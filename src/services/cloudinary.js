// AI-assisted: see docs/AI_LOG.md #8
import { File } from 'expo-file-system';

// El nombre de la nube y un preset sin firma están hechos para ser públicos (no son secretos como un access_token)
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn('Cloudinary: faltan valores en el .env. Revisa el archivo y reinicia con npx expo start -c.');
}

export async function uploadImage(uri, { folder, timeoutMs = 30000 } = {}) {
  // En SDK 58 el fetch global es el de Expo y no acepta { uri, name, type } en el FormData.
  // File (expo-file-system) lee el file:// del teléfono y trae su nombre y su tipo (image/jpeg)
  const file = new File(uri);
  if (!file.exists) throw new Error(`La foto ya no está en el teléfono: ${uri}`);

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  if (folder) form.append('folder', folder);

  // fetch no tiene timeout propio: con mala señal se quedaría esperando para siempre
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Sin header Content-Type: fetch lo arma solo con el boundary que separa las partes
    const response = await fetch(UPLOAD_URL, { method: 'POST', body: form, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? `Cloudinary respondió ${response.status}`);
    return { url: data.secure_url, publicId: data.public_id };
  } finally {
    clearTimeout(timer);
  }
}
