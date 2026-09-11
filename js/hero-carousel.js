/* ============================================================
   GRAN SERVICIO — HERO CAROUSEL
   6 imagenes en fondo-web/, cambio automatico cada 5s,
   controles, dots, lazy loading, respeta prefers-reduced-motion.
   ============================================================ */

(function() {
  var INTERVALO = 5000;
  var IMAGENES = [
    "fondo-web/ChatGPT Image 9 sept 2026, 07_42_53 p.m..png",
    "fondo-web/ChatGPT Image 9 sept 2026, 07_43_08 p.m..png",
    "fondo-web/ChatGPT Image 9 sept 2026, 07_43_14 p.m..png",
    "fondo-web/ChatGPT Image 9 sept 2026, 07_43_19 p.m..png",
    "fondo-web/ChatGPT Image 9 sept 2026, 07_43_24 p.m..png",
    "fondo-web/ChatGPT Image 9 sept 2026, 07_43_29 p.m..png"
  ];

  var ALTS = [
    "Profesional de plomeria trabajando en Cordoba",
    "Electricista realizando instalacion en hogar",
    "Albanil construyendo en Cordoba",
    "Tecnico en reparaciones",
    "Personal de limpieza profesional",
    "Profesional de jardineria"
  ];

  var prefReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var idx = 0;
  var timer = null;
  var inicializado = false;

  function gsIniciarCarrusel() {
    if (inicializado) return;
    inicializado = true;
    var contenedor = document.getElementById("gs-hero-carousel");
    if (!contenedor) return;

    // Limpiar hijos existentes pero mantener la estructura
    contenedor.innerHTML = "";

    // Overlay para legibilidad del texto en hero full (se inyecta aqui para que este sobre imagenes pero bajo controles)
    var overlay = document.createElement("div");
    overlay.className = "gs-hero-overlay";
    contenedor.appendChild(overlay);

    // Crear inner
    var inner = document.createElement("div");
    inner.className = "gs-carousel-inner";
    inner.id = "gs-carousel-inner";

    IMAGENES.forEach(function(src, i) {
      var slide = document.createElement("div");
      slide.className = "gs-carousel-slide";
      var img = document.createElement("img");
      img.src = i === 0 ? src : "";  // Lazy: solo carga la primera
      img.dataset.src = src;
      img.alt = ALTS[i] || "Gran Servicio";
      img.loading = i === 0 ? "eager" : "lazy";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;border-radius:16px";
      if (i > 0) img.classList.add("gs-lazy");
      slide.appendChild(img);
      inner.appendChild(slide);
    });

    contenedor.appendChild(inner);

    // Dots
    var dotsBar = document.createElement("div");
    dotsBar.className = "gs-carousel-controls";
    dotsBar.id = "gs-carousel-dots";
    IMAGENES.forEach(function(_, i) {
      var dot = document.createElement("button");
      dot.className = "gs-carousel-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Ir a imagen " + (i+1));
      dot.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); gsIrA(i); }, false);
      dotsBar.appendChild(dot);
    });
    contenedor.appendChild(dotsBar);

    // Botones prev/next (solo visible en md+)
    var btnPrev = document.createElement("button");
    btnPrev.innerHTML = "&#8249;";
    btnPrev.setAttribute("aria-label", "Imagen anterior");
    btnPrev.style.cssText = "position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(7,31,54,.55);border:none;color:#fff;font-size:1.8rem;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;min-height:0";
    btnPrev.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); gsIrA((idx - 1 + IMAGENES.length) % IMAGENES.length); }, false);

    var btnNext = document.createElement("button");
    btnNext.innerHTML = "&#8250;";
    btnNext.setAttribute("aria-label", "Imagen siguiente");
    btnNext.style.cssText = "position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(7,31,54,.55);border:none;color:#fff;font-size:1.8rem;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;min-height:0";
    btnNext.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); gsIrA((idx + 1) % IMAGENES.length); }, false);

    contenedor.appendChild(btnPrev);
    contenedor.appendChild(btnNext);

    // Touch/swipe
    var touchStartX = 0;
    contenedor.addEventListener("touchstart", function(e) { touchStartX = e.changedTouches[0].clientX; }, {passive:true});
    contenedor.addEventListener("touchend", function(e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) gsIrA(diff > 0 ? (idx + 1) % IMAGENES.length : (idx - 1 + IMAGENES.length) % IMAGENES.length);
    }, {passive:true});

    // Autoplay si no reduced motion
    if (!prefReducedMotion) {
      timer = setInterval(function() {
        gsIrA((idx + 1) % IMAGENES.length);
      }, INTERVALO);
    }

    // Pause en hover
    contenedor.addEventListener("mouseenter", function() { if (timer) { clearInterval(timer); timer = null; } });
    contenedor.addEventListener("mouseleave", function() {
      if (!prefReducedMotion && !timer) {
        timer = setInterval(function() { gsIrA((idx + 1) % IMAGENES.length); }, INTERVALO);
      }
    });
  }

  function gsIrA(nuevoIdx) {
    idx = nuevoIdx;
    var inner = document.getElementById("gs-carousel-inner");
    if (inner) inner.style.transform = "translateX(-" + (idx * 100) + "%)";

    // Actualizar dots
    var dots = document.querySelectorAll(".gs-carousel-dot");
    dots.forEach(function(d, i) { d.classList.toggle("active", i === idx); });

    // Lazy load imagen actual y siguiente
    [idx, (idx+1) % IMAGENES.length].forEach(function(i) {
      var slides = document.querySelectorAll(".gs-carousel-slide");
      if (slides[i]) {
        var img = slides[i].querySelector("img.gs-lazy");
        if (img && img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.remove("gs-lazy");
        }
      }
    });
  }

  // Inicializar al cargar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", gsIniciarCarrusel);
  } else {
    gsIniciarCarrusel();
  }

  // Exponer funcion global por si alguna pagina necesita reiniciar
  window.gsIniciarCarrusel = gsIniciarCarrusel;
})();
