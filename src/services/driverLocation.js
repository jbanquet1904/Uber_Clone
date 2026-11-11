// AI-assisted: see docs/AI_LOG.md #10
import { doc, GeoPoint, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/configFireBase';

// Colección aparte y no drivers/{id}: ese documento tiene datos personales y ya tiene un listener en DriverContext
const locationRef = (driverId) => doc(db, 'driverLocations', driverId);

// updatedAt con la hora del servidor y no del teléfono: es el "latido" que dice si el conductor sigue vivo
export const publishLocation = (driverId, { latitude, longitude, heading }) =>
  setDoc(locationRef(driverId), {
    driverId,
    available: true,
    location: new GeoPoint(latitude, longitude),
    heading: heading != null && heading >= 0 ? heading : null, // iOS da -1 si no hay rumbo
    updatedAt: serverTimestamp(),
  });

export const markUnavailable = (driverId) =>
  setDoc(locationRef(driverId), {
    driverId,
    available: false,
    location: null, // si no está disponible, nadie necesita saber dónde está
    heading: null,
    updatedAt: serverTimestamp(),
  });
