(()=>{
  const svg=(body)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`)}`;
  const icons={
    linux:svg('<rect width="128" height="128" rx="28" fill="#171c26"/><ellipse cx="64" cy="70" rx="36" ry="42" fill="#f6f7fb"/><ellipse cx="64" cy="50" rx="28" ry="31" fill="#111827"/><circle cx="54" cy="45" r="5" fill="#fff"/><circle cx="74" cy="45" r="5" fill="#fff"/><path d="M52 58h24l-12 10z" fill="#f5b942"/><path d="M37 83c9 17 45 17 54 0-6 29-48 29-54 0z" fill="#f5b942"/><ellipse cx="43" cy="110" rx="20" ry="7" fill="#f5b942"/><ellipse cx="85" cy="110" rx="20" ry="7" fill="#f5b942"/>'),
    chromium:svg('<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2f7df6"/><stop offset="1" stop-color="#00b8d9"/></linearGradient></defs><circle cx="64" cy="64" r="59" fill="#fff"/><path d="M64 64 25 12a59 59 0 0 1 90 27H69z" fill="#ea4335"/><path d="M64 64h51a59 59 0 0 1-73 55l27-46z" fill="#fbbc05"/><path d="m64 64-22 55A59 59 0 0 1 25 12z" fill="#34a853"/><circle cx="64" cy="64" r="27" fill="url(#b)" stroke="#fff" stroke-width="8"/>'),
    vscode:svg('<rect width="128" height="128" rx="26" fill="#071b2d"/><path d="M91 15 49 54 26 36 12 49l24 23-24 23 14 13 23-19 42 39 25-12V27z" fill="#22a7f2"/><path d="M91 43v42L62 64z" fill="#fff" opacity=".95"/><path d="M91 15v113l25-12V27z" fill="#0877c9"/>'),
    powershell:svg('<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4ba3ff"/><stop offset="1" stop-color="#083b86"/></linearGradient></defs><rect x="8" y="16" width="112" height="96" rx="22" fill="url(#p)"/><path d="m34 43 28 21-28 21" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M65 88h30" stroke="#fff" stroke-width="11" stroke-linecap="round"/>'),
    files:svg('<rect width="128" height="128" rx="26" fill="#1c2533"/><path d="M18 39h40l10 12h42v58H18z" fill="#f29d35"/><path d="M18 30h36l10 11h46v18H18z" fill="#ffc35a"/><rect x="30" y="63" width="68" height="34" rx="7" fill="#ffe4aa" opacity=".72"/>'),
    settings:svg('<rect width="128" height="128" rx="26" fill="#263244"/><g fill="#aebdd1"><path d="M58 14h12l4 16 12 5 14-8 9 9-8 14 5 12 16 4v12l-16 4-5 12 8 14-9 9-14-8-12 5-4 16H58l-4-16-12-5-14 8-9-9 8-14-5-12-16-4V66l16-4 5-12-8-14 9-9 14 8 12-5z"/><circle cx="64" cy="72" r="21" fill="#263244"/></g><circle cx="64" cy="72" r="11" fill="#dce7f5"/></svg>')
  };
  const keyFrom=(src='')=>Object.keys(icons).find(k=>src.toLowerCase().includes(k==='vscode'?'vscode':k));
  const patchImg=(img)=>{
    const raw=img.getAttribute('src')||'';
    let key=keyFrom(raw);
    if(!key){
      const label=(img.closest('button,span,section')?.textContent||'').toLowerCase();
      key=label.includes('visual studio')?'vscode':label.includes('powershell')?'powershell':label.includes('chromium')?'chromium':label.includes('linux')?'linux':label.includes('archivo')?'files':label.includes('config')?'settings':null;
    }
    if(key&&img.dataset.anderIcon!==key){img.src=icons[key];img.dataset.anderIcon=key;img.removeAttribute('srcset');}
  };
  const patch=()=>document.querySelectorAll('img').forEach(patchImg);
  patch();
  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('pageshow',patch);
})();
