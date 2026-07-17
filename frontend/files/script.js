(() => {
  'use strict';

  const gridEl = document.querySelector('#grid');
  const listEl = document.querySelector('#listView');
  const crumbsEl = document.querySelector('#crumbs');
  const quickAccessEl = document.querySelector('#quickAccess');
  const storageMiniEl = document.querySelector('#storageMini');
  const storageEntryEl = document.querySelector('#storageEntry');
  const sectionTitleEl = document.querySelector('#sectionTitle');
  const itemCountEl = document.querySelector('#itemCount');
  const clipboardStatusEl = document.querySelector('#clipboardStatus');
  const searchInput = document.querySelector('#searchInput');
  const backButton = document.querySelector('#backButton');
  const upButton = document.querySelector('#upButton');
  const viewIcon = document.querySelector('#viewIcon');

  const QUICK_ACCESS = [
    { name: 'Escritorio', icon: '🖥️' },
    { name: 'Descargas', icon: '⬇️' },
    { name: 'Documentos', icon: '📄' },
    { name: 'Imagenes', icon: '🖼️' },
    { name: 'Musica', icon: '🎵' },
    { name: 'Videos', icon: '🎬' },
  ];

  const ICONS_BY_EXT = {
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️', bmp: '🖼️',
    mp4: '🎬', mkv: '🎬', webm: '🎬', avi: '🎬', mov: '🎬',
    mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵', m4a: '🎵',
    xlsx: '📊', xls: '📊', csv: '📊',
    pptx: '📽️', ppt: '📽️',
    pdf: '📕',
    zip: '🗜️', tar: '🗜️', gz: '🗜️', rar: '🗜️', '7z': '🗜️',
    js: '📝', ts: '📝', py: '📝', json: '📝', html: '📝', css: '📝', sh: '📝', yml: '📝', yaml: '📝', md: '📝',
    txt: '📄',
  };

  function iconFor(item) {
    if (item.type === 'dir') return '📁';
    const ext = item.name.includes('.') ? item.name.split('.').pop().toLowerCase() : '';
    return ICONS_BY_EXT[ext] || '📄';
  }

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

  const state = {
    path: '',
    history: [],
    items: [],
    selected: null,
    clipboard: null, // { mode: 'copy'|'cut', path, name }
    viewMode: 'grid', // 'grid' | 'list'
    sortKey: 'name',
  };

  function currentPathFromHash() {
    return decodeURIComponent(location.hash.slice(1) || '');
  }

  function navigate(pathname, { pushHistory = true } = {}) {
    if (pushHistory && state.path !== pathname) state.history.push(state.path);
    location.hash = encodeURIComponent(pathname);
  }

  function renderCrumbs(pathname) {
    crumbsEl.innerHTML = '';
    const rootButton = document.createElement('button');
    rootButton.textContent = '🖥️ Este equipo';
    rootButton.addEventListener('click', () => navigate(''));
    crumbsEl.appendChild(rootButton);

    const segments = pathname.split('/').filter(Boolean);
    let accumulated = '';
    for (const segment of segments) {
      accumulated += `/${segment}`;
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '›';
      crumbsEl.appendChild(sep);
      const target = accumulated;
      const button = document.createElement('button');
      button.textContent = segment;
      button.addEventListener('click', () => navigate(target));
      crumbsEl.appendChild(button);
    }
    upButton.disabled = segments.length === 0;
    backButton.disabled = state.history.length === 0;
  }

  function renderQuickAccess(pathname) {
    quickAccessEl.innerHTML = '';
    for (const folder of QUICK_ACCESS) {
      const el = document.createElement('div');
      el.className = 'sidebar-item' + (pathname === `/${folder.name}` ? ' active' : '');
      el.innerHTML = `<span class="si-icon">${folder.icon}</span><span>${folder.name}</span>`;
      el.addEventListener('click', () => navigate(`/${folder.name}`));
      quickAccessEl.appendChild(el);
    }
    storageEntryEl.classList.toggle('active', pathname === '');
  }

  async function loadStorage() {
    try {
      const response = await fetch('/api/system', { cache: 'no-store' });
      const data = await response.json();
      const storage = data.storage?.workspace;
      if (!storage) throw new Error();
      storageMiniEl.innerHTML = `
        <div class="label">${formatBytes(storage.usedBytes)} de ${formatBytes(storage.totalBytes)}</div>
        <div class="bar"><div class="bar-fill" style="width:${storage.percentUsed ?? 0}%"></div></div>
      `;
    } catch {
      storageMiniEl.innerHTML = '<div class="label">No disponible</div>';
    }
  }

  function sortedItems() {
    const query = searchInput.value.trim().toLowerCase();
    let items = state.items.filter((item) => !query || item.name.toLowerCase().includes(query));
    items = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (state.sortKey === 'size') return (a.size || 0) - (b.size || 0);
      return a.name.localeCompare(b.name);
    });
    return items;
  }

  function selectItem(el, item) {
    document.querySelectorAll('.file-item.selected,.list-row.selected').forEach((n) => n.classList.remove('selected'));
    el.classList.add('selected');
    state.selected = item;
  }

  function openItem(item) {
    if (item.type === 'dir') {
      navigate(`${state.path}/${item.name}`);
    } else {
      const url = `/api/files/download?path=${encodeURIComponent(`${state.path}/${item.name}`)}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  function render() {
    const items = sortedItems();
    itemCountEl.textContent = `${items.length} elemento${items.length === 1 ? '' : 's'}`;
    gridEl.hidden = state.viewMode !== 'grid';
    listEl.hidden = state.viewMode !== 'list';
    viewIcon.textContent = state.viewMode === 'grid' ? '▦' : '☰';

    if (!items.length) {
      const empty = '<div class="empty">Esta carpeta está vacía.</div>';
      gridEl.innerHTML = empty;
      listEl.innerHTML = empty;
      return;
    }

    if (state.viewMode === 'grid') {
      gridEl.innerHTML = '';
      for (const item of items) {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.innerHTML = `<span class="fi-icon">${iconFor(item)}</span><span class="fi-name">${item.name}</span>`;
        el.addEventListener('click', () => selectItem(el, item));
        el.addEventListener('dblclick', () => openItem(item));
        gridEl.appendChild(el);
      }
    } else {
      listEl.innerHTML = '';
      for (const item of items) {
        const el = document.createElement('div');
        el.className = 'list-row';
        el.innerHTML = `<span class="fi-icon">${iconFor(item)}</span><span class="fi-name">${item.name}</span><span class="fi-size">${item.type === 'file' ? formatBytes(item.size) : ''}</span>`;
        el.addEventListener('click', () => selectItem(el, item));
        el.addEventListener('dblclick', () => openItem(item));
        listEl.appendChild(el);
      }
    }
  }

  async function load() {
    state.path = currentPathFromHash();
    state.selected = null;
    renderCrumbs(state.path);
    renderQuickAccess(state.path);
    loadStorage();
    sectionTitleEl.textContent = state.path === '' ? 'Inicio' : state.path.split('/').filter(Boolean).pop();
    gridEl.innerHTML = '<div class="empty">Cargando…</div>';
    try {
      const response = await fetch(`/api/files/list?path=${encodeURIComponent(state.path)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo leer la carpeta.');
      const data = await response.json();
      state.items = data.items;
      render();
    } catch (error) {
      gridEl.innerHTML = `<div class="error">${error.message}</div>`;
      listEl.innerHTML = '';
    }
  }

  async function callApi(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'La operación falló.');
    }
    return response.json();
  }

  function selectedFullPath() {
    if (!state.selected) return null;
    return `${state.path}/${state.selected.name}`;
  }

  const actions = {
    'new-folder': async () => {
      const name = (prompt('Nombre de la nueva carpeta:') || '').trim();
      if (!name) return;
      try {
        await callApi(`/api/files/mkdir?path=${encodeURIComponent(`${state.path}/${name}`)}`, { method: 'POST' });
        load();
      } catch (error) {
        alert(error.message);
      }
    },
    cut: () => {
      if (!state.selected) return alert('Selecciona un archivo o carpeta primero.');
      state.clipboard = { mode: 'cut', path: selectedFullPath(), name: state.selected.name };
      clipboardStatusEl.textContent = `Cortado: ${state.selected.name}`;
    },
    copy: () => {
      if (!state.selected) return alert('Selecciona un archivo o carpeta primero.');
      state.clipboard = { mode: 'copy', path: selectedFullPath(), name: state.selected.name };
      clipboardStatusEl.textContent = `Copiado: ${state.selected.name}`;
    },
    paste: async () => {
      if (!state.clipboard) return alert('No hay nada para pegar.');
      try {
        const endpoint = state.clipboard.mode === 'cut' ? 'move' : 'copy';
        await callApi(`/api/files/${endpoint}?from=${encodeURIComponent(state.clipboard.path)}&toDir=${encodeURIComponent(state.path)}`, { method: 'POST' });
        if (state.clipboard.mode === 'cut') {
          state.clipboard = null;
          clipboardStatusEl.textContent = '';
        }
        load();
      } catch (error) {
        alert(error.message);
      }
    },
    rename: async () => {
      if (!state.selected) return alert('Selecciona un archivo o carpeta primero.');
      const name = (prompt('Nuevo nombre:', state.selected.name) || '').trim();
      if (!name || name === state.selected.name) return;
      try {
        await callApi(`/api/files/rename?from=${encodeURIComponent(selectedFullPath())}&to=${encodeURIComponent(`${state.path}/${name}`)}`, { method: 'POST' });
        load();
      } catch (error) {
        alert(error.message);
      }
    },
    delete: async () => {
      if (!state.selected) return alert('Selecciona un archivo o carpeta primero.');
      if (!confirm(`¿Eliminar "${state.selected.name}"? Esta acción no se puede deshacer.`)) return;
      try {
        await callApi(`/api/files/delete?path=${encodeURIComponent(selectedFullPath())}`, { method: 'POST' });
        load();
      } catch (error) {
        alert(error.message);
      }
    },
    sort: () => {
      state.sortKey = state.sortKey === 'name' ? 'size' : 'name';
      render();
    },
    view: () => {
      state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
      render();
    },
  };

  document.querySelectorAll('.tb-btn').forEach((button) => {
    button.addEventListener('click', () => actions[button.dataset.action]?.());
  });

  backButton.addEventListener('click', () => {
    const previous = state.history.pop();
    if (previous != null) navigate(previous, { pushHistory: false });
  });
  upButton.addEventListener('click', () => {
    const parent = state.path.split('/').filter(Boolean).slice(0, -1).join('/');
    navigate(parent ? `/${parent}` : '');
  });

  searchInput.addEventListener('input', render);
  window.addEventListener('hashchange', load);
  load();
})();
