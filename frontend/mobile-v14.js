(()=>{
  'use strict';
  if(window.__ANDER_DESKTOP_MENU_V14__) return;
  window.__ANDER_DESKTOP_MENU_V14__=true;

  const desktopEl=document.querySelector('#desktop');
  if(!desktopEl)return;

  const menu=document.createElement('div');
  menu.className='desktop-context-menu';
  menu.innerHTML=`
    <button type="button" data-action="refresh"><span class="menu-icon">🔄</span>Actualizar</button>
    <button type="button" data-action="new-folder"><span class="menu-icon">📁</span>Crear carpeta</button>
  `;
  document.body.appendChild(menu);

  function openMenuAt(x,y){
    menu.style.left=Math.min(x,window.innerWidth-200)+'px';
    menu.style.top=Math.min(y,window.innerHeight-110)+'px';
    menu.classList.add('open');
  }
  function closeMenu(){menu.classList.remove('open')}

  desktopEl.addEventListener('contextmenu',event=>{
    if(event.target.closest('.icon'))return;
    event.preventDefault();
    openMenuAt(event.clientX,event.clientY);
  });

  /* Pulsación larga en pantallas táctiles, igual que un clic derecho */
  let pressTimer=null;
  desktopEl.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch'||event.target.closest('.icon'))return;
    const{clientX,clientY}=event;
    pressTimer=setTimeout(()=>openMenuAt(clientX,clientY),550);
  });
  desktopEl.addEventListener('pointerup',()=>clearTimeout(pressTimer));
  desktopEl.addEventListener('pointermove',()=>clearTimeout(pressTimer));

  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.desktop-context-menu'))closeMenu();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});

  menu.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');
    if(!button)return;
    closeMenu();
    if(button.dataset.action==='refresh'){
      location.reload();
      return;
    }
    if(button.dataset.action==='new-folder'){
      const name=(prompt('Nombre de la nueva carpeta (se crea dentro de Escritorio):')||'').trim();
      if(!name)return;
      try{
        const response=await fetch(`/api/files/mkdir?path=${encodeURIComponent('/Escritorio/'+name)}`,{method:'POST'});
        if(!response.ok){
          const data=await response.json().catch(()=>({}));
          throw new Error(data.error||'No se pudo crear la carpeta.');
        }
        alert(`Carpeta creada en Escritorio/${name}. Ábrela desde "Archivos Linux".`);
      }catch(error){
        alert(error.message);
      }
    }
  });
})();
