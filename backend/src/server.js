// AI-assisted: see docs/AI_LOG.md #13
import { networkInterfaces } from 'node:os';
import { createApp } from './app.js';
import { createDb } from './firestore.js';
import { createMercadoPagoClient } from './mercadopago.js';
import { createPaymentService, HttpError } from './payments.js';

const { PORT = '3000', MP_ACCESS_TOKEN, PUBLIC_URL, MP_WEBHOOK_SECRET } = process.env;

const { db, serverTimestamp, mode } = await createDb();

// Sin token el servidor igual arranca, y el cobro responde con un mensaje claro en vez de caerse
const mp = MP_ACCESS_TOKEN
  ? createMercadoPagoClient({ accessToken: MP_ACCESS_TOKEN })
  : new Proxy({}, {
      get: () => async () => {
        throw new HttpError(503, 'Falta el Access Token de prueba de Mercado Pago en backend/.env (MP_ACCESS_TOKEN).');
      },
    });

const payments = createPaymentService({
  db,
  mp,
  publicUrl: PUBLIC_URL?.startsWith('https://') ? PUBLIC_URL.replace(/\/+$/, '') : null,
  serverTimestamp,
});

const app = createApp({ payments, webhookSecret: MP_WEBHOOK_SECRET });

// 0.0.0.0: escucha en la red local para que el iPhone (en el mismo Wi-Fi) lo alcance
app.listen(Number(PORT), '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net?.family === 'IPv4' && !net.internal)
    .map((net) => `http://${net.address}:${PORT}`);
  console.log(`Backend de pagos escuchando en ${ips.join('  ') || `el puerto ${PORT}`}`);
  console.log(`Firestore: ${mode === 'admin' ? 'cuenta de servicio (Firebase Admin)' : 'configuración web de la app (modo de prueba)'}`);
  console.log(MP_ACCESS_TOKEN ? 'Mercado Pago: token de prueba cargado.' : 'Mercado Pago: FALTA MP_ACCESS_TOKEN en backend/.env');
  if (!PUBLIC_URL) console.log('Sin PUBLIC_URL: el pago se confirma cuando el conductor cierra el checkout en la app.');
});
