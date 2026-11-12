// AI-assisted: see docs/AI_LOG.md #15
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/configFireBase';

// Solo los datos de contacto se editan. Vehículo y documentos cambian lo que se aprobó: requerirían otra revisión
export const updateContact = (driverId, { phone, email, mercadoPagoEmail }) =>
  updateDoc(doc(db, 'drivers', driverId), {
    'personal.phone': phone,
    'personal.email': email.trim(),
    'documents.mercadoPagoEmail': mercadoPagoEmail.trim(),
  });

// Volver a entrar después de cerrar sesión. Sin Firebase Auth no hay contraseña: se pide el documento y el celular.
// Es una limitación de seguridad conocida del proyecto; la solución real es Firebase Auth (por ejemplo, con SMS)
export async function findDriver(documentNumber, phone) {
  // Una sola igualdad: Firestore la resuelve con el índice automático, sin índice compuesto
  const snap = await getDocs(query(collection(db, 'drivers'), where('personal.documentNumber', '==', documentNumber)));
  const matches = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((driver) => driver.personal?.phone === phone)
    // Si hay varios registros de prueba con el mismo documento, el más reciente
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return matches[0] ?? null;
}
