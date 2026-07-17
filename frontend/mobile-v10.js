(()=>{
  'use strict';
  if(window.__ANDER_TASKBAR_V10__) return;
  window.__ANDER_TASKBAR_V10__=true;

  /* Agrupa Inicio + iconos abiertos en un solo bloque para poder centrarlo,
     dejando la bandeja del sistema (red/batería/reloj) fija a la derecha,
     como en la barra de tareas de Windows 11. */
  const task=document.querySelector('.task');
  const start=document.querySelector('#startButton');
  const apps=document.querySelector('#taskApps');
  if(!task||!start||!apps)return;

  const center=document.createElement('div');
  center.className='task-center';
  task.insertBefore(center,start);
  center.appendChild(start);
  center.appendChild(apps);
})();
