/* Gran Servicio — comportamiento visual común para paneles */
(function(){
  const path=location.pathname.toLowerCase();
  const role=path.includes('/admin/')?'admin':path.includes('/profesional/')?'profesional':path.includes('/cliente/')?'cliente':'';
  if(role) document.documentElement.dataset.gsRole=role;
  function init(){
    document.body.classList.add('gs-panel-page');
    const main=document.querySelector('.main-content');
    if(!main) return;
    main.classList.add('gs-panel-main');
    document.querySelectorAll('table').forEach(t=>{
      if(t.parentElement && !t.parentElement.classList.contains('gs-table-wrap')){
        const w=document.createElement('div');w.className='gs-table-wrap';t.parentNode.insertBefore(w,t);w.appendChild(t);
      }
    });
    document.querySelectorAll('.loading-state').forEach(el=>el.setAttribute('aria-live','polite'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
