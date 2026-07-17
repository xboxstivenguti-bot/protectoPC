(()=>{
  'use strict';
  if(window.__ANDER_TABLET_V8__) return;
  window.__ANDER_TABLET_V8__=true;

  /* El teclado físico dibujado ya no existe (modo tablet). Al tocar dentro
     de una ventana, se enfoca el campo oculto para invitar al teclado
     nativo del sistema (iOS/Android). Los caracteres normales siguen
     saliendo por el listener "input" que ya existía; aquí solo se agregan
     las teclas especiales (Enter, flechas, Ctrl+C, etc.) que ese listener
     nunca pudo cubrir porque dependían del teclado dibujado. */
  windowLayer.addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
    if(!event.target.closest('.touch-bridge'))return;
    try{nativeInput.focus({preventScroll:true})}catch{}
  });

  const passthroughKeys=new Set(['Enter','Backspace','Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Delete','Home','End',' ']);

  nativeInput.addEventListener('keydown',event=>{
    const hasModifier=event.ctrlKey||event.altKey||event.metaKey;
    const isPlainPrintable=event.key.length===1&&!hasModifier;
    if(isPlainPrintable)return;
    if(!hasModifier&&!passthroughKeys.has(event.key))return;
    event.preventDefault();
    const spec={key:event.key,code:event.code||'Unidentified'};
    const prev={ctrl,alt,shift,meta};
    ctrl=event.ctrlKey;alt=event.altKey;shift=event.shiftKey;meta=event.metaKey;
    emitKeyboard('keydown',spec);
    emitKeyboard('keypress',spec);
    emitKeyboard('keyup',spec);
    ({ctrl,alt,shift,meta}=prev);
  });
})();
