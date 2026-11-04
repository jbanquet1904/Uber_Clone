// AI-assisted: see docs/AI_LOG.md #3
import { MAX_NAME_LENGTH, MIN_DRIVER_AGE } from '../config/registrationOptions';

// Letras con tildes, ñ y diéresis, más espacios
const LETTERS_AND_SPACES = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/;
// Algo antes de la @, un dominio y una extensión de al menos 2 letras: nombre@correo.com
const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

// Un TextInput siempre devuelve texto: se quitan letras, puntos y espacios
export const onlyDigits = (text) => text.replace(/\D/g, '');

const isEmpty = (value) => value === null || value === undefined || String(value).trim() === '';

// Compara año, mes y día: restar solo los años daría 18 a alguien que todavía no los cumple
export function calculateAge(birthDate, today = new Date()) {
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPending =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (birthdayPending) age -= 1;
  return age;
}

// Devuelve { campo: mensaje } solo con los campos que tienen error
export function validatePersonal(data, today = new Date()) {
  const errors = {};

  if (!data.profilePhoto) errors.profilePhoto = 'Agrega una foto de perfil.';

  const fullName = (data.fullName ?? '').trim();
  if (!fullName) errors.fullName = 'Escribe tu nombre completo.';
  else if (fullName.length > MAX_NAME_LENGTH) errors.fullName = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  else if (!LETTERS_AND_SPACES.test(fullName)) errors.fullName = 'Usa solo letras y espacios.';

  if (isEmpty(data.documentNumber)) errors.documentNumber = 'Escribe tu número de documento.';
  else if (!/^\d{6,10}$/.test(data.documentNumber)) errors.documentNumber = 'Debe tener entre 6 y 10 dígitos.';

  if (isEmpty(data.phone)) errors.phone = 'Escribe tu número de celular.';
  else if (!/^\d{10}$/.test(data.phone)) errors.phone = 'Debe tener 10 dígitos.';

  if (!data.birthDate) errors.birthDate = 'Selecciona tu fecha de nacimiento.';
  else if (calculateAge(data.birthDate, today) < MIN_DRIVER_AGE)
    errors.birthDate = `Debes tener ${MIN_DRIVER_AGE} años o más para registrarte.`;

  if (isEmpty(data.gender)) errors.gender = 'Selecciona una opción.';

  const email = (data.email ?? '').trim();
  if (!email) errors.email = 'Escribe tu correo electrónico.';
  else if (!EMAIL.test(email)) errors.email = 'Revisa el correo: debe tener @ y un dominio, como nombre@correo.com.';

  if (isEmpty(data.language)) errors.language = 'Selecciona un idioma.';

  return errors;
}
