// AI-assisted: see docs/AI_LOG.md #13
// Pruebas del cobro con dobles de Firestore y de Mercado Pago: no tocan la base de datos ni la cuenta real
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { amountToCharge, createPaymentService, mapPaymentStatus } from '../src/payments.js';
import { isValidSignature } from '../src/webhookSignature.js';

// Firestore en memoria con la misma forma que firebase-admin: collection().doc().get()/update() y runTransaction
function fakeDb(trips) {
  const docRef = (id) => ({
    id,
    get: async () => ({ exists: id in trips, data: () => ({ ...trips[id] }) }),
    update: async (data) => {
      trips[id] = { ...trips[id], ...data };
    },
  });
  return {
    collection: () => ({ doc: docRef }),
    runTransaction: async (fn) => {
      const writes = [];
      const result = await fn({ get: (ref) => ref.get(), update: (ref, data) => writes.push([ref, data]) });
      for (const [ref, data] of writes) await ref.update(data);
      return result;
    },
  };
}

function fakeMp({ payments = [] } = {}) {
  const calls = { preferences: [] };
  return {
    calls,
    createPreference: async (body) => {
      calls.preferences.push(body);
      return { id: 'pref-1', init_point: 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-1' };
    },
    searchPayments: async (ref) => ({ results: payments.filter((p) => p.external_reference === ref) }),
    getPayment: async (id) => payments.find((p) => String(p.id) === String(id)),
  };
}

const completedTrip = () => ({ status: 'completed', paymentMethod: 'mercadopago', category: 'economy', fare: 19200, tip: 2000, paymentStatus: 'pending' });
const service = (trips, mp, publicUrl = null) =>
  createPaymentService({ db: fakeDb(trips), mp, publicUrl, serverTimestamp: () => 'SERVER_TS' });

test('mapPaymentStatus traduce los estados de Mercado Pago', () => {
  assert.equal(mapPaymentStatus('approved'), 'approved');
  assert.equal(mapPaymentStatus('in_process'), 'pending');
  assert.equal(mapPaymentStatus('pending'), 'pending');
  assert.equal(mapPaymentStatus('rejected'), 'rejected');
  assert.equal(mapPaymentStatus('cancelled'), 'rejected');
});

test('el monto sale del viaje: tarifa + propina', () => {
  assert.equal(amountToCharge({ fare: 19200, tip: 2000 }), 21200);
  assert.equal(amountToCharge({ fare: 6000 }), 6000);
});

test('createCheckout crea la preferencia con el monto de Firestore y sin back_urls si no hay URL pública', async () => {
  const trips = { t1: completedTrip() };
  const mp = fakeMp();
  const result = await service(trips, mp).createCheckout('t1');
  const [pref] = mp.calls.preferences;
  assert.equal(pref.items[0].unit_price, 21200);
  assert.equal(pref.items[0].currency_id, 'COP');
  assert.equal(pref.external_reference, 't1');
  assert.equal(pref.back_urls, undefined);
  assert.equal(result.initPoint.startsWith('https://'), true);
  assert.equal(trips.t1.paymentPreferenceId, 'pref-1');
  assert.equal(trips.t1.paymentAmount, 21200);
});

test('con URL pública agrega back_urls, auto_return y webhook', async () => {
  const mp = fakeMp();
  await service({ t1: completedTrip() }, mp, 'https://abc.ngrok.app').createCheckout('t1');
  const [pref] = mp.calls.preferences;
  assert.equal(pref.back_urls.success, 'https://abc.ngrok.app/payments/return');
  assert.equal(pref.auto_return, 'approved');
  assert.equal(pref.notification_url, 'https://abc.ngrok.app/webhooks/mercadopago');
});

test('createCheckout rechaza viajes sin terminar, ya pagados o en efectivo', async () => {
  const mp = fakeMp();
  await assert.rejects(service({ t1: { ...completedTrip(), status: 'in_progress' } }, mp).createCheckout('t1'), { status: 409 });
  await assert.rejects(service({ t1: { ...completedTrip(), status: 'paid' } }, mp).createCheckout('t1'), { status: 409 });
  await assert.rejects(service({ t1: { ...completedTrip(), paymentMethod: 'cash' } }, mp).createCheckout('t1'), { status: 409 });
  await assert.rejects(service({}, mp).createCheckout('nope'), { status: 404 });
  await assert.rejects(service({}, mp).createCheckout(undefined), { status: 400 });
});

test('syncTrip con pago aprobado marca el viaje como pagado', async () => {
  const trips = { t1: completedTrip() };
  const mp = fakeMp({
    payments: [
      { id: 2, status: 'rejected', external_reference: 't1', transaction_amount: 21200, currency_id: 'COP' },
      { id: 1, status: 'approved', external_reference: 't1', transaction_amount: 21200, currency_id: 'COP' },
    ],
  });
  const result = await service(trips, mp).syncTrip('t1');
  assert.equal(result.paymentStatus, 'approved');
  assert.equal(trips.t1.status, 'paid');
  assert.equal(trips.t1.paymentId, '1');
  assert.equal(trips.t1.paidAt, 'SERVER_TS');
});

test('un pago rechazado deja el viaje sin pagar con paymentStatus rejected', async () => {
  const trips = { t1: completedTrip() };
  const mp = fakeMp({ payments: [{ id: 3, status: 'rejected', external_reference: 't1', transaction_amount: 21200, currency_id: 'COP' }] });
  await service(trips, mp).syncTrip('t1');
  assert.equal(trips.t1.status, 'completed');
  assert.equal(trips.t1.paymentStatus, 'rejected');
});

test('un pago por otro monto no marca el viaje como pagado', async () => {
  const trips = { t1: completedTrip() };
  const mp = fakeMp({ payments: [{ id: 4, status: 'approved', external_reference: 't1', transaction_amount: 100, currency_id: 'COP' }] });
  const result = await service(trips, mp).syncTrip('t1');
  assert.equal(result.mismatch, true);
  assert.equal(trips.t1.status, 'completed');
});

test('sin pagos todavía queda pendiente, y un viaje ya pagado no se toca', async () => {
  const trips = { t1: completedTrip(), t2: { ...completedTrip(), status: 'paid', paymentStatus: 'approved', paymentId: '9' } };
  const mp = fakeMp({ payments: [{ id: 5, status: 'rejected', external_reference: 't2', transaction_amount: 21200, currency_id: 'COP' }] });
  assert.equal((await service(trips, mp).syncTrip('t1')).found, false);
  const again = await service(trips, mp).syncTrip('t2');
  assert.equal(again.alreadyPaid, true);
  assert.equal(trips.t2.paymentId, '9');
});

test('webhook: syncPaymentId vuelve a consultar el pago en Mercado Pago', async () => {
  const trips = { t1: completedTrip() };
  const mp = fakeMp({ payments: [{ id: 77, status: 'approved', external_reference: 't1', transaction_amount: 21200, currency_id: 'COP' }] });
  await service(trips, mp).syncPaymentId('77');
  assert.equal(trips.t1.status, 'paid');
});

test('firma x-signature: acepta la correcta y rechaza una alterada', () => {
  const secret = 'shh';
  const ts = '1704908010';
  const manifest = `id:123;request-id:req-1;ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  assert.equal(isValidSignature({ secret, signatureHeader: `ts=${ts},v1=${v1}`, requestId: 'req-1', dataId: '123' }), true);
  assert.equal(isValidSignature({ secret, signatureHeader: `ts=${ts},v1=${v1}`, requestId: 'req-1', dataId: '124' }), false);
  assert.equal(isValidSignature({ secret, signatureHeader: undefined, requestId: 'req-1', dataId: '123' }), false);
});

test('API HTTP: checkout, errores en JSON y webhook con firma inválida', async () => {
  const trips = { t1: completedTrip() };
  const app = createApp({ payments: service(trips, fakeMp()), webhookSecret: 'shh' });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(`${base}/payments/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId: 't1' }) });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).amount, 21200);

    const missing = await fetch(`${base}/payments/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(missing.status, 400);
    assert.equal(typeof (await missing.json()).error, 'string');

    const hook = await fetch(`${base}/webhooks/mercadopago?type=payment&data.id=1`, { method: 'POST', headers: { 'x-signature': 'ts=1,v1=bad' } });
    assert.equal(hook.status, 401);
  } finally {
    server.close();
  }
});
