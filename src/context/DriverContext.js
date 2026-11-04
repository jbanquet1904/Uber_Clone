// AI-assisted: see docs/AI_LOG.md #2
import { createContext, useContext, useMemo, useState } from 'react';

const DriverContext = createContext(null);

export function DriverProvider({ children }) {
  const [driver, setDriver] = useState(null);       // null = no registrado
  const [activeTrip, setActiveTrip] = useState(null);

  const value = useMemo(
    () => ({ driver, setDriver, activeTrip, setActiveTrip }),
    [driver, activeTrip]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver debe usarse dentro de DriverProvider');
  return ctx;
}
