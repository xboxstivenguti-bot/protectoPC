(() => {
  'use strict';

  const listEl = document.querySelector('#list');
  const crumbsEl = document.querySelector('#crumbs');

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

  function renderCrumbs(pathname) {
    crumbsEl.innerHTML = '';
    const segments = pathname.split('/').filter(Boolean);
    const rootButton = document.createElement('button');
    rootButton.textContent = 'workspace';
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

  function navigate(pathname) {
    location.hash = encodeURIComponent(pathname);
  }

  async function load() {
    const pathname = currentPath();
    renderCrumbs(pathname);
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

  window.addEventListener('hashchange', load);
  load();
})();
