// AI-assisted: see docs/AI_LOG.md #3, #5
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { validatePersonal, validateVehicle } from '../utils/registrationValidators';

const RegistrationContext = createContext(null);

const INITIAL_PERSONAL = {
  profilePhoto: null,
  fullName: '',
  documentNumber: '',
  phone: '',
  birthDate: null,
  gender: '',
  email: '',
  language: 'es',
};

const INITIAL_VEHICLE = {
  category: '', plate: '', brand: '', model: '', year: '', color: '', capacity: '', vehiclePhoto: null,
};

// Las tres pestañas comparten este estado para que Enviar registro sepa si todo es válido
export function RegistrationProvider({ children }) {
  const [personal, setPersonal] = useState(INITIAL_PERSONAL);
  const [vehicle, setVehicle] = useState(INITIAL_VEHICLE);
  // Campos que el conductor ya usó: solo esos muestran su error
  const [touched, setTouched] = useState({ personal: {}, vehicle: {} });

  const updatePersonal = useCallback((field, value) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateVehicle = useCallback((field, value) => {
    setVehicle((prev) => ({ ...prev, [field]: value }));
  }, []);

  const touchField = useCallback((section, field) => {
    setTouched((prev) => ({ ...prev, [section]: { ...prev[section], [field]: true } }));
  }, []);

  const touchAll = useCallback((section, fields) => {
    const all = Object.fromEntries(fields.map((field) => [field, true]));
    setTouched((prev) => ({ ...prev, [section]: { ...prev[section], ...all } }));
  }, []);

  // Los errores se recalculan solos cada vez que cambia un dato
  const personalErrors = useMemo(() => validatePersonal(personal), [personal]);
  // validateVehicle recibe category y capacity juntos: si cambia la categoría, el error de capacidad se recalcula solo
  const vehicleErrors = useMemo(() => validateVehicle(vehicle), [vehicle]);

  const value = useMemo(
    () => ({
      personal,
      personalErrors,
      isPersonalValid: Object.keys(personalErrors).length === 0,
      vehicle,
      vehicleErrors,
      isVehicleValid: Object.keys(vehicleErrors).length === 0,
      touched,
      updatePersonal,
      updateVehicle,
      touchField,
      touchAll,
    }),
    [personal, personalErrors, vehicle, vehicleErrors, touched, updatePersonal, updateVehicle, touchField, touchAll]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration debe usarse dentro de RegistrationProvider');
  return ctx;
}
