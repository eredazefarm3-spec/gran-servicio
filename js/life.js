(function(){
  'use strict';
  const init=()=>{
    document.body.classList.add('page-enter');
    document.querySelectorAll('.card,.panel,.stat-card,.section,.hero,.map-wrap').forEach((el,i)=>{
      if(!el.classList.contains('gs-reveal')) el.classList.add('gs-reveal');
      el.style.transitionDelay=Math.min(i*35,280)+'ms';
    });
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08});
      document.querySelectorAll('.gs-reveal').forEach(e=>io.observe(e));
    }else document.querySelectorAll('.gs-reveal').forEach(e=>e.classList.add('is-visible'));
    document.querySelectorAll('.btn').forEach(btn=>btn.addEventListener('click',function(ev){
      const r=this.getBoundingClientRect(),s=document.createElement('span');s.className='gs-ripple';const d=Math.max(r.width,r.height);
      s.style.width=s.style.height=d+'px';s.style.left=(ev.clientX-r.left-d/2)+'px';s.style.top=(ev.clientY-r.top-d/2)+'px';this.appendChild(s);setTimeout(()=>s.remove(),650);
    }));
    document.querySelectorAll('img').forEach(img=>img.addEventListener('error',function(){
      this.classList.add('gs-image-fallback');
      this.removeAttribute('src');
      this.alt=this.alt||'Gran Servicio';
    }));
    const toggle=document.querySelector('.nav-toggle'),links=document.querySelector('.nav-links');
    if(toggle&&links) toggle.addEventListener('click',()=>links.classList.toggle('open'));
    if(!document.querySelector('.gs-floating-help')){
      const a=document.createElement('a');a.href='/contacto.html';a.className='gs-floating-help';a.setAttribute('aria-label','Contactar a Gran Servicio');a.textContent='?';document.body.appendChild(a);
    }
    const path=location.pathname.replace(/\\/g,'/');
    document.querySelectorAll('.nav-links a').forEach(a=>{try{const u=new URL(a.href,location.href);if(u.pathname===path)a.setAttribute('aria-current','page')}catch{}});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
