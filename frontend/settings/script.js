(() => {
  'use strict';

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '--';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function formatUptime(seconds) {
    if (!Number.isFinite(seconds)) return '--';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  function row(dl, label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value ?? 'No disponible';
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  async function loadSystemInfo() {
    let data = null;
    try {
      const response = await fetch('/api/system', { cache: 'no-store' });
      if (response.ok) data = await response.json();
    } catch {}

    const rowsSystem = document.querySelector('#rows-system');
    const rowsCpu = document.querySelector('#rows-cpu');
    const rowsMemory = document.querySelector('#rows-memory');
    const rowsStorage = document.querySelector('#rows-storage');
    const rowsAbout = document.querySelector('#rows-about');

    if (!data) {
      row(rowsSystem, 'Estado', 'No se pudo contactar /api/system');
      return;
    }

    row(rowsSystem, 'Nombre', data.system.name);
    row(rowsSystem, 'Versión', data.system.version || 'No disponible');
    row(rowsSystem, 'Sistema operativo', data.system.platform || 'No disponible');
    row(rowsSystem, 'Arquitectura', data.system.arch || 'No disponible');
    row(rowsSystem, 'Tiempo activo', formatUptime(data.system.uptimeSeconds));

    row(rowsCpu, 'Modelo', data.cpu.model || 'No disponible');
    row(rowsCpu, 'Núcleos', data.cpu.cores ?? 'No disponible');
    row(rowsCpu, 'Carga (1 min)', Number.isFinite(data.cpu.loadAverage1m) ? data.cpu.loadAverage1m.toFixed(2) : 'No disponible');

    row(rowsMemory, 'Total', formatBytes(data.memory.totalBytes));
    row(rowsMemory, 'Usada', formatBytes(data.memory.usedBytes));
    row(rowsMemory, 'Libre', formatBytes(data.memory.freeBytes));
    row(rowsMemory, 'Porcentaje', data.memory.percentUsed != null ? `${data.memory.percentUsed}%` : 'No disponible');
    if (data.memory.percentUsed != null) {
      document.querySelector('#memory-bar').style.width = `${data.memory.percentUsed}%`;
    }

    const storage = data.storage.workspace;
    if (storage) {
      row(rowsStorage, 'Total', formatBytes(storage.totalBytes));
      row(rowsStorage, 'Usado', formatBytes(storage.usedBytes));
      row(rowsStorage, 'Disponible', formatBytes(storage.availableBytes));
      row(rowsStorage, 'Porcentaje', storage.percentUsed != null ? `${storage.percentUsed}%` : 'No disponible');
      if (storage.percentUsed != null) {
        document.querySelector('#storage-bar').style.width = `${storage.percentUsed}%`;
      }
    } else {
      row(rowsStorage, 'Estado', 'No disponible');
    }

    row(rowsAbout, 'Versión', data.about.version || 'No disponible');
    row(rowsAbout, 'Commit', data.about.commit || 'No disponible');
  }

  function fillDateTime() {
    const rows = document.querySelector('#rows-datetime');
    const now = new Date();
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'No disponible';
    row(rows, 'Hora del dispositivo', now.toLocaleTimeString('es-MX'));
    row(rows, 'Fecha', now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    row(rows, 'Zona horaria', zone);
    row(rows, 'Formato', now.toLocaleTimeString([], { hour12: true }) === now.toLocaleTimeString() ? '12 horas' : '12/24 según el navegador');
  }

  function fillNetwork() {
    const rows = document.querySelector('#rows-network');
    row(rows, 'Estado', navigator.onLine ? 'En línea' : 'Sin conexión');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    if (connection) {
      row(rows, 'Tipo efectivo', connection.effectiveType ? connection.effectiveType.toUpperCase() : 'No disponible');
      row(rows, 'RTT estimado', Number.isFinite(connection.rtt) ? `${connection.rtt} ms` : 'No disponible');
      row(rows, 'Velocidad estimada', Number.isFinite(connection.downlink) ? `${connection.downlink} Mbps` : 'No disponible');
    } else {
      row(rows, 'Detalles de red', 'El navegador no expone más datos (navigator.connection no disponible)');
    }
  }

  const THEME_KEY = 'ander-appearance-theme';
  const ACCENT_KEY = 'ander-appearance-accent';
  const REDUCE_MOTION_KEY = 'ander-appearance-reduce-motion';

  function applyAppearance(theme, accent, reduceMotion) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent', accent);
    document.body.classList.toggle('reduce-motion', reduceMotion);
    try {
      window.parent.postMessage({ type: 'ander-appearance', theme, accent, reduceMotion }, '*');
    } catch {}
  }

  function setupAppearance() {
    const themeSelect = document.querySelector('#appearance-theme');
    const accentInput = document.querySelector('#appearance-accent');
    const reduceMotionInput = document.querySelector('#appearance-reduce-motion');

    const theme = localStorage.getItem(THEME_KEY) || 'dark';
    const accent = localStorage.getItem(ACCENT_KEY) || '#438cff';
    const reduceMotion = localStorage.getItem(REDUCE_MOTION_KEY) === '1';

    themeSelect.value = theme;
    accentInput.value = accent;
    reduceMotionInput.checked = reduceMotion;
    applyAppearance(theme, accent, reduceMotion);

    const onChange = () => {
      localStorage.setItem(THEME_KEY, themeSelect.value);
      localStorage.setItem(ACCENT_KEY, accentInput.value);
      localStorage.setItem(REDUCE_MOTION_KEY, reduceMotionInput.checked ? '1' : '0');
      applyAppearance(themeSelect.value, accentInput.value, reduceMotionInput.checked);
    };
    themeSelect.addEventListener('change', onChange);
    accentInput.addEventListener('input', onChange);
    reduceMotionInput.addEventListener('change', onChange);
  }

  loadSystemInfo();
  fillDateTime();
  fillNetwork();
  setupAppearance();
  window.addEventListener('online', fillNetwork);
  window.addEventListener('offline', fillNetwork);
})();
