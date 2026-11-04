// AI-assisted: see docs/AI_LOG.md #2
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DriverContext = createContext(null);

// Estado de la cuenta: sin registro, pendiente de aprobación o aprobada
export const REGISTRATION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
};

export function DriverProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(REGISTRATION_STATUS.NONE);
  const [activeTrip, setActiveTrip] = useState(null);

  // Al enviar el registro la cuenta queda pendiente hasta que se apruebe en la base de datos
  const submitRegistration = useCallback((data) => {
    setDriver(data ?? null);
    setRegistrationStatus(REGISTRATION_STATUS.PENDING);
  }, []);

  const signOut = useCallback(() => {
    setDriver(null);
    setRegistrationStatus(REGISTRATION_STATUS.NONE);
    setActiveTrip(null);
  }, []);

  const value = useMemo(
    () => ({ driver, registrationStatus, activeTrip, setActiveTrip, submitRegistration, signOut }),
    [driver, registrationStatus, activeTrip, submitRegistration, signOut]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('useDriver debe usarse dentro de DriverProvider');
  return context;
}
