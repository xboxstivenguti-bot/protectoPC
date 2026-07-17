(()=>{
  'use strict';
  if(window.__ANDER_QUICKPANEL_V11__) return;
  window.__ANDER_QUICKPANEL_V11__=true;

  const status=document.querySelector('.task-device-status');
  if(!status) return;
  const netChip=status.querySelector('.net-chip');
  const batteryChip=status.querySelector('.battery-chip');

  /* --- Chip de idioma (ESP), derivado real de navigator.language --- */
  const langChip=document.createElement('span');
  langChip.className='device-chip lang-chip';
  langChip.title='Idioma del navegador';
  const lang=(navigator.language||'').toLowerCase();
  langChip.textContent=lang.startsWith('es')?'ESP':(lang.slice(0,2).toUpperCase()||'--');
  status.insertBefore(langChip,netChip);

  /* --- Chip de micrófono: solo lectura del permiso, nunca lo activa --- */
  const micChip=document.createElement('span');
  micChip.className='device-chip mic-chip';
  micChip.title='Estado del permiso de micrófono';
  micChip.textContent='🎙';
  status.insertBefore(micChip,netChip);
  if(navigator.permissions?.query){
    navigator.permissions.query({name:'microphone'}).then(permission=>{
      const paint=()=>{
        micChip.dataset.state=permission.state;
        micChip.title=`Micrófono: ${permission.state==='granted'?'permitido':permission.state==='denied'?'bloqueado':'sin decidir'}`;
      };
      paint();
      permission.onchange=paint;
    }).catch(()=>{micChip.dataset.state='unknown';micChip.title='El navegador no informa el estado del micrófono.'});
  }else{
    micChip.dataset.state='unknown';
    micChip.title='El navegador no informa el estado del micrófono.';
  }

  /* --- Chip de volumen (indicador; el control real vive en el panel) --- */
  const volumeChip=document.createElement('span');
  volumeChip.className='device-chip volume-chip';
  status.insertBefore(volumeChip,batteryChip);
  function paintVolumeChip(value){
    volumeChip.textContent=value<=0?'🔇':value<40?'🔈':value<75?'🔉':'🔊';
    volumeChip.title=`Volumen ANDER: ${value}%`;
  }

  /* ==================================================
     Panel rápido estilo Windows 11
     ================================================== */
  const backdrop=document.createElement('div');
  backdrop.className='quick-panel-backdrop';
  const panel=document.createElement('div');
  panel.className='quick-panel';
  panel.innerHTML=`
    <div class="qp-section-title">Conexión</div>
    <div class="qp-toggles">
      <div class="qp-toggle" data-tile="wifi"><span class="qp-icon">📶</span><span class="qp-label">Wi-Fi<br><span class="qp-state"></span></span></div>
      <button type="button" class="qp-toggle" data-tile="bluetooth"><span class="qp-icon">🔷</span><span class="qp-label">Bluetooth<br><span class="qp-state"></span></span></button>
      <button type="button" class="qp-toggle" data-tile="airplane"><span class="qp-icon">✈️</span><span class="qp-label">Modo avión<br><span class="qp-state">Interno ANDER</span></span></button>
      <button type="button" class="qp-toggle" data-tile="saver"><span class="qp-icon">🔋</span><span class="qp-label">Ahorro ANDER<br><span class="qp-state">Menos animación</span></span></button>
      <button type="button" class="qp-toggle" data-tile="contrast"><span class="qp-icon">◐</span><span class="qp-label">Alto contraste<br><span class="qp-state"></span></span></button>
      <button type="button" class="qp-toggle" data-tile="large-text"><span class="qp-icon">A+</span><span class="qp-label">Texto grande<br><span class="qp-state"></span></span></button>
      <button type="button" class="qp-toggle" data-tile="reduce-motion"><span class="qp-icon">🌀</span><span class="qp-label">Reducir movimiento<br><span class="qp-state"></span></span></button>
    </div>
    <div class="qp-section-title">Pantalla y audio de ANDER</div>
    <div class="qp-sliders">
      <label class="qp-slider">Brillo (solo la pantalla ANDER)
        <input type="range" min="40" max="100" step="5" id="qp-brightness">
      </label>
      <label class="qp-slider">Volumen (streams internos de ANDER)
        <input type="range" min="0" max="100" step="5" id="qp-volume">
      </label>
    </div>
  `;
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  function openPanel(){backdrop.classList.add('open')}
  function closePanel(){backdrop.classList.remove('open')}
  status.addEventListener('click',event=>{
    event.stopPropagation();
    backdrop.classList.contains('open')?closePanel():openPanel();
  });
  backdrop.addEventListener('click',event=>{if(event.target===backdrop)closePanel()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePanel()});

  /* --- Wi-Fi: solo muestra el estado real, no simula control --- */
  const wifiTile=panel.querySelector('[data-tile="wifi"]');
  function paintWifi(){
    const online=navigator.onLine;
    wifiTile.classList.toggle('on',online);
    wifiTile.querySelector('.qp-state').textContent=online?'Conectado':'Sin conexión';
  }
  paintWifi();
  window.addEventListener('online',paintWifi);
  window.addEventListener('offline',paintWifi);

  /* --- Bluetooth: Web Bluetooth solo bajo acción explícita del usuario --- */
  const bluetoothTile=panel.querySelector('[data-tile="bluetooth"]');
  if(navigator.bluetooth){
    bluetoothTile.querySelector('.qp-state').textContent='Tocar para vincular';
    bluetoothTile.addEventListener('click',async()=>{
      try{
        await navigator.bluetooth.requestDevice({acceptAllDevices:true});
        bluetoothTile.classList.add('on');
        bluetoothTile.querySelector('.qp-state').textContent='Dispositivo vinculado';
      }catch{
        bluetoothTile.querySelector('.qp-state').textContent='Cancelado';
      }
    });
  }else{
    bluetoothTile.classList.add('disabled');
    bluetoothTile.querySelector('.qp-state').textContent='No compatible';
  }

  /* --- Toggles simples con persistencia --- */
  function boolToggle(tileSelector,storageKey,onChange){
    const tile=panel.querySelector(tileSelector);
    let value=localStorage.getItem(storageKey)==='1';
    const paint=()=>{
      tile.classList.toggle('on',value);
      tile.querySelector('.qp-state').textContent=value?'Activado':'Desactivado';
      onChange(value);
    };
    paint();
    tile.addEventListener('click',()=>{
      value=!value;
      localStorage.setItem(storageKey,value?'1':'0');
      paint();
    });
    return ()=>value;
  }

  boolToggle('[data-tile="airplane"]','ander-airplane-mode',value=>{
    document.body.classList.toggle('ander-airplane-mode',value);
  });

  function syncReduceMotion(){
    const saver=localStorage.getItem('ander-power-saver')==='1';
    const reduce=localStorage.getItem('ander-reduce-motion')==='1';
    document.documentElement.classList.toggle('ander-reduce-motion',saver||reduce);
  }
  boolToggle('[data-tile="saver"]','ander-power-saver',syncReduceMotion);
  boolToggle('[data-tile="reduce-motion"]','ander-reduce-motion',syncReduceMotion);
  boolToggle('[data-tile="contrast"]','ander-high-contrast',value=>{
    document.documentElement.classList.toggle('ander-high-contrast',value);
  });
  boolToggle('[data-tile="large-text"]','ander-large-text',value=>{
    document.documentElement.classList.toggle('ander-large-text',value);
  });

  /* --- Banner de modo avión --- */
  const banner=document.createElement('div');
  banner.className='ander-airplane-banner';
  banner.textContent='Modo avión ANDER activo (no afecta la conexión real del dispositivo)';
  document.body.appendChild(banner);

  /* --- Brillo: filtro CSS sobre la pantalla ANDER, no el dispositivo real --- */
  const screenEl=document.querySelector('#screen');
  const brightnessInput=panel.querySelector('#qp-brightness');
  const savedBrightness=Number(localStorage.getItem('ander-brightness'))||100;
  brightnessInput.value=String(savedBrightness);
  if(screenEl)screenEl.style.filter=`brightness(${savedBrightness}%)`;
  brightnessInput.addEventListener('input',()=>{
    const value=Number(brightnessInput.value);
    localStorage.setItem('ander-brightness',String(value));
    if(screenEl)screenEl.style.filter=`brightness(${value}%)`;
  });

  /* --- Volumen: intenta ajustar audio/video accesibles dentro de cada app --- */
  const volumeInput=panel.querySelector('#qp-volume');
  const savedVolume=Number(localStorage.getItem('ander-volume'));
  const initialVolume=Number.isFinite(savedVolume)?savedVolume:100;
  volumeInput.value=String(initialVolume);
  paintVolumeChip(initialVolume);
  function applyVolume(value){
    for(const rec of windows.values()){
      try{
        const doc=rec.frame.contentDocument;
        if(!doc)continue;
        doc.querySelectorAll('audio,video').forEach(media=>{media.volume=value/100});
      }catch{}
    }
  }
  applyVolume(initialVolume);
  volumeInput.addEventListener('input',()=>{
    const value=Number(volumeInput.value);
    localStorage.setItem('ander-volume',String(value));
    paintVolumeChip(value);
    applyVolume(value);
  });

  syncReduceMotion();

  /* --- Puente de apariencia: recibe ajustes desde /settings/ --- */
  window.addEventListener('message',event=>{
    const data=event.data;
    if(!data)return;
    if(data.type==='ander-volume'&&Number.isFinite(data.value)){
      volumeInput.value=String(data.value);
      paintVolumeChip(data.value);
      applyVolume(data.value);
      return;
    }
    if(data.type!=='ander-appearance')return;
    if(data.accent)document.documentElement.style.setProperty('--a',data.accent);
    if(data.reduceMotion!=null){
      localStorage.setItem('ander-reduce-motion',data.reduceMotion?'1':'0');
      syncReduceMotion();
    }
    if(data.powerSaver!=null){
      localStorage.setItem('ander-power-saver',data.powerSaver?'1':'0');
      syncReduceMotion();
    }
    if(data.highContrast!=null){
      localStorage.setItem('ander-high-contrast',data.highContrast?'1':'0');
      document.documentElement.classList.toggle('ander-high-contrast',data.highContrast);
    }
    if(data.largeText!=null){
      localStorage.setItem('ander-large-text',data.largeText?'1':'0');
      document.documentElement.classList.toggle('ander-large-text',data.largeText);
    }
  });
})();
