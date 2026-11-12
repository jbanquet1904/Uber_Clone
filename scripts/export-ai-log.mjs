// AI-assisted: see docs/AI_LOG.md #15
// Exporta docs/AI_LOG.md a docs/AI_LOG.pdf con Edge o Chrome en modo headless (sin instalar nada).
// Uso: npm run ai-log:pdf
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'docs', 'AI_LOG.md');
const target = join(root, 'docs', 'AI_LOG.pdf');

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

// Conversor mínimo para el formato de la bitácora: títulos, listas anidadas, párrafos y bloques de código
function toHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const listDepths = []; // profundidad de cada <ul> abierto
  const closeListsTo = (depth) => {
    while (listDepths.length && listDepths[listDepths.length - 1] > depth) {
      html.push('</li></ul>');
      listDepths.pop();
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^ */)[0].length;
    const text = line.trim();

    if (text.startsWith('```')) {
      const code = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i].slice(indent));
      html.push(`<pre>${escape(code.join('\n'))}</pre>`);
      continue;
    }
    if (!text) continue;

    const item = line.match(/^( *)- (.*)$/);
    if (item) {
      const depth = item[1].length / 2;
      const current = listDepths.length ? listDepths[listDepths.length - 1] : -1;
      if (depth > current) {
        html.push('<ul><li>');
        listDepths.push(depth);
      } else {
        closeListsTo(depth);
        html.push('</li><li>');
      }
      html.push(inline(item[2]));
      continue;
    }

    if (indent >= 2 && listDepths.length) {
      html.push(`<p>${inline(text)}</p>`); // párrafo dentro de un elemento de la lista
      continue;
    }

    closeListsTo(-1);
    if (text === '---') html.push('<hr>');
    else if (text.startsWith('### ')) html.push(`<h3>${inline(text.slice(4))}</h3>`);
    else if (text.startsWith('## ')) html.push(`<h2>${inline(text.slice(3))}</h2>`);
    else if (text.startsWith('# ')) html.push(`<h1>${inline(text.slice(2))}</h1>`);
    else html.push(`<p>${inline(text)}</p>`);
  }
  closeListsTo(-1);
  return html.join('\n');
}

const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Bitácora de uso de IA</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1C2430; }
  h1 { font-size: 20pt; margin: 0 0 8px; }
  h3 { font-size: 13pt; margin: 22px 0 6px; padding-top: 10px; border-top: 1px solid #D3D8DE; break-after: avoid; }
  ul { margin: 4px 0; padding-left: 20px; } li { margin: 3px 0; } p { margin: 4px 0; }
  code { font-family: Consolas, monospace; font-size: 9.5pt; background: #F1F3F5; padding: 0 3px; border-radius: 3px; }
  pre { font-family: Consolas, monospace; font-size: 8.5pt; background: #F6F7F9; border: 1px solid #E3E6EA; border-radius: 6px;
        padding: 8px 10px; white-space: pre-wrap; word-break: break-word; margin: 6px 0; }
  hr { border: none; border-top: 2px solid #1C2430; margin: 14px 0; }
</style></head><body>${toHtml(readFileSync(source, 'utf8'))}</body></html>`;

const htmlFile = join(mkdtempSync(join(tmpdir(), 'ai-log-')), 'AI_LOG.html');
writeFileSync(htmlFile, page);

const browser = BROWSERS.find((path) => existsSync(path));
if (!browser) {
  console.error(`No encontré Edge ni Chrome. Abre ${htmlFile} en el navegador y usa Imprimir → Guardar como PDF.`);
  process.exit(1);
}

execFileSync(browser, [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${target}`,
  pathToFileURL(htmlFile).href,
], { stdio: 'ignore' });

console.log(`Listo: ${target}`);
