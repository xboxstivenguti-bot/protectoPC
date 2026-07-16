(()=>{
  /* ================================
     1. Teclado PowerShell sin duplicados
     ================================ */
  const previousEmitKeyboard=emitKeyboard;
  const keyCodes={Escape:27,Tab:9,Enter:13,Backspace:8,Delete:46,Home:36,End:35,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,' ':32,Space:32,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123};
  const keyCodeFor=(spec)=>{
    if(keyCodes[spec.key]!=null)return keyCodes[spec.key];
    if(keyCodes[spec.code]!=null)return keyCodes[spec.code];
    if(/^Key[A-Z]$/.test(spec.code||''))return spec.code.charCodeAt(3);
    if(/^Digit[0-9]$/.test(spec.code||''))return spec.code.charCodeAt(5);
    if(typeof spec.key==='string'&&spec.key.length===1)return spec.key.toUpperCase().charCodeAt(0);
    return 0;
  };

  emitKeyboard=function(type,spec){
    const rec=activeId?windows.get(activeId):null;
    if(!rec||rec.appId!=='powershell')return previousEmitKeyboard(type,spec);

    // pressKey llama keydown, keypress y keyup. Xterm procesa más de uno,
    // así que para PowerShell solo enviamos un keydown realista.
    if(type!=='keydown')return;

    try{
      const frame=rec.frame;
      const win=frame.contentWindow;
      const doc=frame.contentDocument||win.document;
      const target=doc.querySelector('.xterm-helper-textarea,textarea')||doc.activeElement||doc.body;
      target.focus({preventScroll:true});
      const keyCode=keyCodeFor(spec);
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
      for(const [name,value] of Object.entries({keyCode,which:keyCode,charCode:0})){
        try{Object.defineProperty(event,name,{get:()=>value})}catch{}
      }
      target.dispatchEvent(event);
      win.focus();
    }catch(error){
      console.warn('[ANDER keyboard]',error);
    }
  };

  /* ================================
     2. Varias ventanas de una app
     ================================ */
  function createWindowInstance(appId){
    const route=routes[appId];
    if(!route)return;

    const id=`${appId}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const el=document.createElement('section');
    const browserNative=appId==='browser';
    el.className=`os-window${browserNative?' browser-native':''}`;
    el.dataset.windowId=id;
    const controls=browserNative?'':`<div class="wincontrols"><button data-action="min" aria-label="Minimizar">—</button><button data-action="max" aria-label="Maximizar">□</button><button class="close" data-action="close" aria-label="Cerrar">×</button></div>`;
    el.innerHTML=`<header class="winbar"><span class="winicon"><img src="${route.icon}" alt=""></span><span class="wintitle">${route.title}</span>${controls}</header><div class="winbody"><iframe class="winframe" allow="clipboard-read; clipboard-write; fullscreen; autoplay; microphone; camera"></iframe><div class="touch-bridge" aria-label="Pantalla táctil"></div></div><span class="resize-handle"></span>`;
    windowLayer.appendChild(el);

    const frame=el.querySelector('iframe');
    frame.src=route.url;
    const u=usableRect();
    const w=Math.max(255,Math.min(u.w*.82,720));
    const h=Math.max(165,Math.min(u.h*.79,470));
    spawnOffset=(spawnOffset+18)%90;
    applyRect(el,{x:7+spawnOffset,y:5+spawnOffset*.32,w,h});

    const sameCount=[...windows.values()].filter(item=>item.appId===appId).length+1;
    const rec={id,appId,route,el,frame,minimized:false,maximized:false,snap:null,restore:null,closed:false,instance:sameCount};
    windows.set(id,rec);
    bindWindow(rec);

    // Chromium ya trae sus botones propios. La barra ANDER solo mueve la ventana.
    if(browserNative){
      const bar=el.querySelector('.winbar');
      let lastTap=0;
      bar.addEventListener('pointerup',event=>{
        if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
        const now=Date.now();
        if(now-lastTap<340)toggleMaximize(id);
        lastTap=now;
      });
      bar.addEventListener('dblclick',()=>toggleMaximize(id));
    }

    focusWindow(id);
    renderTasks();
    startMenu.classList.remove('open');
  }

  // Desde el escritorio o el menú, cada toque abre otra instancia.
  openApp=createWindowInstance;

  /* ================================
     3. Barra de tareas agrupada
     ================================ */
  const flyout=document.createElement('aside');
  flyout.className='task-group-flyout';
  flyout.id='taskGroupFlyout';
  document.querySelector('.task').appendChild(flyout);
  let openGroup=null;

  function groupedWindows(){
    const groups=new Map();
    for(const rec of windows.values()){
      if(rec.closed)continue;
      if(!groups.has(rec.appId))groups.set(rec.appId,[]);
      groups.get(rec.appId).push(rec);
    }
    return groups;
  }

  renderTasks=function(){
    const groups=groupedWindows();
    taskApps.innerHTML=[...groups.entries()].map(([appId,recs])=>{
      const route=routes[appId];
      const groupActive=recs.some(rec=>rec.id===activeId&&!rec.minimized);
      return `<button class="task-app ${groupActive?'active':''} ${recs.length>1?'has-many':''}" data-task-group="${appId}"><img src="${route.icon}" alt=""><span>${route.title}</span>${recs.length>1?`<b class="task-count">${recs.length}</b>`:''}</button>`;
    }).join('');

    if(openGroup&&!groups.has(openGroup))closeFlyout();
    else if(openGroup)showFlyout(openGroup);
  };

  function closeFlyout(){
    openGroup=null;
    flyout.classList.remove('open');
    flyout.innerHTML='';
  }

  function showFlyout(appId){
    const recs=[...windows.values()].filter(rec=>rec.appId===appId&&!rec.closed);
    if(!recs.length)return closeFlyout();
    const route=routes[appId];
    openGroup=appId;
    flyout.innerHTML=`<div class="task-group-head"><img src="${route.icon}" alt=""><strong>${route.title}</strong><button class="task-group-new" data-new-app="${appId}">+ Nueva</button></div>${recs.map((rec,index)=>`<div class="task-window-row ${rec.id===activeId&&!rec.minimized?'active':''}" data-window-open="${rec.id}"><img src="${route.icon}" alt=""><span>${route.title} · Ventana ${index+1}${rec.minimized?' · minimizada':''}</span><button class="task-window-close" data-window-close="${rec.id}" aria-label="Cerrar">×</button></div>`).join('')}`;
    flyout.classList.add('open');
  }

  function toggleGroup(appId){
    const recs=[...windows.values()].filter(rec=>rec.appId===appId&&!rec.closed);
    if(!recs.length)return;
    if(recs.length===1){
      const rec=recs[0];
      if(rec.id===activeId&&!rec.minimized)minimizeWindow(rec.id);
      else focusWindow(rec.id);
      closeFlyout();
      return;
    }
    if(openGroup===appId)closeFlyout();
    else showFlyout(appId);
  }

  let groupTouch=0;
  taskApps.addEventListener('pointerup',event=>{
    const button=event.target.closest('[data-task-group]');
    if(!button||!(event.pointerType==='touch'||event.pointerType==='pen'))return;
    groupTouch=Date.now();
    event.preventDefault();
    event.stopPropagation();
    toggleGroup(button.dataset.taskGroup);
  });
  taskApps.addEventListener('click',event=>{
    const button=event.target.closest('[data-task-group]');
    if(!button||Date.now()-groupTouch<500)return;
    event.preventDefault();
    event.stopPropagation();
    toggleGroup(button.dataset.taskGroup);
  });

  flyout.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    const close=event.target.closest('[data-window-close]');
    if(close){
      closeWindow(close.dataset.windowClose);
      if(openGroup)showFlyout(openGroup);
      return;
    }
    const row=event.target.closest('[data-window-open]');
    if(row){
      focusWindow(row.dataset.windowOpen);
      closeFlyout();
      return;
    }
    const add=event.target.closest('[data-new-app]');
    if(add){
      createWindowInstance(add.dataset.newApp);
      showFlyout(add.dataset.newApp);
    }
  });

  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('#taskGroupFlyout')&&!event.target.closest('[data-task-group]'))closeFlyout();
  });

  // Corrige cualquier barra dibujada antes de cargar este parche.
  renderTasks();
})();