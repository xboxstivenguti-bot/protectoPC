(()=>{
  const svg=(body)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`)}`;
  const icons={
    linux:svg('<rect width="128" height="128" rx="28" fill="#171c26"/><ellipse cx="64" cy="70" rx="36" ry="42" fill="#f6f7fb"/><ellipse cx="64" cy="50" rx="28" ry="31" fill="#111827"/><circle cx="54" cy="45" r="5" fill="#fff"/><circle cx="74" cy="45" r="5" fill="#fff"/><path d="M52 58h24l-12 10z" fill="#f5b942"/><path d="M37 83c9 17 45 17 54 0-6 29-48 29-54 0z" fill="#f5b942"/><ellipse cx="43" cy="110" rx="20" ry="7" fill="#f5b942"/><ellipse cx="85" cy="110" rx="20" ry="7" fill="#f5b942"/>'),
    chromium:svg('<circle cx="64" cy="64" r="59" fill="#fff"/><path d="M64 64 25 12a59 59 0 0 1 90 27H69z" fill="#ea4335"/><path d="M64 64h51a59 59 0 0 1-73 55l27-46z" fill="#fbbc05"/><path d="m64 64-22 55A59 59 0 0 1 25 12z" fill="#34a853"/><circle cx="64" cy="64" r="27" fill="#1688df" stroke="#fff" stroke-width="8"/>'),
    vscode:svg('<rect width="128" height="128" rx="26" fill="#071b2d"/><path d="M91 15 49 54 26 36 12 49l24 23-24 23 14 13 23-19 42 39 25-12V27z" fill="#22a7f2"/><path d="M91 43v42L62 64z" fill="#fff" opacity=".95"/><path d="M91 15v113l25-12V27z" fill="#0877c9"/>'),
    powershell:svg('<rect x="8" y="16" width="112" height="96" rx="22" fill="#1769c2"/><path d="m34 43 28 21-28 21" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M65 88h30" stroke="#fff" stroke-width="11" stroke-linecap="round"/>'),
    files:svg('<rect width="128" height="128" rx="26" fill="#1c2533"/><path d="M18 39h40l10 12h42v58H18z" fill="#f29d35"/><path d="M18 30h36l10 11h46v18H18z" fill="#ffc35a"/><rect x="30" y="63" width="68" height="34" rx="7" fill="#ffe4aa" opacity=".72"/>'),
    settings:svg('<rect width="128" height="128" rx="26" fill="#263244"/><path d="M58 14h12l4 16 12 5 14-8 9 9-8 14 5 12 16 4v12l-16 4-5 12 8 14-9 9-14-8-12 5-4 16H58l-4-16-12-5-14 8-9-9 8-14-5-12-16-4V66l16-4 5-12-8-14 9-9 14 8 12-5z" fill="#aebdd1"/><circle cx="64" cy="72" r="22" fill="#263244"/><circle cx="64" cy="72" r="11" fill="#e7eef9"/>')
  };

  const detectKey=(img)=>{
    const raw=(img.getAttribute('src')||'').toLowerCase();
    if(raw.includes('vscode')) return 'vscode';
    for(const key of ['powershell','chromium','linux','files','settings']) if(raw.includes(key)) return key;
    const label=(img.closest('button,span,section,header')?.textContent||'').toLowerCase();
    if(label.includes('visual studio')) return 'vscode';
    if(label.includes('powershell')) return 'powershell';
    if(label.includes('chromium')) return 'chromium';
    if(label.includes('linux')&&!label.includes('archivo')) return 'linux';
    if(label.includes('archivo')) return 'files';
    if(label.includes('config')) return 'settings';
    return null;
  };
  const patchImg=(img)=>{
    const key=detectKey(img);
    if(!key||img.dataset.anderIcon===key) return;
    img.dataset.anderIcon=key;
    img.removeAttribute('srcset');
    img.src=icons[key];
  };
  const patchIcons=()=>document.querySelectorAll('img').forEach(patchImg);
  patchIcons();
  new MutationObserver(patchIcons).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('pageshow',patchIcons);

  const originalEmitKeyboard=emitKeyboard;
  const codes={
    Escape:27,Tab:9,Enter:13,Backspace:8,Delete:46,Home:36,End:35,
    ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Space:32,
    F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123
  };
  const codeFor=(spec)=>{
    if(codes[spec.key]!=null) return codes[spec.key];
    if(codes[spec.code]!=null) return codes[spec.code];
    if(/^Key[A-Z]$/.test(spec.code||'')) return spec.code.charCodeAt(3);
    if(/^Digit[0-9]$/.test(spec.code||'')) return spec.code.charCodeAt(5);
    if(typeof spec.key==='string'&&spec.key.length===1) return spec.key.toUpperCase().charCodeAt(0);
    return 0;
  };

  emitKeyboard=function(type,spec){
    const rec=activeId?windows.get(activeId):null;
    if(!rec||rec.appId!=='powershell') return originalEmitKeyboard(type,spec);
    const frame=rec.frame;
    try{
      const win=frame.contentWindow;
      const doc=frame.contentDocument||win.document;
      const target=doc.querySelector('.xterm-helper-textarea, textarea')||doc.activeElement||doc.body;
      target.focus({preventScroll:true});
      const keyCode=codeFor(spec);
      const printable=typeof spec.key==='string'&&spec.key.length===1;
      const event=new win.KeyboardEvent(type,{
        key:spec.key,
        code:spec.code,
        location:0,
        bubbles:true,
        cancelable:true,
        composed:true,
        ctrlKey:ctrl,
        altKey:alt,
        shiftKey:shift,
        metaKey:meta,
        repeat:false
      });
      for(const [name,value] of Object.entries({keyCode,which:keyCode,charCode:type==='keypress'&&printable?keyCode:0})){
        try{Object.defineProperty(event,name,{get:()=>value})}catch{}
      }
      target.dispatchEvent(event);
      win.focus();
    }catch{
      originalEmitKeyboard(type,spec);
    }
  };
})();
