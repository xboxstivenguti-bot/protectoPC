(()=>{
  'use strict';
  if(window.__ANDER_MAXIMIZE_ON_OPEN_V15__) return;
  window.__ANDER_MAXIMIZE_ON_OPEN_V15__=true;

  /* Cada app abre ocupando toda la pantalla ANDER desde el primer toque,
     en vez de una ventana chica que había que maximizar a mano. Solo se
     maximiza la primera vez que se abre, no cada vez que se vuelve a
     tocar su icono (eso ya enfoca/minimiza la ventana existente). */
  const previousOpenApp=openApp;
  openApp=function(appId){
    const wasOpen=[...windows.values()].some(rec=>rec.appId===appId&&!rec.closed);
    previousOpenApp(appId);
    if(wasOpen)return;
    const rec=[...windows.values()].find(item=>item.appId===appId&&!item.closed);
    if(rec)applySnap(rec.id,'max');
  };
})();
