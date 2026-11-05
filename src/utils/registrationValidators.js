// AI-assisted: see docs/AI_LOG.md #3, #5
import {
  MAX_NAME_LENGTH, MIN_DRIVER_AGE,
  MIN_VEHICLE_YEAR, MAX_BRAND_MODEL_LENGTH, MAX_CAPACITY, MIN_CAPACITY_BY_CATEGORY,
} from '../config/registrationOptions';

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

// Placa de carro colombiana: 3 letras y 3 números, como ABC123
const PLATE = /^[A-Z]{3}\d{3}$/;

// Mayúsculas y sin espacios ni guiones: "abc-123" queda "ABC123"
export const normalizePlate = (text) => text.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function validateVehicle(data, today = new Date()) {
  const errors = {};

  if (isEmpty(data.category)) errors.category = 'Selecciona una categoría.';

  const plate = (data.plate ?? '').toUpperCase();
  if (!plate) errors.plate = 'Escribe la placa.';
  else if (!PLATE.test(plate)) errors.plate = 'Formato ABC123: 3 letras y 3 números.';

  [['brand', 'la marca'], ['model', 'el modelo']].forEach(([field, name]) => {
    const value = (data[field] ?? '').trim();
    if (!value) errors[field] = `Escribe ${name}.`;
    else if (value.length > MAX_BRAND_MODEL_LENGTH) errors[field] = `Máximo ${MAX_BRAND_MODEL_LENGTH} caracteres.`;
  });

  const currentYear = today.getFullYear();
  if (isEmpty(data.year)) errors.year = 'Escribe el año del vehículo.';
  else if (!/^\d{4}$/.test(data.year)) errors.year = 'Debe tener 4 dígitos.';
  else if (Number(data.year) > currentYear) errors.year = `No puede ser mayor a ${currentYear}.`;
  else if (Number(data.year) < MIN_VEHICLE_YEAR) errors.year = `Debe ser modelo ${MIN_VEHICLE_YEAR} o posterior.`;

  if (isEmpty(data.color)) errors.color = 'Selecciona un color.';

  // El mínimo depende de la categoría: por eso se valida aquí y no en el campo
  const minCapacity = MIN_CAPACITY_BY_CATEGORY[data.category] ?? 1;
  if (isEmpty(data.capacity)) errors.capacity = 'Escribe la capacidad de pasajeros.';
  else if (Number(data.capacity) < minCapacity)
    errors.capacity = `Esta categoría exige mínimo ${minCapacity} ${minCapacity === 1 ? 'pasajero' : 'pasajeros'}.`;
  else if (Number(data.capacity) > MAX_CAPACITY) errors.capacity = `Máximo ${MAX_CAPACITY} pasajeros.`;

  if (!data.vehiclePhoto) errors.vehiclePhoto = 'Agrega una foto del vehículo donde se vea la placa.';

  return errors;
}
