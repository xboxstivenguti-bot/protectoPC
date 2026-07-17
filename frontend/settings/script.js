(() => {
  'use strict';

  const NA = 'No disponible';

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return NA;
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
    if (!Number.isFinite(seconds)) return NA;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  function specRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span>${label}</span><span>${value ?? NA}</span>`;
    container.appendChild(row);
  }

  /* ---------- Navegación ---------- */
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  function showPage(id) {
    pages.forEach((p) => (p.hidden = true));
    const target = document.querySelector(`#page-${id}`);
    if (target) target.hidden = false;
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      showPage(item.dataset.page);
    });
  });

  document.querySelectorAll('.sub-item').forEach((item) => {
    item.addEventListener('click', () => showPage(item.dataset.sub));
  });

  document.querySelectorAll('.back-btn').forEach((button) => {
    button.addEventListener('click', () => {
      showPage(button.dataset.back);
      navItems.forEach((n) => n.classList.toggle('active', n.dataset.page === button.dataset.back));
    });
  });

  document.querySelector('#navSearch').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    navItems.forEach((item) => {
      item.style.display = !query || item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  /* ---------- Sistema › Información ---------- */
  let systemData = null;
  async function loadSystemInfo() {
    try {
      const response = await fetch('/api/system', { cache: 'no-store' });
      if (response.ok) systemData = await response.json();
    } catch {}

    const cards = document.querySelector('#infoCards');
    const specs = document.querySelector('#deviceSpecs');
    const deviceName = document.querySelector('#deviceName');

    if (!systemData) {
      cards.innerHTML = `<div class="card"><p class="c-value">${NA}</p></div>`;
      return;
    }

    deviceName.textContent = systemData.system.hostname || NA;

    cards.innerHTML = `
      <div class="card"><div class="c-label">🧠 Procesador</div><p class="c-value">${systemData.cpu.model || NA}</p><p class="c-sub">${systemData.cpu.cores ? systemData.cpu.cores + ' núcleos' : NA}</p></div>
      <div class="card"><div class="c-label">💾 RAM instalada</div><p class="c-value">${formatBytes(systemData.memory.totalBytes)}</p><p class="c-sub">${formatBytes(systemData.memory.freeBytes)} libres</p></div>
      <div class="card"><div class="c-label">🎮 Tarjeta gráfica</div><p class="c-value">${NA}</p><p class="c-sub">Los contenedores no exponen la GPU del equipo</p></div>
      <div class="card"><div class="c-label">💽 Almacenamiento</div><p class="c-value">${systemData.storage.workspace ? formatBytes(systemData.storage.workspace.totalBytes) : NA}</p><p class="c-sub">${systemData.storage.workspace ? formatBytes(systemData.storage.workspace.usedBytes) + ' usados' : ''}</p></div>
    `;

    specs.innerHTML = '';
    specRow(specs, 'Nombre del dispositivo', systemData.system.hostname);
    specRow(specs, 'Procesador', systemData.cpu.model);
    specRow(specs, 'Núcleos', systemData.cpu.cores);
    specRow(specs, 'RAM instalada', formatBytes(systemData.memory.totalBytes));
    specRow(specs, 'Tarjeta gráfica', NA);
    specRow(specs, 'Almacenamiento', systemData.storage.workspace ? `${formatBytes(systemData.storage.workspace.usedBytes)} de ${formatBytes(systemData.storage.workspace.totalBytes)} usados` : NA);
    specRow(specs, 'Sistema operativo', systemData.system.platform);
    specRow(specs, 'Arquitectura', systemData.system.arch);
    specRow(specs, 'Tiempo activo', formatUptime(systemData.system.uptimeSeconds));

    document.querySelector('#storageBox').innerHTML = systemData.storage.workspace
      ? `<div class="spec-row"><span>/workspace</span><span>${formatBytes(systemData.storage.workspace.usedBytes)} de ${formatBytes(systemData.storage.workspace.totalBytes)}</span></div><div class="bar"><div class="bar-fill" style="width:${systemData.storage.workspace.percentUsed ?? 0}%"></div></div>`
      : `<p class="muted">${NA}</p>`;

    document.querySelector('#updateSpecs').innerHTML = '';
    specRow(document.querySelector('#updateSpecs'), 'Versión', systemData.about.version);
    specRow(document.querySelector('#updateSpecs'), 'Commit', systemData.about.commit);
  }

  /* ---------- Pantalla ---------- */
  function fillDisplay() {
    const specs = document.querySelector('#displaySpecs');
    specRow(specs, 'Resolución de la ventana', `${window.innerWidth} × ${window.innerHeight}px`);
    specRow(specs, 'Resolución de pantalla', `${screen.width} × ${screen.height}px`);
    specRow(specs, 'Densidad de píxeles', `${window.devicePixelRatio}x`);
    specRow(specs, 'Orientación', screen.orientation?.type || NA);
  }

  /* ---------- Sonido (comparte localStorage con el panel rápido) ---------- */
  function setupSound() {
    const input = document.querySelector('#soundVolume');
    const saved = Number(localStorage.getItem('ander-volume'));
    input.value = String(Number.isFinite(saved) ? saved : 100);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      localStorage.setItem('ander-volume', String(value));
      try {
        window.parent.postMessage({ type: 'ander-volume', value }, '*');
      } catch {}
    });
  }

  /* ---------- Notificaciones ---------- */
  function setupNotifications() {
    const status = document.querySelector('#notifPermission');
    const button = document.querySelector('#notifRequest');
    if (typeof Notification === 'undefined') {
      status.textContent = NA;
      button.disabled = true;
      return;
    }
    status.textContent = Notification.permission;
    button.addEventListener('click', async () => {
      const result = await Notification.requestPermission();
      status.textContent = result;
    });
  }

  /* ---------- Energía y batería ---------- */
  function setupPower() {
    const box = document.querySelector('#batteryBox');
    if (typeof navigator.getBattery === 'function') {
      navigator.getBattery().then((battery) => {
        const paint = () => {
          const level = Math.round(battery.level * 100);
          box.innerHTML = `<div class="spec-row"><span>Nivel</span><span>${level}%${battery.charging ? ' (cargando)' : ''}</span></div><div class="bar"><div class="bar-fill" style="width:${level}%"></div></div>`;
        };
        paint();
        battery.addEventListener('levelchange', paint);
        battery.addEventListener('chargingchange', paint);
      });
    } else {
      box.innerHTML = `<p class="muted">${NA} (el navegador no expone la batería)</p>`;
    }

    const toggle = document.querySelector('#powerSaverToggle');
    toggle.checked = localStorage.getItem('ander-power-saver') === '1';
    toggle.addEventListener('change', () => {
      localStorage.setItem('ander-power-saver', toggle.checked ? '1' : '0');
      try {
        window.parent.postMessage({ type: 'ander-appearance', powerSaver: toggle.checked }, '*');
      } catch {}
    });
  }

  /* ---------- Red e Internet ---------- */
  function fillNetwork() {
    const specs = document.querySelector('#networkSpecs');
    specs.innerHTML = '';
    specRow(specs, 'Estado', navigator.onLine ? 'En línea' : 'Sin conexión');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    if (connection) {
      specRow(specs, 'Tipo efectivo', connection.effectiveType?.toUpperCase());
      specRow(specs, 'RTT estimado', Number.isFinite(connection.rtt) ? `${connection.rtt} ms` : NA);
      specRow(specs, 'Velocidad estimada', Number.isFinite(connection.downlink) ? `${connection.downlink} Mbps` : NA);
    } else {
      specRow(specs, 'Detalles adicionales', 'El navegador no expone más datos');
    }
  }

  /* ---------- Personalización + Accesibilidad (comparten localStorage) ---------- */
  function broadcastAppearance(partial) {
    try {
      window.parent.postMessage({ type: 'ander-appearance', ...partial }, '*');
    } catch {}
  }

  function setupAppearance() {
    const themeSelect = document.querySelector('#themeSelect');
    const accentInput = document.querySelector('#accentInput');
    const reduceMotion1 = document.querySelector('#reduceMotionToggle');
    const reduceMotion2 = document.querySelector('#reduceMotionToggle2');
    const highContrast = document.querySelector('#highContrastToggle');
    const largeText = document.querySelector('#largeTextToggle');

    const theme = localStorage.getItem('ander-appearance-theme') || 'dark';
    const accent = localStorage.getItem('ander-appearance-accent') || '#438cff';
    const reduceMotion = localStorage.getItem('ander-reduce-motion') === '1';
    const contrast = localStorage.getItem('ander-high-contrast') === '1';
    const large = localStorage.getItem('ander-large-text') === '1';

    themeSelect.value = theme;
    accentInput.value = accent;
    reduceMotion1.checked = reduceMotion;
    reduceMotion2.checked = reduceMotion;
    highContrast.checked = contrast;
    largeText.checked = large;
    document.documentElement.setAttribute('data-theme', theme);

    function applyTheme() {
      localStorage.setItem('ander-appearance-theme', themeSelect.value);
      localStorage.setItem('ander-appearance-accent', accentInput.value);
      document.documentElement.setAttribute('data-theme', themeSelect.value);
      broadcastAppearance({ theme: themeSelect.value, accent: accentInput.value });
    }
    themeSelect.addEventListener('change', applyTheme);
    accentInput.addEventListener('input', applyTheme);

    function syncReduceMotion(checked) {
      reduceMotion1.checked = checked;
      reduceMotion2.checked = checked;
      localStorage.setItem('ander-reduce-motion', checked ? '1' : '0');
      document.body.classList.toggle('reduce-motion', checked);
      broadcastAppearance({ reduceMotion: checked });
    }
    reduceMotion1.addEventListener('change', () => syncReduceMotion(reduceMotion1.checked));
    reduceMotion2.addEventListener('change', () => syncReduceMotion(reduceMotion2.checked));
    document.body.classList.toggle('reduce-motion', reduceMotion);

    highContrast.addEventListener('change', () => {
      localStorage.setItem('ander-high-contrast', highContrast.checked ? '1' : '0');
      broadcastAppearance({ highContrast: highContrast.checked });
    });
    largeText.addEventListener('change', () => {
      localStorage.setItem('ander-large-text', largeText.checked ? '1' : '0');
      broadcastAppearance({ largeText: largeText.checked });
    });
  }

  /* ---------- Aplicaciones ---------- */
  function fillApps() {
    const APPS = ['ANDER Linux', 'Chromium', 'Visual Studio Code', 'PowerShell 7', 'Explorador de archivos', 'Configuración'];
    const list = document.querySelector('#appsList');
    list.innerHTML = '';
    for (const name of APPS) specRow(list, name, 'Instalada');
  }

  /* ---------- Hora e idioma ---------- */
  function fillDateTime() {
    const specs = document.querySelector('#dateSpecs');
    const now = new Date();
    specRow(specs, 'Hora del dispositivo', now.toLocaleTimeString());
    specRow(specs, 'Fecha', now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    specRow(specs, 'Zona horaria', Intl.DateTimeFormat().resolvedOptions().timeZone);
    specRow(specs, 'Idioma del navegador', navigator.language);
  }

  /* ---------- Privacidad ---------- */
  function fillPrivacy() {
    const specs = document.querySelector('#privacySpecs');
    specs.innerHTML = '';
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' }).then((permission) => {
        specRow(specs, 'Micrófono', permission.state);
      }).catch(() => specRow(specs, 'Micrófono', NA));
    } else {
      specRow(specs, 'Micrófono', NA);
    }
    specRow(specs, 'Cookies', navigator.cookieEnabled ? 'Habilitadas' : 'Deshabilitadas');
    specRow(specs, '¿No rastrear?', navigator.doNotTrack === '1' ? 'Activado' : 'Sin preferencia');
  }

  loadSystemInfo();
  fillDisplay();
  setupSound();
  setupNotifications();
  setupPower();
  fillNetwork();
  setupAppearance();
  fillApps();
  fillDateTime();
  fillPrivacy();
  window.addEventListener('online', fillNetwork);
  window.addEventListener('offline', fillNetwork);
})();
