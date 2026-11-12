// AI-assisted: see docs/AI_LOG.md #5
import { useCallback, useMemo, useState } from 'react';
import FormScreen from '../../components/FormScreen';
import PrimaryButton from '../../components/PrimaryButton';
import PhotoField from '../../components/form/PhotoField';
import TextField from '../../components/form/TextField';
import SelectField from '../../components/form/SelectField';
import { useRegistration } from '../../context/RegistrationContext';
import {
  CATEGORIES, VEHICLE_COLORS, MAX_BRAND_MODEL_LENGTH, MIN_VEHICLE_YEAR, MIN_CAPACITY_BY_CATEGORY,
} from '../../config/registrationOptions';
import { normalizePlate, onlyDigits } from '../../utils/registrationValidators';

const FIELDS = ['category', 'plate', 'brand', 'model', 'year', 'color', 'capacity', 'vehiclePhoto'];

export default function VehicleScreen({ navigation }) {
  const { vehicle, vehicleErrors, touched, isVehicleValid, updateVehicle, touchField, touchAll } = useRegistration();
  const [triedNext, setTriedNext] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // El error solo aparece después de que el conductor usa el campo o toca Siguiente
  const errorOf = (field) => (touched.vehicle[field] ? vehicleErrors[field] : undefined);
  const touch = (field) => () => touchField('vehicle', field);

  // Fotos y listas no tienen onBlur: se marcan apenas el conductor elige algo
  const choose = (field) => (value) => {
    updateVehicle(field, value);
    touchField('vehicle', field);
  };

  const handleNext = useCallback(() => {
    setTriedNext(true);
    touchAll('vehicle', FIELDS);
    if (isVehicleValid) navigation.navigate('Documents');
  }, [isVehicleValid, touchAll, navigation]);

  const minCapacity = MIN_CAPACITY_BY_CATEGORY[vehicle.category] ?? 1;

  return (
    <FormScreen
      notice={triedNext && !isVehicleValid ? 'Revisa los campos marcados en rojo.' : null}
      footer={<PrimaryButton title="Siguiente: Documentos" onPress={handleNext} />}
    >
      <SelectField
        label="Categoría"
        value={vehicle.category}
        options={CATEGORIES}
        onChange={choose('category')}
        error={errorOf('category')}
        hint="Las mismas categorías que elige el pasajero."
      />

      <TextField
        label="Placa"
        value={vehicle.plate}
        // maxLength 7 deja espacio para un guion o espacio ("ABC-123"); después de normalizar se corta a 6
        onChangeText={(text) => updateVehicle('plate', normalizePlate(text).slice(0, 6))}
        onBlur={touch('plate')}
        error={errorOf('plate')}
        hint="3 letras y 3 números."
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
      />

      <TextField
        label="Marca"
        value={vehicle.brand}
        onChangeText={(text) => updateVehicle('brand', text)}
        onBlur={touch('brand')}
        error={errorOf('brand')}
        placeholder="Ej: Chevrolet"
        autoCapitalize="words"
        maxLength={MAX_BRAND_MODEL_LENGTH}
      />

      <TextField
        label="Modelo"
        value={vehicle.model}
        onChangeText={(text) => updateVehicle('model', text)}
        onBlur={touch('model')}
        error={errorOf('model')}
        placeholder="Ej: Onix"
        autoCapitalize="words"
        maxLength={MAX_BRAND_MODEL_LENGTH}
      />

      <TextField
        label="Año"
        value={vehicle.year}
        onChangeText={(text) => updateVehicle('year', onlyDigits(text))}
        onBlur={touch('year')}
        error={errorOf('year')}
        hint={`Modelo ${MIN_VEHICLE_YEAR} a ${currentYear}.`}
        placeholder={String(currentYear)}
        keyboardType="number-pad"
        maxLength={4}
      />

      <SelectField
        label="Color"
        value={vehicle.color}
        options={VEHICLE_COLORS}
        onChange={choose('color')}
        error={errorOf('color')}
      />

      <TextField
        label="Capacidad de pasajeros"
        value={vehicle.capacity}
        onChangeText={(text) => updateVehicle('capacity', onlyDigits(text))}
        onBlur={touch('capacity')}
        error={errorOf('capacity')}
        hint={vehicle.category === 'xl' ? `XL exige mínimo ${minCapacity}, sin contar al conductor.` : 'Sin contar al conductor.'}
        keyboardType="number-pad"
        maxLength={1}
      />

      <PhotoField
        label="Foto del vehículo"
        value={vehicle.vehiclePhoto}
        onChange={choose('vehiclePhoto')}
        error={errorOf('vehiclePhoto')}
        hint="Tómala de frente o de atrás, que se vea la placa."
        aspect={[4, 3]}
        emptyIcon="car-outline"
      />
    </FormScreen>
  );
}
