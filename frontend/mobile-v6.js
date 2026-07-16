(()=>{
  'use strict';
  if(window.__ANDER_SYSTEM_V6__) return;
  window.__ANDER_SYSTEM_V6__=true;

  /* =====================================================
     1. La PC siempre comienza apagada al abrir la página
     ===================================================== */
  try{ localStorage.removeItem('ander-linux-on'); }catch{}
  try{
    for(const id of [...windows.keys()]) closeWindow(id);
  }catch{}
  try{
    power.style.display='grid';
    startMenu.classList.remove('open');
    cursor.classList.remove('visible');
    activeId=null;
    renderTasks();
    centerLaptop('auto');
  }catch{}

  // Aunque el botón original guarde el estado, nunca se restaura en una recarga.
  window.addEventListener('pagehide',()=>{
    try{ localStorage.removeItem('ander-linux-on'); }catch{}
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted) return;
    try{
      localStorage.removeItem('ander-linux-on');
      for(const id of [...windows.keys()]) closeWindow(id);
      power.style.display='grid';
      startMenu.classList.remove('open');
      cursor.classList.remove('visible');
      activeId=null;
      renderTasks();
    }catch{}
  });

  /* =====================================================
     2. Una sola instancia por aplicación
     ===================================================== */
  // El openApp base ya enfoca la ventana existente. Se conserva expresamente
  // porque Chromium/Selkies solo admite una sesión remota estable por servicio.
  const stableOpenApp=openApp;
  openApp=function(appId){
    const existing=[...windows.values()].find(rec=>rec.appId===appId&&!rec.closed);
    if(existing){
      focusWindow(existing.id);
      return;
    }
    stableOpenApp(appId);
  };

  // Barra de tareas tipo Windows: solo icono y una marca azul si está activa.
  renderTasks=function(){
    taskApps.innerHTML=[...windows.values()]
      .filter(rec=>!rec.closed)
      .map(rec=>`<button class="task-app ${rec.id===activeId&&!rec.minimized?'active':''}" data-task-id="${rec.id}" title="${rec.route.title}" aria-label="${rec.route.title}"><img src="${rec.route.icon}" alt=""></button>`)
      .join('');
  };

  /* =====================================================
     3. PowerShell recibe una sola pulsación por tecla
     ===================================================== */
  const normalEmitKeyboard=emitKeyboard;
  emitKeyboard=function(type,spec){
    const rec=activeId?windows.get(activeId):null;
    if(!rec||rec.appId!=='powershell'){
      return normalEmitKeyboard(type,spec);
    }

    // pressKey llama keydown, keypress y keyup. Xterm interpretaba más de uno.
    if(type!=='keydown') return;

    try{
      const frame=rec.frame;
      const win=frame.contentWindow;
      const doc=frame.contentDocument||win.document;
      const target=doc.querySelector('.xterm-helper-textarea, textarea')||doc.activeElement||doc.body;
      target.focus({preventScroll:true});
      const event=new win.KeyboardEvent('keydown',{
        key:spec.key,
        code:spec.code,
        bubbles:true,
        cancelable:true,
        composed:true,
        ctrlKey:ctrl,
        altKey:alt,
        shiftKey:shift,
        metaKey:meta,
        repeat:false
      });
      target.dispatchEvent(event);
      win.focus();
    }catch(error){
      console.warn('[ANDER PowerShell keyboard]',error);
    }
  };

  /* =====================================================
     4. Estado de red y batería sin duplicar indicadores
     ===================================================== */
  document.querySelectorAll('.task-device-status').forEach(node=>node.remove());
  const task=document.querySelector('.task');
  const clock=document.querySelector('#clock');
  const deviceStatus=document.createElement('div');
  deviceStatus.className='task-device-status';
  deviceStatus.innerHTML=`
    <span class="device-chip net-chip" title="Estado de red">
      <span class="net-bars" data-level="0"><i></i><i></i><i></i><i></i></span>
      <b class="net-label">NET</b>
    </span>
    <span class="device-chip battery-chip" title="Batería">
      <span class="battery-shell"><i class="battery-fill"></i></span>
      <b class="battery-text">--</b>
    </span>`;
  task.insertBefore(deviceStatus,clock);

  const netBars=deviceStatus.querySelector('.net-bars');
  const netLabel=deviceStatus.querySelector('.net-label');
  const batteryFill=deviceStatus.querySelector('.battery-fill');
  const batteryText=deviceStatus.querySelector('.battery-text');
  const batteryChip=deviceStatus.querySelector('.battery-chip');

  const getConnection=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  function networkLabel(connection){
    if(!navigator.onLine) return 'OFF';
    const type=String(connection?.type||'').toLowerCase();
    if(type==='wifi') return 'WiFi';
    if(type==='cellular') return 'Datos';
    if(type==='ethernet') return 'LAN';
    return connection?.effectiveType?String(connection.effectiveType).toUpperCase():'NET';
  }
  function networkLevel(connection,rtt){
    if(!navigator.onLine) return 0;
    if(connection?.effectiveType==='slow-2g'||connection?.effectiveType==='2g') return 1;
    if(connection?.effectiveType==='3g') return 2;
    if(connection?.effectiveType==='4g') return connection.rtt>220||connection.downlink<2?2:4;
    if(!Number.isFinite(rtt)) return 2;
    if(rtt<90) return 4;
    if(rtt<180) return 3;
    if(rtt<350) return 2;
    return 1;
  }
  async function updateNetwork(){
    const connection=getConnection();
    let rtt=Number.isFinite(connection?.rtt)?connection.rtt:NaN;
    if(navigator.onLine&&!Number.isFinite(rtt)){
      const started=performance.now();
      try{
        await fetch(`/index.html?ping=${Date.now()}`,{method:'HEAD',cache:'no-store'});
        rtt=performance.now()-started;
      }catch{}
    }
    netLabel.textContent=networkLabel(connection);
    netBars.dataset.level=String(networkLevel(connection,rtt));
  }
  getConnection()?.addEventListener?.('change',updateNetwork);
  window.addEventListener('online',updateNetwork);
  window.addEventListener('offline',updateNetwork);
  updateNetwork();
  setInterval(updateNetwork,15000);

  if(typeof navigator.getBattery==='function'){
    navigator.getBattery().then(battery=>{
      const draw=()=>{
        const level=Math.round(battery.level*100);
        batteryFill.style.width=`${level}%`;
        batteryFill.style.background=level<=20?'#ff6574':battery.charging?'#64d9ff':'#6cf0a7';
        batteryText.textContent=`${battery.charging?'⚡':''}${level}%`;
      };
      draw();
      battery.addEventListener('levelchange',draw);
      battery.addEventListener('chargingchange',draw);
    }).catch(()=>{});
  }else{
    batteryFill.style.width='0';
    batteryText.textContent='--';
    batteryChip.title='Safari no permite leer el porcentaje real de batería desde una página web.';
  }

  renderTasks();
})();
