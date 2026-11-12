// AI-assisted: see docs/AI_LOG.md #13
import { createHmac, timingSafeEqual } from 'node:crypto';

// Mercado Pago firma cada notificación: x-signature = "ts=...,v1=..." y v1 es un HMAC-SHA256 de
// "id:[data.id];request-id:[x-request-id];ts:[ts];" con la clave secreta del webhook
export function isValidSignature({ secret, signatureHeader, requestId, dataId }) {
  if (!secret) return true; // sin clave configurada no se valida (solo para pruebas locales)
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=').map((s) => s.trim()))
  );
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // Los pares que no llegan se omiten del manifiesto; data.id va en minúsculas
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b); // comparación en tiempo constante
}
