/* ============================================================
   GRAN SERVICIO — CONEXIÓN CENTRAL A SUPABASE
   ============================================================
   1) Creá un proyecto en https://supabase.com
   2) Corré /sql/001_schema.sql en el SQL Editor de tu proyecto
   3) Pegá acá abajo tu URL y tu ANON KEY (Project Settings > API)
   Nunca pegues la SERVICE_ROLE key en este archivo: esa clave
   solo puede vivir en Edge Functions / backend seguro.
   ============================================================ */

const SUPABASE_URL = "https://lggfrzxlzwyovjajuzbu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7ai-AZlQWMHtl_TCVsQEEw_puUMQWVO";

// Requiere el script de Supabase cargado antes en el <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

/** Escapa texto no confiable antes de insertarlo en HTML. Usar para datos provenientes de Supabase o del usuario. */
function gsEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const supabaseClient = (SUPABASE_URL.startsWith("http"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

if (!supabaseClient) {
  console.warn(
    "[Gran Servicio] Todavía no configuraste SUPABASE_URL / SUPABASE_ANON_KEY en js/supabase.js. " +
    "Las funciones que dependen de la base de datos no funcionarán hasta que lo hagas."
  );
}

/** Muestra un toast simple en la esquina inferior derecha. */
function gsToast(mensaje, tipo = "info") {
  let cont = document.getElementById("toast-container");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "toast-container";
    document.body.appendChild(cont);
  }
  const el = document.createElement("div");
  el.className = "toast" + (tipo === "error" ? " toast-error" : tipo === "success" ? " toast-success" : "");
  el.textContent = mensaje;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/** Verifica que Supabase esté configurado antes de operar; si no, avisa. */
function gsRequireSupabase() {
  if (!supabaseClient) {
    gsToast("Falta configurar la conexión a Supabase (js/supabase.js).", "error");
    return false;
  }
  return true;
}
