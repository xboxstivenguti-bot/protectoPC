(()=>{
  /* ======================================================
     1. Una sola pulsación por tecla dentro de PowerShell
     ====================================================== */
  const previousPressKey=pressKey;
  pressKey=function(def,button){
    const rec=activeId?windows.get(activeId):null;
    if(!rec||rec.appId!=='powershell'||def.t||def.k==='Fn'){
      return previousPressKey(def,button);
    }

    const spec=keyOutput(def);
    emitKeyboard('keydown',spec);
    clearMomentary();
  };

  /* ======================================================
     2. Todas las ventanas recuperan minimizar/maximizar/X
     ====================================================== */
  function createWindowV5(appId){
    const route=routes[appId];
    if(!route)return;

    const id=`${appId}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const el=document.createElement('section');
    el.className='os-window';
    el.dataset.windowId=id;
    el.innerHTML=`
      <header class="winbar">
        <span class="winicon"><img src="${route.icon}" alt=""></span>
        <span class="wintitle">${route.title}</span>
        <div class="wincontrols">
          <button data-action="min" aria-label="Minimizar">—</button>
          <button data-action="max" aria-label="Maximizar">□</button>
          <button class="close" data-action="close" aria-label="Cerrar">×</button>
        </div>
      </header>
      <div class="winbody">
        <iframe class="winframe" allow="clipboard-read; clipboard-write; fullscreen; autoplay; microphone; camera"></iframe>
        <div class="touch-bridge" aria-label="Pantalla táctil"></div>
      </div>
      <span class="resize-handle"></span>`;

    windowLayer.appendChild(el);
    const frame=el.querySelector('iframe');
    frame.src=route.url;

    const u=usableRect();
    const w=Math.max(255,Math.min(u.w*.82,720));
    const h=Math.max(165,Math.min(u.h*.79,470));
    spawnOffset=(spawnOffset+18)%90;
    applyRect(el,{x:7+spawnOffset,y:5+spawnOffset*.32,w,h});

    const instance=[...windows.values()].filter(item=>item.appId===appId).length+1;
    const rec={id,appId,route,el,frame,minimized:false,maximized:false,snap:null,restore:null,closed:false,instance};
    windows.set(id,rec);
    bindWindow(rec);
    focusWindow(id);
    renderTasks();
    startMenu.classList.remove('open');
  }
  openApp=createWindowV5;

  /* ======================================================
     3. Estado del dispositivo en la barra inferior
     ====================================================== */
  const task=document.querySelector('.task');
  const clock=document.querySelector('#clock');
  const status=document.createElement('div');
  status.className='task-device-status';
  status.innerHTML=`
    <span class="device-chip net-chip" title="Estado de red">
      <span class="net-bars" data-level="0"><i></i><i></i><i></i><i></i></span>
      <b class="net-label">NET</b>
    </span>
    <span class="device-chip battery-chip" title="Batería del dispositivo">
      <span class="battery-shell"><i class="battery-fill"></i></span>
      <b class="battery-text">--</b>
    </span>`;
  task.insertBefore(status,clock);

  const netBars=status.querySelector('.net-bars');
  const netLabel=status.querySelector('.net-label');
  const batteryFill=status.querySelector('.battery-fill');
  const batteryText=status.querySelector('.battery-text');
  const batteryChip=status.querySelector('.battery-chip');

  function connectionInfo(){
    return navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  }

  function levelFromConnection(connection,rtt){
    if(!navigator.onLine)return 0;
    if(connection){
      if(connection.effectiveType==='slow-2g')return 1;
      if(connection.effectiveType==='2g')return 1;
      if(connection.effectiveType==='3g')return 2;
      if(connection.effectiveType==='4g'){
        if(Number.isFinite(connection.rtt)&&connection.rtt>220)return 2;
        if(Number.isFinite(connection.downlink)&&connection.downlink<2)return 2;
        return 4;
      }
    }
    if(!Number.isFinite(rtt))return 2;
    if(rtt<90)return 4;
    if(rtt<180)return 3;
    if(rtt<350)return 2;
    return 1;
  }

  function connectionLabel(connection){
    if(!navigator.onLine)return 'OFF';
    const type=(connection?.type||'').toLowerCase();
    if(type==='wifi')return 'WiFi';
    if(type==='cellular')return 'Datos';
    if(type==='ethernet')return 'LAN';
    if(connection?.effectiveType)return connection.effectiveType.toUpperCase();
    return 'NET';
  }

  async function updateNetwork(){
    const connection=connectionInfo();
    let rtt=Number.isFinite(connection?.rtt)?connection.rtt:NaN;
    if(navigator.onLine&&!Number.isFinite(rtt)){
      const started=performance.now();
      try{
        await fetch(`/index.html?ander-ping=${Date.now()}`,{method:'HEAD',cache:'no-store'});
        rtt=performance.now()-started;
      }catch{}
    }
    netBars.dataset.level=String(levelFromConnection(connection,rtt));
    netLabel.textContent=connectionLabel(connection);
    status.querySelector('.net-chip').title=connection
      ?`Red: ${connectionLabel(connection)}${Number.isFinite(connection.rtt)?` · RTT ${connection.rtt} ms`:''}${Number.isFinite(connection.downlink)?` · ${connection.downlink} Mbps`:''}`
      :`Conexión ${navigator.onLine?'activa':'sin conexión'}${Number.isFinite(rtt)?` · respuesta ${Math.round(rtt)} ms`:''}. El navegador no informa si es Wi‑Fi o datos.`;
  }

  const connection=connectionInfo();
  connection?.addEventListener?.('change',updateNetwork);
  window.addEventListener('online',updateNetwork);
  window.addEventListener('offline',updateNetwork);
  updateNetwork();
  setInterval(updateNetwork,15000);

  function renderBattery(battery){
    const level=Math.max(0,Math.min(100,Math.round(battery.level*100)));
    batteryFill.style.width=`${level}%`;
    batteryFill.style.background=level<=20?'#ff6574':battery.charging?'#64d9ff':'#6cf0a7';
    batteryText.textContent=`${battery.charging?'⚡':''}${level}%`;
    batteryChip.title=`Batería real: ${level}%${battery.charging?' · cargando':''}`;
  }

  if(typeof navigator.getBattery==='function'){
    navigator.getBattery().then(battery=>{
      renderBattery(battery);
      for(const event of ['levelchange','chargingchange','chargingtimechange','dischargingtimechange']){
        battery.addEventListener(event,()=>renderBattery(battery));
      }
    }).catch(()=>{
      batteryText.textContent='--';
      batteryChip.title='El navegador bloqueó el acceso al porcentaje de batería.';
    });
  }else{
    batteryFill.style.width='0';
    batteryText.textContent='--';
    batteryChip.title='Safari/iPhone no entrega el porcentaje de batería a páginas web.';
  }

  renderTasks();
})();
