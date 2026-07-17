#!/usr/bin/env node
'use strict';

const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PORT = Number(process.env.API_PORT || 3300);
const WORKSPACE_ROOT = '/workspace';
const REPO_ROOT = '/repo';

function readJson(pathname) {
  try {
    return JSON.parse(fs.readFileSync(pathname, 'utf8'));
  } catch {
    return null;
  }
}

function readGitCommit() {
  try {
    const headContents = fs.readFileSync(path.join(REPO_ROOT, '.git', 'HEAD'), 'utf8').trim();
    if (headContents.startsWith('ref:')) {
      const ref = headContents.slice(4).trim();
      const refPath = path.join(REPO_ROOT, '.git', ref);
      if (fs.existsSync(refPath)) return fs.readFileSync(refPath, 'utf8').trim().slice(0, 7);
      const packedRefs = fs.readFileSync(path.join(REPO_ROOT, '.git', 'packed-refs'), 'utf8');
      const line = packedRefs.split('\n').find((l) => l.endsWith(` ${ref}`));
      if (line) return line.split(' ')[0].slice(0, 7);
      return null;
    }
    return headContents.slice(0, 7);
  } catch {
    return null;
  }
}

function diskUsage(targetPath) {
  try {
    const output = execFileSync('df', ['-Pk', targetPath], { encoding: 'utf8', timeout: 5000 });
    const line = output.trim().split('\n')[1];
    if (!line) return null;
    const parts = line.trim().split(/\s+/);
    const totalKb = Number(parts[1]);
    const usedKb = Number(parts[2]);
    const availKb = Number(parts[3]);
    if (![totalKb, usedKb, availKb].every(Number.isFinite)) return null;
    return {
      totalBytes: totalKb * 1024,
      usedBytes: usedKb * 1024,
      availableBytes: availKb * 1024,
      percentUsed: totalKb > 0 ? Math.round((usedKb / totalKb) * 100) : null,
    };
  } catch {
    return null;
  }
}

function getSystemInfo() {
  const cpus = os.cpus() || [];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));

  return {
    system: {
      name: 'ANDER Cloud PC',
      version: pkg?.version || null,
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: Math.round(os.uptime()),
      hostname: os.hostname().slice(0, 12),
    },
    cpu: {
      model: cpus[0]?.model || null,
      cores: cpus.length || null,
      loadAverage1m: os.loadavg()[0],
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      percentUsed: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : null,
    },
    storage: {
      workspace: diskUsage(WORKSPACE_ROOT),
    },
    about: {
      version: pkg?.version || null,
      commit: readGitCommit(),
    },
  };
}

// --- Explorador de archivos, restringido a WORKSPACE_ROOT ---

function resolveWorkspacePath(relative) {
  const cleaned = String(relative || '').replace(/\\/g, '/');
  const resolved = path.posix.normalize('/' + cleaned);
  const absolute = path.join(WORKSPACE_ROOT, resolved);
  if (absolute !== WORKSPACE_ROOT && !absolute.startsWith(WORKSPACE_ROOT + path.sep)) {
    return null;
  }
  return absolute;
}

function listDirectory(relative, res) {
  const absolute = resolveWorkspacePath(relative);
  if (!absolute) return sendJson(res, 400, { error: 'Ruta no permitida.' });
  fs.readdir(absolute, { withFileTypes: true }, (error, entries) => {
    if (error) return sendJson(res, 404, { error: 'No se pudo leer la carpeta.' });
    const items = entries
      .map((entry) => {
        let size = null;
        try {
          if (entry.isFile()) size = fs.statSync(path.join(absolute, entry.name)).size;
        } catch {}
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'dir' : 'file',
          size,
        };
      })
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    sendJson(res, 200, { path: relative || '/', items });
  });
}

function downloadFile(relative, res) {
  const absolute = resolveWorkspacePath(relative);
  if (!absolute) return sendJson(res, 400, { error: 'Ruta no permitida.' });
  fs.stat(absolute, (error, stats) => {
    if (error || !stats.isFile()) return sendJson(res, 404, { error: 'Archivo no encontrado.' });
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${path.basename(absolute).replace(/"/g, '')}"`,
    });
    fs.createReadStream(absolute).pipe(res);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://internal');

  if (url.pathname === '/api/system') {
    return sendJson(res, 200, getSystemInfo());
  }
  if (url.pathname === '/api/files/list') {
    return listDirectory(url.searchParams.get('path') || '', res);
  }
  if (url.pathname === '/api/files/download') {
    return downloadFile(url.searchParams.get('path') || '', res);
  }
  sendJson(res, 404, { error: 'No encontrado.' });
});

server.listen(PORT, () => {
  console.log(`[ANDER API] escuchando en el puerto ${PORT}`);
});
