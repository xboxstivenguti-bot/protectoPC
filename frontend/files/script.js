(() => {
  'use strict';

  const listEl = document.querySelector('#list');
  const crumbsEl = document.querySelector('#crumbs');
  const quickAccessEl = document.querySelector('#quickAccess');
  const storageCardEl = document.querySelector('#storageCard');
  const newFolderButton = document.querySelector('#newFolderButton');

  const QUICK_ACCESS = [
    { name: 'Escritorio', icon: '🖥️' },
    { name: 'Documentos', icon: '📄' },
    { name: 'Imagenes', icon: '🖼️' },
    { name: 'Videos', icon: '🎬' },
    { name: 'Descargas', icon: '⬇️' },
  ];

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function currentPath() {
    return decodeURIComponent(location.hash.slice(1) || '');
  }

  function navigate(pathname) {
    location.hash = encodeURIComponent(pathname);
  }

  function renderCrumbs(pathname) {
    crumbsEl.innerHTML = '';
    const segments = pathname.split('/').filter(Boolean);
    const rootButton = document.createElement('button');
    rootButton.textContent = 'Inicio';
    rootButton.addEventListener('click', () => navigate(''));
    crumbsEl.appendChild(rootButton);

    let accumulated = '';
    for (const segment of segments) {
      accumulated += `/${segment}`;
      const sep = document.createElement('span');
      sep.textContent = '›';
      crumbsEl.appendChild(sep);
      const target = accumulated;
      const button = document.createElement('button');
      button.textContent = segment;
      button.addEventListener('click', () => navigate(target));
      crumbsEl.appendChild(button);
    }
  }

  function renderQuickAccess(pathname) {
    const atRoot = pathname === '';
    quickAccessEl.classList.toggle('show', atRoot);
    storageCardEl.classList.toggle('show', atRoot);
    if (!atRoot) return;

    quickAccessEl.innerHTML = '';
    for (const folder of QUICK_ACCESS) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'qa-tile';
      tile.innerHTML = `<span class="qa-icon">${folder.icon}</span><span>${folder.name}</span>`;
      tile.addEventListener('click', () => navigate(`/${folder.name}`));
      quickAccessEl.appendChild(tile);
    }

    loadStorage();
  }

  async function loadStorage() {
    storageCardEl.innerHTML = '<div class="title">Cargando almacenamiento…</div><div class="storage-bar"><div class="storage-bar-fill"></div></div>';
    try {
      const response = await fetch('/api/system', { cache: 'no-store' });
      const data = await response.json();
      const storage = data.storage?.workspace;
      if (!storage) throw new Error('sin datos');
      storageCardEl.innerHTML = `
        <div class="title"><span>Este equipo (/workspace)</span><span>${formatBytes(storage.usedBytes)} de ${formatBytes(storage.totalBytes)} usados</span></div>
        <div class="storage-bar"><div class="storage-bar-fill" style="width:${storage.percentUsed ?? 0}%"></div></div>
      `;
    } catch {
      storageCardEl.innerHTML = '<div class="title">No se pudo leer el almacenamiento</div>';
    }
  }

  async function load() {
    const pathname = currentPath();
    renderCrumbs(pathname);
    renderQuickAccess(pathname);
    listEl.innerHTML = '<div class="empty">Cargando…</div>';
    try {
      const response = await fetch(`/api/files/list?path=${encodeURIComponent(pathname)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo leer la carpeta.');
      const data = await response.json();
      renderItems(pathname, data.items);
    } catch (error) {
      listEl.innerHTML = `<div class="error">${error.message}</div>`;
    }
  }

  function renderItems(pathname, items) {
    listEl.innerHTML = '';
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Esta carpeta está vacía.</div>';
      return;
    }
    for (const item of items) {
      const row = document.createElement('button');
      row.className = 'row';
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = item.type === 'dir' ? '📁' : '📄';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name;
      const size = document.createElement('span');
      size.className = 'size';
      size.textContent = item.type === 'file' ? formatBytes(item.size) : '';
      row.append(icon, name, size);

      if (item.type === 'dir') {
        row.addEventListener('click', () => navigate(`${pathname}/${item.name}`));
      } else {
        row.addEventListener('click', () => {
          const url = `/api/files/download?path=${encodeURIComponent(`${pathname}/${item.name}`)}`;
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
      }
      listEl.appendChild(row);
    }
  }

  newFolderButton.addEventListener('click', async () => {
    const name = (prompt('Nombre de la nueva carpeta:') || '').trim();
    if (!name) return;
    const target = `${currentPath()}/${name}`;
    try {
      const response = await fetch(`/api/files/mkdir?path=${encodeURIComponent(target)}`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo crear la carpeta.');
      }
      load();
    } catch (error) {
      alert(error.message);
    }
  });

  window.addEventListener('hashchange', load);
  load();
})();
