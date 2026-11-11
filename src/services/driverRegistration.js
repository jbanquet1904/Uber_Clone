// AI-assisted: see docs/AI_LOG.md #8
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/configFireBase';
import { PRICING } from '../config/pricing';
import { requiresTechReview } from '../utils/registrationValidators';
import { uploadImage } from './cloudinary';

export class UploadError extends Error {
  constructor(failedLabels) {
    super(`No se pudieron subir: ${failedLabels.join(', ')}.`);
    this.name = 'UploadError';
    this.failedLabels = failedLabels;
  }
}

// cache: { [field]: { uri, url } }. Vive en un useRef de la pantalla, así sobrevive entre reintentos
async function uploadPhotos(photos, driverId, cache) {
  // Solo sube las que no han subido o las que el conductor cambió (otra uri)
  const pending = photos.filter(({ field, uri }) => cache[field]?.uri !== uri);

  // allSettled y no all: espera a todas y dice cuáles fallaron, sin perder las URLs de las que sí subieron
  const results = await Promise.allSettled(
    pending.map(({ uri }) => uploadImage(uri, { folder: `drivers/${driverId}` }))
  );

  const failed = [];
  results.forEach((result, i) => {
    const { field, uri, label } = pending[i];
    if (result.status === 'fulfilled') cache[field] = { uri, url: result.value.url };
    else {
      console.warn(`No subió ${label}:`, result.reason?.message);
      failed.push(label);
    }
  });

  if (failed.length) throw new UploadError(failed);
  return Object.fromEntries(photos.map(({ field }) => [field, cache[field].url]));
}

// ID creado en el teléfono, sin conexión. Se genera una sola vez y cada reintento reusa el mismo:
// setDoc sobrescribe ese documento en vez de crear otro conductor
export const newDriverId = () => doc(collection(db, 'drivers')).id;

// Firestore sin conexión NO falla: deja la escritura en cola y la promesa queda pendiente
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function submitRegistration({ driverId, personal, vehicle, documents, uploadCache }) {
  const needsRtm = requiresTechReview(vehicle.year);

  const photos = [
    { field: 'profile', uri: personal.profilePhoto, label: 'foto de perfil' },
    { field: 'vehicle', uri: vehicle.vehiclePhoto, label: 'foto del vehículo' },
    { field: 'license', uri: documents.licensePhoto, label: 'licencia' },
    { field: 'soat', uri: documents.soatPhoto, label: 'SOAT' },
    ...(needsRtm ? [{ field: 'rtm', uri: documents.rtmPhoto, label: 'revisión técnico-mecánica' }] : []),
  ];

  const urls = await uploadPhotos(photos, driverId, uploadCache);

  // Se separan las URI locales (file://) para que nunca lleguen a Firestore
  const { profilePhoto, ...personalData } = personal;
  const { vehiclePhoto, year, capacity, ...vehicleData } = vehicle;
  const { licensePhoto, soatPhoto, rtmPhoto, rtmExpiry, acceptedTerms, ...documentsData } = documents;

  // Los validadores aceptan " Juan " porque recortan al validar: aquí se guarda ya recortado.
  // Los Date (nacimiento y vencimientos) Firestore los convierte solo a Timestamp
  await withTimeout(
    setDoc(doc(db, 'drivers', driverId), {
      status: 'pending',
      personal: {
        ...personalData,
        fullName: personalData.fullName.trim(),
        email: personalData.email.trim(),
        photoUrl: urls.profile,
      },
      vehicle: {
        ...vehicleData,
        brand: vehicleData.brand.trim(),
        model: vehicleData.model.trim(),
        // Number y no el texto del input: así se puede filtrar y comparar en consultas
        year: Number(year),
        capacity: Number(capacity),
        photoUrl: urls.vehicle,
      },
      documents: {
        ...documentsData,
        mercadoPagoEmail: documentsData.mercadoPagoEmail.trim(),
        licensePhotoUrl: urls.license,
        soatPhotoUrl: urls.soat,
        // Firestore rechaza todo el setDoc si un campo vale undefined: lo opcional va en null
        rtmPhotoUrl: urls.rtm ?? null,
        rtmExpiry: needsRtm ? rtmExpiry : null,
      },
      // Queda constancia de la comisión que aceptó, aunque mañana cambie
      terms: { commissionRate: PRICING.commissionRate, acceptedAt: serverTimestamp() },
      createdAt: serverTimestamp(),
    }),
    15000
  );
}

// Traduce cada tipo de fallo a un mensaje que el conductor entienda
export function registrationErrorMessage(error) {
  if (error instanceof UploadError) {
    return `${error.message} Revisa tu conexión e intenta de nuevo; las fotos que ya subieron no se vuelven a subir.`;
  }
  if (error?.code === 'timeout' || error?.code === 'unavailable') {
    return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  }
  // El modo de prueba de Firestore vence a los 30 días y desde ahí todas las escrituras fallan con este código
  if (error?.code === 'permission-denied') {
    return 'El servidor rechazó el registro. Revisa las reglas de seguridad de Firestore.';
  }
  return 'No se pudo enviar el registro. Intenta de nuevo.';
}
