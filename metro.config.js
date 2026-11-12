// AI-assisted: see docs/AI_LOG.md #13
// https://docs.expo.dev/guides/customizing-metro/
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

module.exports = config;
