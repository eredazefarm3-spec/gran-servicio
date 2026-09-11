/* Panel de propuestas administrativas. */
(async function cargarPanelPropuestas() {
  const sesion = await gsProtegerPagina("empleado");
  if (!sesion) return;

  const perfil = sesion.perfil || {};
  document.getElementById("nombre-usuario").textContent = [perfil.nombre, perfil.apellido].filter(Boolean).join(" ");
  document.getElementById("avatar-usuario").textContent = ((perfil.nombre || "")[0] + (perfil.apellido || "")[0]).toUpperCase();
  window.SESION = sesion;

  const resultado = await supabaseClient.from("propuestas_profesional")
    .select("monto, fecha_propuesta, estados(nombre), usuario_profesional(nombre,apellido), solicitud_servicio(descripcion)")
    .order("fecha_propuesta", { ascending: false })
    .limit(100);

  const data = resultado.data || [];
  const escape = typeof gsEscapeHtml === "function" ? gsEscapeHtml : function (value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
      return entities[char];
    });
  };

  const contenido = document.getElementById("contenido-pagina");
  if (!data.length) {
    contenido.innerHTML = '<div class="empty-state">Sin propuestas todavía.</div>';
    return;
  }

  const filas = data.map(function (propuesta) {
    const profesional = propuesta.usuario_profesional || {};
    const solicitud = propuesta.solicitud_servicio || {};
    const estado = propuesta.estados || {};
    const monto = Number(propuesta.monto || 0).toLocaleString("es-AR");
    return [
      "<tr>",
      "<td>", escape(profesional.nombre || ""), " ", escape(profesional.apellido || ""), "</td>",
      "<td>", escape(String(solicitud.descripcion || "").slice(0, 50)), "</td>",
      "<td>$", monto, "</td>",
      "<td><span class=\"badge badge-neutro\">", escape(estado.nombre || "—"), "</span></td>",
      "</tr>"
    ].join("");
  }).join("");

  contenido.innerHTML = [
    "<table><thead><tr>",
    "<th>Profesional</th><th>Solicitud</th><th>Monto</th><th>Estado</th>",
    "</tr></thead><tbody>", filas, "</tbody></table>"
  ].join("");
})();
