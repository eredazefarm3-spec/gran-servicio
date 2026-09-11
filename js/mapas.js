/* ============================================================
   GRAN SERVICIO — MAPAS (Leaflet + OpenStreetMap)
   ============================================================
   Requiere en el <head> de la página:
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
   <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
   ============================================================ */

// Centro aproximado de la provincia de Córdoba, para vista inicial.
const GS_CENTRO_CORDOBA = { lat: -31.9, lng: -64.4 };

/** Crea el mapa base centrado en toda la provincia de Córdoba. */
function gsCrearMapa(elementId, { centro = GS_CENTRO_CORDOBA, zoom = 8 } = {}) {
  const mapa = L.map(elementId).setView([centro.lat, centro.lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapa);
  return mapa;
}

/** Pin personalizado con los colores de marca. */
function gsIcono(tipo = "profesional") {
  const color = tipo === "cliente" ? "var(--azul-medio)" : "#E07A2C";
  const colorReal = tipo === "cliente" ? "#14568F" : "#E07A2C";
  return L.divIcon({
    className: "",
    html: `<div class="gs-pin" style="background:${colorReal}"><span>${tipo === "cliente" ? "C" : "P"}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

/** Centra el mapa suavemente en una posición (usado tras geolocalizar al cliente). */
function gsCentrarMapa(mapa, { lat, lng }, zoom = 14) {
  mapa.flyTo([lat, lng], zoom, { duration: 1.1 });
}

/** Agrega un marcador de cliente o profesional con popup informativo. */
function gsAgregarMarcador(mapa, { lat, lng, titulo, subtitulo, tipo = "profesional" }) {
  const marker = L.marker([lat, lng], { icon: gsIcono(tipo) }).addTo(mapa);
  if (titulo) {
    marker.bindPopup(`<strong>${gsEscapeHtml(titulo)}</strong>${subtitulo ? `<br><span style="color:#6B7A89">${gsEscapeHtml(subtitulo)}</span>` : ""}`);
  }
  return marker;
}

/** Pinta un círculo de "zona de demanda" con el color correspondiente al nivel. */
function gsAgregarZonaDemanda(mapa, { lat, lng, nivel, radio = 1800 }) {
  const colores = {
    baja: "#BFE0FA",
    media: "#5FA9DD",
    alta: "#F4A25C",
    muy_alta: "#B44A11",
  };
  return L.circle([lat, lng], {
    radius: radio,
    color: colores[nivel] || colores.baja,
    fillColor: colores[nivel] || colores.baja,
    fillOpacity: 0.45,
    weight: 1,
  }).addTo(mapa);
}


/**
 * Carga toda la geografía disponible de Córdoba.
 * Prioridad: Supabase lugares_geograficos (catálogo persistido).
 * Fallback: API pública GeoRef Argentina si el catálogo aún no fue sincronizado.
 * Se crean capas separadas para localidades, municipios, gobiernos locales,
 * asentamientos/parajes y localidades censales para que el usuario pueda
 * activar/desactivar cada nivel sin perder cobertura.
 */
async function gsCargarGeografiaCordoba(mapa, {mostrarTodo = true} = {}) {
  const capas = {
    localidades: L.layerGroup(),
    municipios: L.layerGroup(),
    gobiernos: L.layerGroup(),
    asentamientos: L.layerGroup(),
    censales: L.layerGroup()
  };
  const grupos = L.layerGroup();
  Object.values(capas).forEach(c => c.addTo(grupos));

  let lugares = [];
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const { data } = await supabaseClient
      .from("lugares_geograficos")
      .select("id_lugar,nombre,tipo,categoria,departamento,municipio,localidad_censal,latitud,longitud,poblacion,fuente")
      .eq("activo", true)
      .eq("provincia_codigo", "14")
      .limit(10000);
    lugares = data || [];
  }

  if (lugares.length < 1000) {
    const endpoints = [
      ["localidades","localidad"],
      ["municipios","municipio"],
      ["gobiernos-locales","gobierno_local"],
      ["asentamientos","asentamiento"],
      ["localidades-censales","localidad_censal"]
    ];
    for (const [endpoint,tipo] of endpoints) {
      try {
        const r = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/${endpoint}?provincia=14&max=5000`);
        if (!r.ok) continue;
        const j = await r.json();
        const key = endpoint === "localidades-censales" ? "localidades_censales" : endpoint.replaceAll("-","_");
        (j[key] || []).forEach(x => lugares.push({
          nombre:x.nombre, tipo, categoria:x.categoria,
          departamento:x.departamento?.nombre, municipio:x.municipio?.nombre || x.gobierno_local?.nombre,
          localidad_censal:x.localidad_censal?.nombre,
          latitud:x.centroide?.lat, longitud:x.centroide?.lon,
          poblacion:x.poblacion, fuente:"GeoRef Argentina"
        }));
      } catch (e) {
        console.warn("GeoRef no disponible:", e);
      }
    }
  }

  const dedup = new Map();
  lugares.forEach(x => {
    const key = `${gsEscapeHtml(x.tipo)}|${String(x.nombre||"").toLowerCase()}|${Number(x.latitud||0).toFixed(5)}|${Number(x.longitud||0).toFixed(5)}`;
    if (!dedup.has(key)) dedup.set(key, x);
  });
  lugares = Array.from(dedup.values());

  const byType = {
    localidad: capas.localidades,
    municipio: capas.municipios,
    gobierno_local: capas.gobiernos,
    asentamiento: capas.asentamientos,
    localidad_censal: capas.censales
  };

  lugares.filter(x => Number.isFinite(Number(x.latitud)) && Number.isFinite(Number(x.longitud)))
    .forEach(x => {
      const tipo = x.tipo || "asentamiento";
      const color = tipo === "municipio" ? "#E07A2C"
        : tipo === "gobierno_local" ? "#B44A11"
        : tipo === "localidad" ? "#14568F"
        : tipo === "localidad_censal" ? "#4C8FC4"
        : "#F4A25C";

      const marker = L.circleMarker([Number(x.latitud), Number(x.longitud)], {
        radius: tipo === "localidad" || tipo === "municipio" ? 6 : 4,
        color,
        fillColor: color,
        fillOpacity: .95,
        weight: 2
      });
      const detalle = [
        `<strong>${gsEscapeHtml(x.nombre || "Sin nombre")}</strong>`,
        x.categoria ? `Tipo: ${gsEscapeHtml(x.categoria)}` : `Entidad: ${tipo.replaceAll("_"," ")}`,
        x.departamento ? `Departamento: ${gsEscapeHtml(x.departamento)}` : "",
        x.municipio ? `Municipio/Gobierno local: ${gsEscapeHtml(x.municipio)}` : "",
        x.poblacion != null ? `Población registrada: ${x.poblacion}` : "",
        x.fuente ? `Fuente: ${gsEscapeHtml(x.fuente)}` : ""
      ].filter(Boolean).join("<br>");
      marker.bindPopup(detalle);
      (byType[tipo] || capas.asentamientos).addLayer(marker);
    });

  const control = L.control.layers(null, {
    "Localidades": capas.localidades,
    "Municipios": capas.municipios,
    "Gobiernos locales / comunas": capas.gobiernos,
    "Asentamientos / parajes / barrios": capas.asentamientos,
    "Localidades censales": capas.censales
  }, {collapsed:true, position:"topright"});
  control.addTo(mapa);

  const host = mapa.getContainer().parentElement;
  if (host && !host.querySelector(".gs-geografia-search")) {
    const search = document.createElement("div");
    search.className = "gs-geografia-search";
    search.innerHTML = `
      <input type="search" placeholder="Buscar ciudad, barrio, pueblo o paraje de Córdoba" aria-label="Buscar lugar">
      <button type="button">Buscar</button>
    `;
    host.appendChild(search);
    const input = search.querySelector("input");
    const button = search.querySelector("button");
    const run = async () => {
      const res = await gsBuscarLugarCordoba(mapa, input.value);
      if (!res) gsToast("No encontramos ese lugar en la cobertura geográfica de Córdoba.", "info");
      else gsToast(`${res.length} coincidencia(s) encontrada(s).`, "success");
    };
    button.addEventListener("click", run);
    input.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
  }

  // Vista provincial real de Córdoba.
  mapa.fitBounds([[-35.1,-65.8],[-29.5,-61.7]], {padding:[20,20]});
  mapa._granServicioGeografia = {capas, lugares, control};
  return lugares;
}

/** Busca una localidad/barrio/paraje en el catálogo de Córdoba y centra el mapa. */
async function gsBuscarLugarCordoba(mapa, termino) {
  const q = String(termino || "").trim();
  if (!q) return null;
  let resultados = [];
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const { data } = await supabaseClient
      .from("lugares_geograficos")
      .select("nombre,tipo,departamento,municipio,latitud,longitud")
      .eq("activo", true)
      .eq("provincia_codigo", "14")
      .ilike("nombre", `%${q}%`)
      .limit(20);
    resultados = data || [];
  }
  if (!resultados.length) {
    try {
      const r = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/localidades?provincia=14&nombre=${encodeURIComponent(q)}&max=20`);
      const j = await r.json();
      resultados = (j.localidades || []).map(x => ({
        nombre:x.nombre, tipo:"localidad", departamento:x.departamento?.nombre,
        municipio:x.municipio?.nombre, latitud:x.centroide?.lat, longitud:x.centroide?.lon
      }));
    } catch {}
  }
  if (!resultados.length || resultados[0].latitud == null) return null;
  const r = resultados[0];
  mapa.flyTo([Number(r.latitud), Number(r.longitud)], 13, {duration:.8});
  return resultados;
}
