// AI-assisted: see docs/AI_LOG.md #13
// Un solo comando para desarrollar: enciende el backend de pagos y Expo en la misma terminal.
// Uso:  npm run dev                    (red local)
//       npm run dev -- --tunnel ngrok  (si el iPhone no se conecta por Wi-Fi)
// Ctrl+C apaga los dos.
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const backendDir = resolve(root, 'backend');
const BACKEND_PORT = 3000;

// ¿Ya hay algo escuchando en el puerto del backend? (por ejemplo, otro "npm run backend" abierto)
const portInUse = (port) =>
  new Promise((done) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.end();
      done(true);
    });
    socket.once('error', () => done(false));
  });

let backend = null;
if (await portInUse(BACKEND_PORT)) {
  console.log(`[backend] Ya hay un backend encendido en el puerto ${BACKEND_PORT}: se usa ese.`);
} else {
  // node directo (sin shell): el backend corre en segundo plano y sus mensajes salen con el prefijo [backend]
  backend = spawn(process.execPath, ['--env-file-if-exists=../.env', '--env-file-if-exists=.env', 'src/server.js'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(`[backend] ${line}\n`);
    });
  prefix(backend.stdout, process.stdout);
  prefix(backend.stderr, process.stderr);
  backend.on('exit', (code) => {
    if (code) console.error(`[backend] Se detuvo (código ${code}). Revisa los mensajes de arriba.`);
  });
}

// Expo en primer plano: necesita la terminal para mostrar el QR y recibir teclas (r, j, etc.)
const extraArgs = process.argv.slice(2).join(' ');
const expo = spawn(`npx expo start ${extraArgs}`.trim(), { cwd: root, stdio: 'inherit', shell: true });

const stopBackend = () => {
  if (backend && backend.exitCode === null) backend.kill();
};
process.on('SIGINT', stopBackend);
process.on('SIGTERM', stopBackend);
expo.on('exit', (code) => {
  stopBackend();
  process.exit(code ?? 0);
});
