// AI-assisted: see docs/AI_LOG.md #13
// Lógica de cobro, separada de Express y de Firebase para poder probarla con dobles (ver test/)

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Estados de Mercado Pago → los tres de la app (el cuarto, "cash", lo pone el conductor)
export function mapPaymentStatus(mpStatus) {
  if (mpStatus === 'approved') return 'approved';
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus)) return 'rejected';
  return 'pending'; // pending, in_process, authorized…
}

// Lo que paga el pasajero: tarifa + propina, en pesos enteros
export const amountToCharge = (trip) => Math.round((trip.fare ?? 0) + (trip.tip ?? 0));

// Si hay un pago aprobado manda ese; si no, el más reciente (la búsqueda viene ordenada del más nuevo al más viejo)
export const pickPayment = (payments) => payments.find((p) => p.status === 'approved') ?? payments[0] ?? null;

export function createPaymentService({ db, mp, publicUrl, serverTimestamp }) {
  const tripRef = (tripId) => db.collection('trips').doc(tripId);

  async function readTrip(tripId) {
    if (typeof tripId !== 'string' || !tripId) throw new HttpError(400, 'Falta el tripId.');
    // Solo ids como los que crea Firestore: sin "/" (no se puede saltar a otra colección) ni __reservados__
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(tripId) || /^__.*__$/.test(tripId)) throw new HttpError(400, 'El tripId no es válido.');
    const snap = await tripRef(tripId).get();
    if (!snap.exists) throw new HttpError(404, 'El viaje no existe.');
    return snap.data();
  }

  // Paso 3 del PDF: el backend crea la preferencia con la llave secreta.
  // El monto se lee de Firestore: si la app mandara el monto, cualquiera podría cobrar lo que quisiera
  async function createCheckout(tripId) {
    const trip = await readTrip(tripId);
    if (trip.status === 'paid') throw new HttpError(409, 'Este viaje ya está pagado.');
    if (trip.status !== 'completed') throw new HttpError(409, 'El viaje todavía no ha terminado.');
    if (trip.paymentMethod !== 'mercadopago') throw new HttpError(409, 'Este viaje no se paga con Mercado Pago.');

    const amount = amountToCharge(trip);
    const preference = {
      items: [{ id: tripId, title: `Viaje UberClone (${trip.category})`, quantity: 1, unit_price: amount, currency_id: 'COP' }],
      external_reference: tripId, // así se encuentra el pago de este viaje después
      statement_descriptor: 'UBERCLONE',
    };
    // Mercado Pago exige https y no acepta localhost en back_urls: solo se mandan si hay una URL pública
    if (publicUrl) {
      preference.back_urls = {
        success: `${publicUrl}/payments/return`,
        pending: `${publicUrl}/payments/return`,
        failure: `${publicUrl}/payments/return`,
      };
      preference.auto_return = 'approved';
      preference.notification_url = `${publicUrl}/webhooks/mercadopago`;
    }

    const created = await mp.createPreference(preference);
    await tripRef(tripId).update({ paymentPreferenceId: created.id, paymentAmount: amount, paymentStatus: 'pending' });
    // Respaldo para pruebas: el mismo enlace se puede abrir en una ventana de incógnito del computador
    console.log(`Enlace de pago del viaje ${tripId} ($${amount}): ${created.init_point}`);
    return { initPoint: created.init_point, preferenceId: created.id, amount };
  }

  // Paso 5 del PDF: con el resultado del pago, el backend actualiza paymentStatus, paymentId y status: paid.
  // Nunca se confía en lo que llega en la URL o en el webhook: el pago siempre se vuelve a consultar en Mercado Pago
  async function applyPayment(tripId, payment) {
    return db.runTransaction(async (tx) => {
      const ref = tripRef(tripId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'El viaje no existe.');
      const trip = snap.data();
      if (trip.status === 'paid') return { paymentStatus: trip.paymentStatus, alreadyPaid: true }; // idempotente

      const expected = amountToCharge(trip);
      const paid = Math.round(Number(payment.transaction_amount));
      if (payment.external_reference !== tripId || payment.currency_id !== 'COP' || paid !== expected) {
        console.warn(`Pago ${payment.id} no cuadra con el viaje ${tripId}: ${paid} vs ${expected}`);
        return { paymentStatus: trip.paymentStatus ?? 'pending', mismatch: true };
      }

      const paymentStatus = mapPaymentStatus(payment.status);
      tx.update(ref, {
        paymentStatus,
        paymentId: String(payment.id),
        ...(paymentStatus === 'approved' ? { status: 'paid', paidAt: serverTimestamp() } : {}),
      });
      return { paymentStatus };
    });
  }

  // La app lo llama al cerrar el checkout ("ya pagó: verificar")
  async function syncTrip(tripId) {
    await readTrip(tripId);
    const { results = [] } = await mp.searchPayments(tripId);
    const payment = pickPayment(results);
    if (!payment) return { paymentStatus: 'pending', found: false };
    return applyPayment(tripId, payment);
  }

  // Webhook: llega solo el id del pago
  async function syncPaymentId(paymentId) {
    const payment = await mp.getPayment(paymentId);
    if (!payment.external_reference) return { ignored: true };
    return applyPayment(payment.external_reference, payment);
  }

  return { createCheckout, syncTrip, syncPaymentId };
}
