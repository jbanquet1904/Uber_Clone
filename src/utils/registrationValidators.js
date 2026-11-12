// AI-assisted: see docs/AI_LOG.md #3, #5, #6
import {
  MAX_NAME_LENGTH, MIN_DRIVER_AGE,
  MIN_VEHICLE_YEAR, MAX_BRAND_MODEL_LENGTH, MAX_CAPACITY, MIN_CAPACITY_BY_CATEGORY,
  RTM_FIRST_REVIEW,
} from '../config/registrationOptions';

// Letras con tildes, ñ y diéresis, más espacios
const LETTERS_AND_SPACES = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/;
// Algo antes de la @, un dominio y una extensión de al menos 2 letras: nombre@correo.com
const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

// Un TextInput siempre devuelve texto: se quitan letras, puntos y espacios
export const onlyDigits = (text) => text.replace(/\D/g, '');

// Las mismas reglas del registro, para editar el perfil sin duplicarlas. AI-assisted: see docs/AI_LOG.md #15
export const isValidEmail = (value) => EMAIL.test((value ?? '').trim());
export const isValidPhone = (value) => /^\d{10}$/.test(value ?? '');

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

// 4 de noviembre de 2026 → 20261104: solo cuenta el día, nunca la hora
const toDayKey = (date) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

// Estricto (>): el PDF dice "posterior a hoy", así que un documento que vence hoy no pasa
export const isAfterToday = (date, today = new Date()) => toDayKey(date) > toDayKey(today);

// El formulario no pide la fecha de matrícula: se aproxima con el año del modelo
export function requiresTechReview(vehicleYear, today = new Date()) {
  if (!/^\d{4}$/.test(String(vehicleYear ?? ''))) return false;
  const modelYear = Number(vehicleYear);
  const { newRuleFromModelYear, yearsNewRule, yearsOldRule } = RTM_FIRST_REVIEW;
  const firstReviewAfter = modelYear >= newRuleFromModelYear ? yearsNewRule : yearsOldRule;
  return today.getFullYear() - modelYear >= firstReviewAfter;
}

// Recibe aparte los datos de las otras pestañas que necesita: el documento (pestaña 1) y el año (pestaña 2)
export function validateDocuments(data, { documentNumber, vehicleYear } = {}, today = new Date()) {
  const errors = {};

  // En Colombia la licencia lleva el mismo número de la cédula
  if (isEmpty(data.licenseNumber)) errors.licenseNumber = 'Escribe el número de tu licencia.';
  else if (!/^\d{6,10}$/.test(data.licenseNumber)) errors.licenseNumber = 'Debe tener entre 6 y 10 dígitos.';
  else if (documentNumber && data.licenseNumber !== documentNumber)
    errors.licenseNumber = 'Debe coincidir con tu documento de identidad (pestaña Datos personales).';

  // Los tres documentos piden lo mismo: foto + vencimiento posterior a hoy.
  // "of" lleva la preposición completa para que diga "del SOAT" y no "de el SOAT"
  const docs = [
    { key: 'license', of: 'de tu licencia' },
    { key: 'soat', of: 'del SOAT' },
    ...(requiresTechReview(vehicleYear, today) ? [{ key: 'rtm', of: 'de la revisión técnico-mecánica' }] : []),
  ];

  docs.forEach(({ key, of }) => {
    if (!data[`${key}Photo`]) errors[`${key}Photo`] = `Agrega una foto ${of}.`;
    const expiry = data[`${key}Expiry`];
    if (!expiry) errors[`${key}Expiry`] = 'Selecciona la fecha de vencimiento.';
    else if (!isAfterToday(expiry, today)) errors[`${key}Expiry`] = 'Está vencido: la fecha debe ser posterior a hoy.';
  });

  // Mismo EMAIL que el correo personal: las dos validaciones nunca se desalinean
  const mpEmail = (data.mercadoPagoEmail ?? '').trim();
  if (!mpEmail) errors.mercadoPagoEmail = 'Escribe el correo de tu cuenta de Mercado Pago.';
  else if (!EMAIL.test(mpEmail)) errors.mercadoPagoEmail = 'Revisa el correo: debe tener @ y un dominio.';

  if (data.acceptedTerms !== true) errors.acceptedTerms = 'Debes aceptar los términos para enviar el registro.';

  return errors;
}
