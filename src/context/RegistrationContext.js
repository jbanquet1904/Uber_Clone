// AI-assisted: see docs/AI_LOG.md #3, #5, #6
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { validateDocuments, validatePersonal, validateVehicle } from '../utils/registrationValidators';

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

const INITIAL_DOCUMENTS = {
  licenseNumber: '', licensePhoto: null, licenseExpiry: null,
  soatPhoto: null, soatExpiry: null,
  rtmPhoto: null, rtmExpiry: null,
  mercadoPagoEmail: '', acceptedTerms: false,
};

// Las tres pestañas comparten este estado para que Enviar registro sepa si todo es válido
export function RegistrationProvider({ children }) {
  const [personal, setPersonal] = useState(INITIAL_PERSONAL);
  const [vehicle, setVehicle] = useState(INITIAL_VEHICLE);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  // Campos que el conductor ya usó: solo esos muestran su error
  const [touched, setTouched] = useState({ personal: {}, vehicle: {}, documents: {} });

  const updatePersonal = useCallback((field, value) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateVehicle = useCallback((field, value) => {
    setVehicle((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateDocuments = useCallback((field, value) => {
    setDocuments((prev) => ({ ...prev, [field]: value }));
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
  // Dependen también del documento (pestaña 1) y del año (pestaña 2): si cambian allá, se recalculan aquí
  const documentsErrors = useMemo(
    () => validateDocuments(documents, { documentNumber: personal.documentNumber, vehicleYear: vehicle.year }),
    [documents, personal.documentNumber, vehicle.year]
  );

  const isPersonalValid = Object.keys(personalErrors).length === 0;
  const isVehicleValid = Object.keys(vehicleErrors).length === 0;
  const isDocumentsValid = Object.keys(documentsErrors).length === 0;

  // Cada pestaña pendiente lleva los campos con error, para marcarlos al ir a ella
  const pendingTabs = useMemo(
    () =>
      [
        !isPersonalValid && { route: 'PersonalData', section: 'personal', label: 'Datos personales', fields: Object.keys(personalErrors) },
        !isVehicleValid && { route: 'Vehicle', section: 'vehicle', label: 'Vehículo', fields: Object.keys(vehicleErrors) },
        !isDocumentsValid && { route: 'Documents', section: 'documents', label: 'Documentos y pagos', fields: Object.keys(documentsErrors) },
      ].filter(Boolean),
    [isPersonalValid, isVehicleValid, isDocumentsValid, personalErrors, vehicleErrors, documentsErrors]
  );

  const value = useMemo(
    () => ({
      personal,
      personalErrors,
      isPersonalValid,
      vehicle,
      vehicleErrors,
      isVehicleValid,
      documents,
      documentsErrors,
      isDocumentsValid,
      pendingTabs,
      touched,
      updatePersonal,
      updateVehicle,
      updateDocuments,
      touchField,
      touchAll,
    }),
    [
      personal, personalErrors, isPersonalValid,
      vehicle, vehicleErrors, isVehicleValid,
      documents, documentsErrors, isDocumentsValid,
      pendingTabs, touched,
      updatePersonal, updateVehicle, updateDocuments, touchField, touchAll,
    ]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration debe usarse dentro de RegistrationProvider');
  return ctx;
}
