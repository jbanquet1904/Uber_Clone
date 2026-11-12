// AI-assisted: see docs/AI_LOG.md #13
// https://docs.expo.dev/guides/customizing-metro/
const http = require('http');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// backend/ es el servidor de pagos (Node), con sus propios node_modules (Firebase Admin, Express…):
// no es parte de la app. Si Metro lo recorre, Expo tarda muchísimo en arrancar o se queda pegado
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const backendDir = path.join(__dirname, 'backend');

config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${escapeRegExp(backendDir)}(?:[\\\\/].*)?$`),
  /^backend$/, // la misma carpeta, como ruta relativa durante el recorrido inicial
];

// Solo en desarrollo: lo que llegue a /pagos/... se reenvía al backend de pagos (puerto 3000 de este computador).
// Así el iPhone solo necesita llegar al servidor de Expo, también en modo túnel (npx expo start --tunnel ngrok)
const BACKEND_PREFIX = '/pagos';
const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 3000);
const previousEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const next = previousEnhance ? previousEnhance(metroMiddleware, server) : metroMiddleware;
    return (req, res, fallthrough) => {
      if (!req.url?.startsWith(`${BACKEND_PREFIX}/`)) return next(req, res, fallthrough);
      const proxied = http.request(
        {
          host: '127.0.0.1',
          port: BACKEND_PORT,
          method: req.method,
          path: req.url.slice(BACKEND_PREFIX.length),
          headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` },
        },
        (backendRes) => {
          res.writeHead(backendRes.statusCode ?? 502, backendRes.headers);
          backendRes.pipe(res);
        }
      );
      proxied.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'El backend de pagos no está encendido. En la raíz del proyecto ejecuta: npm run backend' }));
      });
      req.pipe(proxied);
    };
  },
};

module.exports = config;
