(()=>{
  'use strict';
  if(window.__ANDER_BROWSER_FULLSCREEN_V16__) return;
  window.__ANDER_BROWSER_FULLSCREEN_V16__=true;

  /* Chromium ya trae su propia interfaz (pestañas, barra de direcciones).
     En vez de meterlo dentro de otra ventana con barra de título de
     ANDER, se muestra directo a pantalla completa, sin marco propio.
     Se deja un botón de cerrar chiquito flotando, para no quedar
     atrapado adentro sin forma de volver al escritorio. */
  function ensureFullscreenChrome(rec){
    rec.el.classList.add('browser-fullscreen');
    if(rec.el.querySelector('.browser-fullscreen-close'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='browser-fullscreen-close';
    button.setAttribute('aria-label','Cerrar Chromium');
    button.textContent='×';
    const close=(event)=>{event.preventDefault();event.stopPropagation();closeWindow(rec.id)};
    button.addEventListener('pointerup',close);
    button.addEventListener('click',close);
    rec.el.appendChild(button);
  }

  const previousOpenApp=openApp;
  openApp=function(appId){
    previousOpenApp(appId);
    if(appId!=='browser')return;
    const rec=[...windows.values()].find(item=>item.appId==='browser'&&!item.closed);
    if(rec)ensureFullscreenChrome(rec);
  };
})();
