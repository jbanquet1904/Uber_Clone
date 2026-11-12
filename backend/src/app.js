// AI-assisted: see docs/AI_LOG.md #13
import express from 'express';
import { HttpError } from './payments.js';
import { isValidSignature } from './webhookSignature.js';

const page = (title, text) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#F6F7F9;color:#1C2430;display:flex;
min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
main{max-width:360px}h1{font-size:22px}p{color:#5B6573;line-height:1.5}</style></head>
<body><main><h1>${title}</h1><p>${text}</p></main></body></html>`;

const RETURN_TEXT = {
  approved: ['Pago aprobado', 'Listo. Cierra esta ventana para volver a la app del conductor.'],
  pending: ['Pago pendiente', 'Mercado Pago todavía está procesando el pago. Cierra esta ventana; la app se actualiza sola.'],
  rejected: ['Pago rechazado', 'El pago no se aprobó. Cierra esta ventana e intenta de nuevo o paga en efectivo.'],
};

export function createApp({ payments, webhookSecret }) {
  const app = express();
  app.use(express.json());

  const handle = (fn) => async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error.status === 404 ? 404 : 502;
      if (!(error instanceof HttpError)) console.error(error);
      res.status(status).json({ error: error instanceof HttpError ? error.message : 'No se pudo procesar el pago. Intenta de nuevo.' });
    }
  };

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // La app manda solo el tripId; el monto sale de Firestore
  app.post('/payments/checkout', handle((req) => payments.createCheckout(req.body?.tripId)));
  app.post('/payments/sync', handle((req) => payments.syncTrip(req.body?.tripId)));

  // URL de retorno de Checkout Pro (solo si hay PUBLIC_URL). Se vuelve a consultar el pago: los parámetros de la URL se pueden falsificar
  app.get('/payments/return', async (req, res) => {
    const tripId = req.query.external_reference;
    let result = { paymentStatus: 'pending' };
    try {
      if (typeof tripId === 'string' && tripId) result = await payments.syncTrip(tripId);
    } catch (error) {
      console.error('Retorno de pago:', error);
    }
    const [title, text] = RETURN_TEXT[result.paymentStatus] ?? RETURN_TEXT.pending;
    res.type('html').send(page(title, text));
  });

  // Webhook: se responde 200 rápido (Mercado Pago reintenta si no recibe respuesta en 22 s)
  app.post('/webhooks/mercadopago', async (req, res) => {
    const type = req.query.type ?? req.body?.type;
    const dataId = req.query['data.id'] ?? req.body?.data?.id;
    const valid = isValidSignature({
      secret: webhookSecret,
      signatureHeader: req.get('x-signature'),
      requestId: req.get('x-request-id'),
      dataId,
    });
    if (!valid) return res.sendStatus(401);
    res.sendStatus(200);
    if (type !== 'payment' || !dataId) return;
    try {
      await payments.syncPaymentId(dataId);
    } catch (error) {
      console.error('Webhook de Mercado Pago:', error);
    }
  });

  return app;
}
