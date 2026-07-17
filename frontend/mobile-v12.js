(()=>{
  'use strict';
  if(window.__ANDER_TASKBAR_SEARCH_V12__) return;
  window.__ANDER_TASKBAR_SEARCH_V12__=true;

  const task=document.querySelector('.task');
  const startButton=document.querySelector('#startButton');
  if(!task||!startButton)return;

  /* Saca el botón de Inicio del grupo centrado (v10) y lo fija en la
     esquina izquierda, junto a un buscador de aplicaciones. */
  const corner=document.createElement('div');
  corner.className='task-start-search';
  task.insertBefore(corner,task.firstChild);
  corner.appendChild(startButton);

  const search=document.createElement('div');
  search.className='task-search';
  search.innerHTML=`<span class="icon">🔍</span><input type="text" id="taskbarSearch" placeholder="Buscar aplicaciones" autocomplete="off">`;
  corner.appendChild(search);
  const input=search.querySelector('input');

  const results=document.createElement('div');
  results.className='task-search-results';
  results.id='taskbarSearchResults';
  corner.appendChild(results);

  function matches(query){
    const q=query.trim().toLowerCase();
    if(!q)return[];
    return appOrder
      .map(id=>({id,route:routes[id]}))
      .filter(item=>item.route.title.toLowerCase().includes(q));
  }

  function renderResults(query){
    const items=matches(query);
    if(!query.trim()){closeResults();return}
    results.innerHTML=items.length
      ?items.map((item,index)=>`<button type="button" class="task-search-result${index===0?' active':''}" data-app="${item.id}"><img src="${item.route.icon}" alt=""><span>${item.route.title}</span></button>`).join('')
      :'<div class="task-search-empty">Sin resultados</div>';
    results.classList.add('open');
  }

  function closeResults(){
    results.classList.remove('open');
    results.innerHTML='';
  }

  function openFirstMatch(){
    const first=results.querySelector('.task-search-result');
    if(first)openApp(first.dataset.app);
    input.value='';
    closeResults();
  }

  input.addEventListener('input',()=>renderResults(input.value));
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();openFirstMatch()}
    else if(event.key==='Escape'){input.value='';closeResults();input.blur()}
  });
  input.addEventListener('focus',()=>{if(input.value.trim())renderResults(input.value)});

  results.addEventListener('click',event=>{
    const button=event.target.closest('[data-app]');
    if(!button)return;
    openApp(button.dataset.app);
    input.value='';
    closeResults();
  });

  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.task-start-search'))closeResults();
  });
})();
