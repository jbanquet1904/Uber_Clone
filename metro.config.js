// AI-assisted: see docs/AI_LOG.md #13
// https://docs.expo.dev/guides/customizing-metro/
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
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

// "npx expo start" también enciende el backend de pagos, si no está encendido ya (por ejemplo con npm run backend).
// Corre como proceso hijo de Expo: sus mensajes salen con [backend] y se apaga cuando se cierra Expo
let backendProcess = null;
let backendStarting = false;

function printBackend(stream) {
  stream.on('data', (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) console.log(`[backend] ${line}`);
  });
}

function startBackendIfNeeded() {
  if (backendProcess || backendStarting) return;
  backendStarting = true;
  const probe = net.createConnection({ port: BACKEND_PORT, host: '127.0.0.1' });
  probe.once('connect', () => {
    probe.end();
    backendStarting = false; // ya hay uno encendido: se usa ese
  });
  probe.once('error', () => {
    backendStarting = false;
    backendProcess = spawn(process.execPath, ['--env-file-if-exists=../.env', '--env-file-if-exists=.env', 'src/server.js'], {
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    printBackend(backendProcess.stdout);
    printBackend(backendProcess.stderr);
    backendProcess.on('exit', (code) => {
      if (code) console.log(`[backend] Se detuvo (código ${code}).`);
      backendProcess = null;
    });
  });
}

process.on('exit', () => backendProcess?.kill());

config.server = {
  ...config.server,
  // Expo llama a esta función una sola vez, al encender el servidor de desarrollo (no en npx expo export)
  enhanceMiddleware: (metroMiddleware, server) => {
    const next = previousEnhance ? previousEnhance(metroMiddleware, server) : metroMiddleware;
    startBackendIfNeeded();
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
        startBackendIfNeeded(); // si se cayó, se vuelve a encender solo
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'El backend de pagos se está encendiendo. Intenta de nuevo en unos segundos.' }));
      });
      req.pipe(proxied);
    };
  },
};

module.exports = config;
