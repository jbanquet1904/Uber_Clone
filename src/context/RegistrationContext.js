// AI-assisted: see docs/AI_LOG.md #3
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { validatePersonal } from '../utils/registrationValidators';

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

// Las tres pestañas comparten este estado para que Enviar registro sepa si todo es válido
export function RegistrationProvider({ children }) {
  const [personal, setPersonal] = useState(INITIAL_PERSONAL);
  // Campos que el conductor ya usó: solo esos muestran su error
  const [touched, setTouched] = useState({ personal: {} });

  const updatePersonal = useCallback((field, value) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
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

  const value = useMemo(
    () => ({
      personal,
      personalErrors,
      isPersonalValid: Object.keys(personalErrors).length === 0,
      touched,
      updatePersonal,
      touchField,
      touchAll,
    }),
    [personal, personalErrors, touched, updatePersonal, touchField, touchAll]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration debe usarse dentro de RegistrationProvider');
  return ctx;
}
