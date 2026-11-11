// AI-assisted: see docs/AI_LOG.md #3, #9
import { useCallback, useMemo, useRef, useState } from 'react';
import FormScreen from '../../components/FormScreen';
import PrimaryButton from '../../components/PrimaryButton';
import PhotoField from '../../components/form/PhotoField';
import TextField from '../../components/form/TextField';
import DateField from '../../components/form/DateField';
import SelectField from '../../components/form/SelectField';
import { useRegistration } from '../../context/RegistrationContext';
import { useDriver } from '../../context/DriverContext';
import { GENDERS, LANGUAGES, MAX_NAME_LENGTH, MIN_DRIVER_AGE } from '../../config/registrationOptions';
import { onlyDigits } from '../../utils/registrationValidators';

const FIELDS = ['profilePhoto', 'fullName', 'documentNumber', 'phone', 'birthDate', 'gender', 'email', 'language'];

export default function PersonalDataScreen({ navigation }) {
  const { personal, personalErrors, touched, isPersonalValid, updatePersonal, touchField, touchAll } = useRegistration();
  // Aviso de por qué volvió al registro, por ejemplo si borraron su documento en la base de datos
  const { sessionNotice } = useDriver();
  const [triedNext, setTriedNext] = useState(false);
  const documentRef = useRef(null);
  const phoneRef = useRef(null);

  // El selector no deja elegir una fecha en la que el conductor tenga menos de 18 años
  const { maxBirthDate, initialBirthDate } = useMemo(() => {
    const today = new Date();
    return {
      maxBirthDate: new Date(today.getFullYear() - MIN_DRIVER_AGE, today.getMonth(), today.getDate()),
      initialBirthDate: new Date(today.getFullYear() - 25, 0, 1),
    };
  }, []);

  // El error solo aparece después de que el conductor usa el campo o toca Siguiente
  const errorOf = (field) => (touched.personal[field] ? personalErrors[field] : undefined);
  const touch = (field) => () => touchField('personal', field);

  // Fotos y listas no tienen onBlur: se marcan apenas el conductor elige algo
  const choose = (field) => (value) => {
    updatePersonal(field, value);
    touchField('personal', field);
  };

  const handleNext = useCallback(() => {
    setTriedNext(true);
    touchAll('personal', FIELDS);
    if (isPersonalValid) navigation.navigate('Vehicle');
  }, [isPersonalValid, touchAll, navigation]);

  return (
    <FormScreen
      notice={triedNext && !isPersonalValid ? 'Revisa los campos marcados en rojo.' : sessionNotice}
      footer={<PrimaryButton title="Siguiente: Vehículo" onPress={handleNext} />}
    >
      <PhotoField
        label="Foto de perfil"
        value={personal.profilePhoto}
        onChange={choose('profilePhoto')}
        error={errorOf('profilePhoto')}
        hint="Que se vea tu rostro con claridad."
        aspect={[1, 1]}
        emptyIcon="person"
        circular
      />

      <TextField
        label="Nombre completo"
        value={personal.fullName}
        onChangeText={(text) => updatePersonal('fullName', text)}
        onBlur={touch('fullName')}
        error={errorOf('fullName')}
        hint={`${personal.fullName.length}/${MAX_NAME_LENGTH} · Solo letras y espacios`}
        placeholder="Ej: Juan Pérez"
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => documentRef.current?.focus()}
      />

      <TextField
        ref={documentRef}
        label="Documento de identidad"
        value={personal.documentNumber}
        onChangeText={(text) => updatePersonal('documentNumber', onlyDigits(text))}
        onBlur={touch('documentNumber')}
        error={errorOf('documentNumber')}
        hint="Entre 6 y 10 dígitos, sin puntos."
        placeholder="Ej: 1234567890"
        keyboardType="number-pad"
        maxLength={10}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />

      <TextField
        ref={phoneRef}
        label="Número de celular"
        value={personal.phone}
        onChangeText={(text) => updatePersonal('phone', onlyDigits(text))}
        onBlur={touch('phone')}
        error={errorOf('phone')}
        hint="10 dígitos."
        placeholder="Ej: 3001234567"
        keyboardType="phone-pad"
        maxLength={10}
        autoComplete="tel"
        textContentType="telephoneNumber"
      />

      <DateField
        label="Fecha de nacimiento"
        value={personal.birthDate}
        onChange={(date) => updatePersonal('birthDate', date)}
        onClose={touch('birthDate')}
        error={errorOf('birthDate')}
        hint={`Debes tener ${MIN_DRIVER_AGE} años o más.`}
        maximumDate={maxBirthDate}
        initialDate={initialBirthDate}
      />

      <SelectField
        label="Género"
        value={personal.gender}
        options={GENDERS}
        onChange={choose('gender')}
        error={errorOf('gender')}
      />

      <TextField
        label="Correo electrónico"
        value={personal.email}
        onChangeText={(text) => updatePersonal('email', text.trim())}
        onBlur={touch('email')}
        error={errorOf('email')}
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />

      <SelectField
        label="Idioma"
        value={personal.language}
        options={LANGUAGES}
        onChange={choose('language')}
        error={errorOf('language')}
      />
    </FormScreen>
  );
}
