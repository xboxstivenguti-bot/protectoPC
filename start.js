#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const LOCK_FILE = path.join(ROOT, '.ander-start.lock');
const DATA_DIRS = [
  'data/linux',
  'data/chromium',
  'data/code-server',
  'data/workspace',
  'data/opencode-share',
  'data/opencode-config',
  'data/opencode-cache',
];
const CONTAINERS = [
  'ander-gateway',
  'ander-linux',
  'ander-browser',
  'ander-code',
  'ander-powershell',
];

process.chdir(ROOT);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function commandExists(command) {
  return spawnSync('bash', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
  }).status === 0;
}

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: options.quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.quiet
      ? `\n${String(result.stdout || '')}${String(result.stderr || '')}`
      : '';
    throw new Error(`${command} terminó con código ${result.status}.${detail}`);
  }

  return result;
}

function output(command, args = []) {
  const result = run(command, args, { quiet: true, allowFailure: true });
  return String(result.stdout || '').trim();
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    if (!fs.existsSync(ENV_EXAMPLE)) {
      throw new Error('No existe .env ni .env.example.');
    }
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    warn('Se creó .env desde .env.example. Cambia ANDER_PASSWORD antes de publicar el puerto.');
  }

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

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const previousPid = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim());
    if (Number.isInteger(previousPid) && previousPid > 0) {
      try {
        process.kill(previousPid, 0);
        throw new Error(`Ya hay otro arranque en progreso (PID ${previousPid}).`);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    fs.rmSync(LOCK_FILE, { force: true });
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid));
  const release = () => fs.rmSync(LOCK_FILE, { force: true });
  process.once('exit', release);
  process.once('SIGINT', () => {
    release();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    release();
    process.exit(143);
  });
}

function isGitClean() {
  return output('git', ['status', '--porcelain']) === '';
}

function syncRepository() {
  title('1/7 · Sincronizando GitHub');

  if (!fs.existsSync(path.join(ROOT, '.git')) || !commandExists('git')) {
    warn('No se detectó un repositorio Git. Se continúa sin sincronizar.');
    return;
  }

  const branch = output('git', ['branch', '--show-current']);
  if (!branch) {
    warn('Git está en modo detached HEAD. No se hará pull automático.');
    return;
  }

  run('git', ['fetch', 'origin', branch], { allowFailure: true });

  if (!isGitClean()) {
    warn('Hay cambios locales sin guardar. No se hará pull para no pisarlos.');
    return;
  }

  const local = output('git', ['rev-parse', 'HEAD']);
  const remote = output('git', ['rev-parse', `origin/${branch}`]);
  const base = output('git', ['merge-base', 'HEAD', `origin/${branch}`]);

  if (local && remote && local === base && local !== remote) {
    run('git', ['pull', '--ff-only', 'origin', branch]);
    ok('Cambios remotos aplicados.');
  } else if (local === remote) {
    ok('El editor ya está actualizado.');
  } else if (local && remote && local !== remote) {
    warn('Hay commits locales o ramas divergentes. No se hará merge automático.');
  }
}

function prepareWorkspace() {
  title('2/7 · Preparando archivos y carpetas');
  loadEnvFile();
  for (const relativeDir of DATA_DIRS) {
    fs.mkdirSync(path.join(ROOT, relativeDir), { recursive: true });
  }
  ok('Workspace y datos persistentes de OpenCode preparados.');
}

function stopPreviousSession(port) {
  title('3/7 · Cerrando sesiones anteriores');

  if (commandExists('docker')) {
    run('docker', ['compose', 'down', '--remove-orphans'], { allowFailure: true });
    run('docker', ['rm', '-f', ...CONTAINERS], { allowFailure: true, quiet: true });
  }

  let pids = [];
  if (commandExists('lsof')) {
    pids = output('lsof', ['-ti', `tcp:${port}`]).split(/\s+/).filter(Boolean);
  } else if (commandExists('fuser')) {
    const result = run('fuser', ['-n', 'tcp', String(port)], {
      quiet: true,
      allowFailure: true,
    });
    pids = `${result.stdout || ''} ${result.stderr || ''}`
      .match(/\b\d+\b/g) || [];
  }

  const uniquePids = [...new Set(pids)].filter((pid) => Number(pid) !== process.pid);
  for (const pid of uniquePids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {}
  }

  if (uniquePids.length) {
    warn(`Se finalizó el proceso que usaba el puerto ${port}: ${uniquePids.join(', ')}`);
  } else {
    ok(`El puerto ${port} está disponible.`);
  }
}

async function waitForDocker(timeoutMs = 60000) {
  title('4/7 · Verificando Docker');
  if (!commandExists('docker')) {
    throw new Error('Docker no está instalado. Reconstruye el Codespace con “Codespaces: Rebuild Container”.');
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = run('docker', ['info'], { quiet: true, allowFailure: true });
    if (result.status === 0) {
      ok('Docker está listo.');
      return;
    }
    process.stdout.write('.');
    await sleep(2000);
  }

  throw new Error('Docker no respondió a tiempo. Reconstruye el contenedor o reinicia el Codespace.');
}

function startContainers() {
  title('5/7 · Construyendo PowerShell y encendiendo la PC');

  run('docker', ['compose', 'pull']);

  console.log('\nPreparando ANDER PowerShell con OpenCode permanente...');
  run('docker', [
    'compose',
    'build',
    '--pull',
    'powershell',
  ]);

  run('docker', [
    'compose',
    'up',
    '-d',
    '--remove-orphans',
    '--force-recreate',
  ]);

  ok('Linux, Chromium, VS Code, PowerShell y el gateway fueron iniciados.');
}

function checkHttp(port) {
  return new Promise((resolve) => {
    const request = http.get({
      host: '127.0.0.1',
      port,
      path: '/',
      timeout: 2500,
    }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.once('error', () => resolve(false));
  });
}

async function waitForPc(port, timeoutMs = 180000) {
  title('6/7 · Esperando a que la PC esté lista');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkHttp(port)) {
      ok('ANDER CLOUD PC está respondiendo.');
      return;
    }
    process.stdout.write('.');
    await sleep(2500);
  }

  run('docker', ['compose', 'ps'], { allowFailure: true });
  throw new Error('La PC no respondió a tiempo. Revisa los logs con: docker compose logs -f');
}

function publicUrl(port) {
  const codespace = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
  if (codespace) return `https://${codespace}-${port}.${domain}`;
  return `http://127.0.0.1:${port}`;
}

function tryOpenBrowser(url) {
  const browserCommand = process.env.BROWSER;
  if (!browserCommand || !fs.existsSync(browserCommand)) return false;
  try {
    const child = spawn(browserCommand, [url], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.clear();
  console.log('\x1b[1m\x1b[35mANDER CLOUD PC · Inicio total\x1b[0m');
  acquireLock();

  syncRepository();
  prepareWorkspace();

  const port = Number(process.env.ANDER_PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`ANDER_PORT no es válido: ${process.env.ANDER_PORT}`);
  }

  stopPreviousSession(port);
  await waitForDocker();
  startContainers();
  await waitForPc(port);

  title('7/7 · Sistema listo');
  const url = publicUrl(port);
  console.log(`\n\x1b[1mAbre ANDER CLOUD PC aquí:\x1b[0m\n\x1b[4m${url}\x1b[0m\n`);
  console.log('Servicios:');
  console.log(`  Laptop:      ${url}/`);
  console.log(`  Linux:       ${url}/linux/`);
  console.log(`  Chromium:    ${url}/browser/`);
  console.log(`  VS Code:     ${url}/code/`);
  console.log(`  PowerShell:  ${url}/powershell/`);

  if (tryOpenBrowser(url)) {
    ok('Se solicitó abrir la PC en el navegador.');
  } else {
    warn('Abre el puerto 8080 desde la pestaña Puertos si no se abrió automáticamente.');
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  console.error('\nRevisa el estado con: docker compose ps');
  console.error('Revisa los logs con: docker compose logs -f --tail=150');
  process.exitCode = 1;
});
