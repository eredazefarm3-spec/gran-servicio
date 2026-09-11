/* Carga los perfiles demo desde datos estáticos. */
window.GS_PROFESIONALES_DEMO = [];

(async function cargarProfesionalesDemo() {
  try {
    const respuesta = await fetch('data/profesionales-demo.json', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo demo');
    const datos = await respuesta.json();
    window.GS_PROFESIONALES_DEMO = Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.warn('Gran Servicio: catálogo demo no disponible.', error);
  } finally {
    window.dispatchEvent(new Event('gs-demo-profesionales-listos'));
  }
})();
