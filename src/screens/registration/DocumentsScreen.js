// AI-assisted: see docs/AI_LOG.md #6, #8, #9
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FormScreen from '../../components/FormScreen';
import PrimaryButton from '../../components/PrimaryButton';
import CheckboxField from '../../components/form/CheckboxField';
import DateField from '../../components/form/DateField';
import PhotoField from '../../components/form/PhotoField';
import TextField from '../../components/form/TextField';
import { useRegistration } from '../../context/RegistrationContext';
import { useDriver } from '../../context/DriverContext';
import { PRICING } from '../../config/pricing';
import { onlyDigits, requiresTechReview } from '../../utils/registrationValidators';
import { newDriverId, registrationErrorMessage, submitRegistration } from '../../services/driverRegistration';
import { colors } from '../../theme';

// Math.round: multiplicar decimales a veces da 20.000000000000004
const COMMISSION_PERCENT = Math.round(PRICING.commissionRate * 100);

export default function DocumentsScreen({ navigation }) {
  const { personal, vehicle, documents, documentsErrors, touched, pendingTabs, updateDocuments, touchField, touchAll } =
    useRegistration();
  const { startSession } = useDriver();

  const submittingRef = useRef(false); // candado inmediato: dos toques seguidos entran antes de que el botón se deshabilite
  const driverIdRef = useRef(null); // mismo ID en todos los reintentos
  const uploadCacheRef = useRef({}); // fotos que ya subieron
  const [submitting, setSubmitting] = useState(false); // solo para la interfaz: botón y texto
  const [submitError, setSubmitError] = useState(null);

  // Mañana como mínimo y como fecha inicial: si toca "Listo" sin mover la rueda, no guarda hoy (que ya cuenta como vencido)
  const tomorrow = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  }, []);

  // La pantalla y el validador usan la misma función: nunca se ocultan campos que el validador exige
  const needsRtm = requiresTechReview(vehicle.year);
  const canSubmit = pendingTabs.length === 0;

  // El error solo aparece después de que el conductor usa el campo o toca una pestaña pendiente
  const errorOf = (field) => (touched.documents[field] ? documentsErrors[field] : undefined);
  const touch = (field) => () => touchField('documents', field);

  // Fotos, fechas y la casilla no tienen onBlur: se marcan apenas el conductor elige algo
  const choose = (field) => (value) => {
    updateDocuments(field, value);
    touchField('documents', field);
  };

  // Marca los campos con error de esa pestaña y lleva al conductor a verlos en rojo
  const goToTab = useCallback(
    (tab) => {
      touchAll(tab.section, tab.fields);
      navigation.navigate(tab.route);
    },
    [touchAll, navigation]
  );

  // Primero Firestore, después la sesión: startSession desmonta las pestañas y se pierden los datos
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    if (!driverIdRef.current) driverIdRef.current = newDriverId();

    try {
      await submitRegistration({
        driverId: driverIdRef.current,
        personal,
        vehicle,
        documents,
        uploadCache: uploadCacheRef.current,
      });
      // Guarda la sesión en el teléfono. Si falla cae en el catch y el reintento no duplica nada (mismo ID, fotos en caché).
      // Si sale bien no se suelta el candado: el RootNavigator desmonta el registro
      await startSession({ id: driverIdRef.current, status: 'pending' });
    } catch (error) {
      console.warn('Error al enviar el registro:', error);
      setSubmitError(registrationErrorMessage(error));
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [canSubmit, personal, vehicle, documents, startSession]);

  const expiryField = (field, label) => (
    <DateField
      label={label}
      value={documents[field]}
      onChange={(date) => updateDocuments(field, date)}
      onClose={touch(field)}
      error={errorOf(field)}
      minimumDate={tomorrow}
      initialDate={tomorrow}
    />
  );

  return (
    <FormScreen
      footer={
        <View>
          {submitError && <Text style={styles.submitError}>{submitError}</Text>}
          {!canSubmit && (
            <View style={styles.pending}>
              <Text style={styles.pendingTitle}>Para enviar te falta completar:</Text>
              {pendingTabs.map((tab) => (
                <Pressable key={tab.route} onPress={() => goToTab(tab)} hitSlop={6}>
                  <Text style={styles.pendingLink}>{tab.label} ›</Text>
                </Pressable>
              ))}
            </View>
          )}
          <PrimaryButton
            title={submitting ? 'Enviando registro…' : 'Enviar registro'}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          />
        </View>
      }
    >
      <Text style={styles.section}>Licencia de conducción</Text>
      <TextField
        label="Número de licencia"
        value={documents.licenseNumber}
        onChangeText={(text) => updateDocuments('licenseNumber', onlyDigits(text))}
        onBlur={touch('licenseNumber')}
        error={errorOf('licenseNumber')}
        hint="Es el mismo número de tu cédula."
        keyboardType="number-pad"
        maxLength={10}
      />
      <PhotoField
        label="Foto de la licencia"
        value={documents.licensePhoto}
        onChange={choose('licensePhoto')}
        error={errorOf('licensePhoto')}
        emptyIcon="card-outline"
      />
      {expiryField('licenseExpiry', 'Vencimiento de la licencia')}

      <Text style={styles.section}>SOAT</Text>
      <PhotoField
        label="Foto del SOAT"
        value={documents.soatPhoto}
        onChange={choose('soatPhoto')}
        error={errorOf('soatPhoto')}
        emptyIcon="document-text-outline"
      />
      {expiryField('soatExpiry', 'Vencimiento del SOAT')}

      <Text style={styles.section}>Revisión técnico-mecánica</Text>
      {needsRtm ? (
        <>
          <PhotoField
            label="Foto de la revisión técnico-mecánica"
            value={documents.rtmPhoto}
            onChange={choose('rtmPhoto')}
            error={errorOf('rtmPhoto')}
            hint={`Con modelo ${vehicle.year} ya se exige.`}
            emptyIcon="construct-outline"
          />
          {expiryField('rtmExpiry', 'Vencimiento de la revisión')}
        </>
      ) : (
        <Text style={styles.info}>
          {vehicle.year
            ? `Con modelo ${vehicle.year} todavía no se exige revisión técnico-mecánica.`
            : 'Completa el año en la pestaña Vehículo para saber si aplica.'}
        </Text>
      )}

      <Text style={styles.section}>Pagos</Text>
      <TextField
        label="Correo de tu cuenta de Mercado Pago"
        value={documents.mercadoPagoEmail}
        onChangeText={(text) => updateDocuments('mercadoPagoEmail', text)}
        onBlur={touch('mercadoPagoEmail')}
        error={errorOf('mercadoPagoEmail')}
        hint="Solo el correo: no pedimos números de cuenta ni de tarjeta."
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <CheckboxField checked={documents.acceptedTerms} onChange={choose('acceptedTerms')} error={errorOf('acceptedTerms')}>
        Acepto los términos y condiciones, incluida una comisión del {COMMISSION_PERCENT} % sobre la tarifa de cada viaje.
      </CheckboxField>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 12 },
  info: { fontSize: 14, color: colors.textMuted, marginBottom: 18, lineHeight: 20 },
  pending: { marginBottom: 12, alignItems: 'center', gap: 4 },
  pendingTitle: { fontSize: 13, color: colors.textMuted },
  pendingLink: { fontSize: 15, fontWeight: '600', color: colors.error },
  submitError: { fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 10, lineHeight: 20 },
});
