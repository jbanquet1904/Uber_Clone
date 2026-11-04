// AI-assisted: see docs/AI_LOG.md #2
import { Redirect } from 'expo-router';
import { REGISTRATION_STATUS, useDriver } from '../context/DriverContext';

export default function Index() {
  const { registrationStatus } = useDriver();

  // Sin registro el conductor empieza por las pestañas; con el registro enviado entra a la app
  return <Redirect href={registrationStatus === REGISTRATION_STATUS.NONE ? '/registro/personal' : '/viaje'} />;
}
