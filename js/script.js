/* ============================================================
   GRAN SERVICIO — SCRIPT GENERAL (páginas públicas)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Menú hamburguesa
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  gsMostrarEstadoSesionEnNavbar();
  gsCargarCategoriasEnHome();
});

/** Si hay sesión activa, cambia "Iniciar sesión / Registrarse" por "Ir a mi panel". */
async function gsMostrarEstadoSesionEnNavbar() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const acciones = document.querySelector(".nav-actions");
  if (!session || !acciones) return;

  const tipo = await gsObtenerTipoUsuario(session.user.id);
  const destino = tipo === "empleado" ? "/admin/dashboard.html"
    : tipo === "profesional" ? "/profesional/dashboard.html"
    : "/cliente/dashboard.html";

  acciones.innerHTML = `
    <a class="btn btn-outline btn-sm" href="${destino}">Mi panel</a>
    <button class="btn btn-accent btn-sm" onclick="gsLogout()">Cerrar sesión</button>
  `;
}

/** Carga dinámicamente categorías de servicio desde Supabase en la home (si el bloque existe). */
async function gsCargarCategoriasEnHome() {
  const cont = document.getElementById("categorias-home");
  if (!cont || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("categorias_servicio")
    .select("id_categoria, nombre, descripcion, servicios(nombre)")
    .eq("activo", true);

  if (error || !data) return;

  cont.innerHTML = data.map(cat => `
    <div class="card card-hover">
      <span class="eyebrow">Categoría</span>
      <h3>${gsEscapeHtml(cat.nombre)}</h3>
      <p class="muted">${gsEscapeHtml(cat.descripcion || "")}</p>
      <p style="font-size:.85rem">${gsEscapeHtml((cat.servicios || []).slice(0,4).map(s => s.nombre).join(" · "))}</p>
    </div>
  `).join("");
}

/** Redirige el buscador de texto libre del home hacia el paso 1 de crear solicitud. */
function gsBuscarLibre(event) {
  event.preventDefault();
  const texto = document.getElementById("busqueda-libre").value.trim();
  const url = "/cliente/crear-solicitud.html" + (texto ? `?q=${encodeURIComponent(texto)}` : "");
  window.location.href = "/login.html?next=" + encodeURIComponent(url);
}
