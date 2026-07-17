#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const REPO = 'xboxstivenguti-bot/protectoPC';
const PORT = process.env.ANDER_PORT || '8080';

function title(text) {
  console.log(`\n\x1b[1m\x1b[36m${text}\x1b[0m`);
}
function ok(text) {
  console.log(`\x1b[32m✓\x1b[0m ${text}`);
}
function warn(text) {
  console.log(`\x1b[33m!\x1b[0m ${text}`);
}
function fail(text) {
  console.error(`\x1b[31m✗ ${text}\x1b[0m`);
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return;
  const contents = fs.readFileSync(ENV_FILE, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function findGh() {
  const candidates = process.platform === 'win32'
    ? ['gh', 'C:\\Program Files\\GitHub CLI\\gh.exe']
    : ['gh'];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function run(gh, args, options = {}) {
  return spawnSync(gh, args, {
    cwd: ROOT,
    stdio: options.quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
}

function main() {
  loadEnvFile();
  title('1/5 · Verificando gh CLI');

  const gh = findGh();
  if (!gh) {
    fail('No se encontró el CLI de GitHub (gh).');
    console.error('\nInstálalo con:');
    console.error('  winget install --id GitHub.cli --source winget --accept-package-agreements --accept-source-agreements');
    console.error('\nDespués autentícate con:');
    console.error('  gh auth login');
    process.exitCode = 1;
    return;
  }
  ok(`gh encontrado (${gh}).`);

  const authCheck = run(gh, ['auth', 'status'], { quiet: true });
  if (authCheck.status !== 0) {
    fail('gh no está autenticado.');
    console.error('\nEjecuta y sigue los pasos en el navegador:');
    console.error('  gh auth login');
    process.exitCode = 1;
    return;
  }
  ok('gh está autenticado.');

  title('2/5 · Buscando el Codespace existente');
  const listResult = run(gh, [
    'codespace', 'list',
    '--repo', REPO,
    '--json', 'name,state,gitStatus,repository,lastUsedAt',
  ], { quiet: true });

  if (listResult.status !== 0) {
    fail('No se pudo listar los Codespaces.');
    console.error(listResult.stderr || listResult.stdout || '');
    process.exitCode = 1;
    return;
  }

  let codespaces = [];
  try {
    codespaces = JSON.parse(listResult.stdout || '[]');
  } catch {
    fail('La respuesta de gh codespace list no se pudo leer.');
    process.exitCode = 1;
    return;
  }

  if (!codespaces.length) {
    fail(`No hay ningún Codespace para ${REPO}.`);
    console.error('\nEste script no crea uno nuevo (para no duplicar). Créalo manualmente una vez en:');
    console.error('  https://github.com/codespaces  →  "New codespace"  →  elige este repositorio.');
    console.error('\nDespués vuelve a correr: npm run phone');
    process.exitCode = 1;
    return;
  }

  const preferredName = process.env.ANDER_CODESPACE_NAME;
  let target = null;
  if (preferredName) {
    target = codespaces.find((c) => c.name === preferredName);
    if (!target) {
      warn(`ANDER_CODESPACE_NAME="${preferredName}" no coincide con ningún Codespace real. Se usará el más reciente.`);
    }
  }
  if (!target) {
    codespaces.sort((a, b) => new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0));
    target = codespaces[0];
  }

  ok(`Codespace detectado: ${target.name} (estado: ${target.state}).`);
  if (!preferredName) {
    console.log(`  Tip: fija esto en .env para no depender del más reciente: ANDER_CODESPACE_NAME=${target.name}`);
  }

  title('3/5 · Despertando el Codespace y revisando conflictos');
  const statusCheck = run(gh, [
    'codespace', 'ssh', '-c', target.name, '--',
    'cd "$(find /workspaces -maxdepth 1 -type d | grep -i protectoPC | head -1)" && git status --porcelain --untracked-files=normal; echo ---BRANCH---; git branch --show-current',
  ], { quiet: true });

  if (statusCheck.status !== 0) {
    fail('No se pudo conectar por SSH al Codespace.');
    console.error(statusCheck.stderr || statusCheck.stdout || '');
    process.exitCode = 1;
    return;
  }

  const [porcelain] = String(statusCheck.stdout || '').split('---BRANCH---');
  if (porcelain.trim()) {
    fail('El Codespace tiene cambios locales sin guardar. No se toca nada para no perderlos.');
    console.error('\nEstado remoto (git status --porcelain):');
    console.error(porcelain);
    console.error('Resuélvelo a mano dentro del Codespace (commit/pull) y vuelve a correr: npm run phone');
    process.exitCode = 1;
    return;
  }
  ok('Sin cambios locales sin guardar en el Codespace.');

  title('4/5 · Actualizando y encendiendo la PC dentro del Codespace');
  console.log('  Esto puede tardar varios minutos la primera vez.\n');
  const remoteStart = run(gh, [
    'codespace', 'ssh', '-c', target.name, '--',
    'cd "$(find /workspaces -maxdepth 1 -type d | grep -i protectoPC | head -1)" && node start.js',
  ]);

  if (remoteStart.status !== 0) {
    fail('node start.js falló dentro del Codespace. Revisa el detalle arriba.');
    process.exitCode = 1;
    return;
  }

  title('5/5 · Listo');
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
  const url = `https://${target.name}-${PORT}.${domain}`;
  console.log(`\n\x1b[1mAbre esto desde tu iPhone:\x1b[0m\n\x1b[4m${url}\x1b[0m\n`);
}

main();
