// AI-assisted: see docs/AI_LOG.md #7
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Los valores salen del .env. Expo solo reemplaza process.env.EXPO_PUBLIC_X
// escrito así, completo: process.env[nombre] no funciona.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.keys(firebaseConfig).filter((key) => !firebaseConfig[key]);
if (missing.length > 0) {
  console.warn(
    `Firebase: faltan valores en el .env (${missing.join(', ')}). ` +
      'Revisa el archivo y reinicia con "npx expo start -c".'
  );
}

// Con Fast Refresh este archivo se vuelve a ejecutar; si la app ya existe, se reutiliza.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
