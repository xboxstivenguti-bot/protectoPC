(()=>{
  'use strict';
  if(window.__ANDER_WIN11_CHROME_V9__) return;
  window.__ANDER_WIN11_CHROME_V9__=true;

  /* Doble clic en la barra de título maximiza/restaura, como en Windows. */
  windowLayer.addEventListener('dblclick',event=>{
    const bar=event.target.closest('.winbar');
    if(!bar||event.target.closest('.wincontrols'))return;
    const win=bar.closest('.os-window');
    if(!win)return;
    toggleMaximize(win.dataset.windowId);
  });

  /* El botón de maximizar cambia a icono de "restaurar" cuando ya está
     maximizada o pegada a un lado, igual que en Windows. */
  function syncMaximizeIcon(id){
    const rec=windows.get(id);
    if(!rec)return;
    const btn=rec.el.querySelector('[data-action="max"]');
    if(btn)btn.classList.toggle('is-maximized',!!(rec.maximized||rec.snap));
  }

  const previousApplySnap=applySnap;
  applySnap=function(id,choice){previousApplySnap(id,choice);syncMaximizeIcon(id)};

  const previousRestoreWindow=restoreWindow;
  restoreWindow=function(id){previousRestoreWindow(id);syncMaximizeIcon(id)};

  const previousToggleMaximize=toggleMaximize;
  toggleMaximize=function(id){previousToggleMaximize(id);syncMaximizeIcon(id)};
})();
