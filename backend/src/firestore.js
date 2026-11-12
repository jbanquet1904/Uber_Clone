// AI-assisted: see docs/AI_LOG.md #13
import { existsSync } from 'node:fs';

// Dos formas de conectarse a Firestore, con la misma interfaz para payments.js:
// 1) Firebase Admin con la cuenta de servicio (lo correcto en producción: permisos de administrador).
// 2) Si no hay cuenta de servicio, el SDK web con la misma configuración de la app (lee el .env de la raíz).
//    Funciona mientras las reglas de Firestore estén en modo de prueba; así el proyecto arranca sin pasos extra
export async function createDb(env = process.env) {
  const credentials = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentials && existsSync(credentials)) {
    const { applicationDefault, initializeApp } = await import('firebase-admin/app');
    const { FieldValue, getFirestore } = await import('firebase-admin/firestore');
    initializeApp({ credential: applicationDefault() });
    return { db: getFirestore(), serverTimestamp: () => FieldValue.serverTimestamp(), mode: 'admin' };
  }
  return createClientDb(env);
}

async function createClientDb(env) {
  const config = {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.projectId) throw new Error('No se encontró la configuración de Firebase: revisa el .env de la raíz del proyecto.');

  const { initializeApp } = await import('firebase/app');
  const { doc, getDoc, getFirestore, runTransaction, serverTimestamp, updateDoc } = await import('firebase/firestore');
  const firestore = getFirestore(initializeApp(config));
  const wrap = (snap) => ({ exists: snap.exists(), data: () => snap.data() });

  // Misma forma que firebase-admin: collection().doc().get()/update() y runTransaction(fn) con tx.get/tx.update
  const db = {
    collection: (name) => ({
      doc: (id) => {
        const ref = doc(firestore, name, id);
        return { ref, get: async () => wrap(await getDoc(ref)), update: (data) => updateDoc(ref, data) };
      },
    }),
    runTransaction: (fn) =>
      runTransaction(firestore, (tx) =>
        fn({ get: async (docRef) => wrap(await tx.get(docRef.ref)), update: (docRef, data) => tx.update(docRef.ref, data) })
      ),
  };
  return { db, serverTimestamp, mode: 'client' };
}
