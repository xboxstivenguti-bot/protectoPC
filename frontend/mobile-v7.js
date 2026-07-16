(()=>{
  'use strict';
  if(window.__ANDER_BROWSER_RECOVERY_V7__) return;
  window.__ANDER_BROWSER_RECOVERY_V7__=true;

  const originalOpenApp=openApp;
  const watched=new WeakSet();

  function browserRecord(){
    return [...windows.values()].find(rec=>rec.appId==='browser'&&!rec.closed)||null;
  }

  function addRetryPanel(rec){
    if(!rec||rec.el.querySelector('.ander-browser-retry')) return;
    const panel=document.createElement('div');
    panel.className='ander-browser-retry';
    panel.innerHTML=`
      <strong>Chromium todavía no entrega video</strong>
      <span>ANDER ya hizo un reintento automático.</span>
      <button type="button">Reintentar Chromium</button>`;
    rec.el.querySelector('.winbody')?.appendChild(panel);
    panel.querySelector('button')?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      panel.remove();
      rec.frame.src=`/browser/?recover=${Date.now()}`;
      watchBrowser(rec,true);
    });
  }

  function frameText(frame){
    try{return String(frame.contentDocument?.body?.innerText||'')}catch{return ''}
  }

  function watchBrowser(rec,force=false){
    if(!rec||rec.closed) return;
    if(watched.has(rec.frame)&&!force) return;
    watched.add(rec.frame);
    let attempts=0;
    let reloaded=false;
    const timer=setInterval(()=>{
      if(rec.closed||!document.body.contains(rec.el)){
        clearInterval(timer);
        return;
      }
      attempts++;
      const text=frameText(rec.frame);
      const waiting=/waiting for stream|connection terminated|client connected connection killed/i.test(text);
      const ready=text&&!waiting;
      if(ready){
        rec.el.querySelector('.ander-browser-retry')?.remove();
        clearInterval(timer);
        return;
      }
      if(waiting&&attempts>=5&&!reloaded){
        reloaded=true;
        rec.frame.src=`/browser/?recover=${Date.now()}`;
        return;
      }
      if(waiting&&attempts>=12){
        addRetryPanel(rec);
        clearInterval(timer);
      }
      if(attempts>=18) clearInterval(timer);
    },2000);
  }

  openApp=function(appId){
    originalOpenApp(appId);
    if(appId==='browser') setTimeout(()=>watchBrowser(browserRecord()),700);
  };

  const existing=browserRecord();
  if(existing) watchBrowser(existing);
})();
