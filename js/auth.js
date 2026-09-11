/* ============================================================
   GRAN SERVICIO — AUTENTICACIÓN (Supabase Auth)
   ============================================================
   Maneja registro, login, logout, recuperación de contraseña
   y detección de tipo de usuario (cliente / profesional / empleado)
   para redirigir a su panel correspondiente.
   ============================================================ */

/**
 * Registra un usuario en Supabase Auth y crea su fila en la tabla
 * correspondiente (usuario_cliente o usuario_profesional).
 * tipo: "cliente" | "profesional"
 */
async function gsRegistrar({ tipo, nombre, apellido, email, telefono, password, rubro = null, cuit = null, dni = null, certificado_url = null }) {
  if (!gsRequireSupabase()) return null;

  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: tipo === "profesional"
        ? (window.location.origin + "/profesional/verificacion-pendiente.html")
        : (window.location.origin + "/login.html"),
      data: { tipo, nombre, apellido, telefono, rubro, cuit, dni, certificado_url }
    }
  });

  if (authError) {
    gsToast("No se pudo crear la cuenta: " + authError.message, "error");
    return null;
  }

  if (authData.user && !authData.session) {
    gsToast("Cuenta creada. Revisá tu correo para confirmar la cuenta y después iniciá sesión.", "success");
  } else if (authData.user) {
    gsToast("Cuenta creada correctamente.", "success");
  }
  return authData;
}

/** Inicia sesión y redirige al panel correspondiente. */
async function gsLogin({ email, password }) {
  if (!gsRequireSupabase()) return;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    gsToast(/email not confirmed/i.test(error.message)
      ? "Tu correo todavía no está confirmado. Revisá tu bandeja de entrada."
      : "Correo o contraseña incorrectos.", "error");
    return;
  }
  await gsRedirigirSegunTipo(data.user.id);
}

/** Determina el tipo de usuario autenticado y redirige a su dashboard. */
async function gsRedirigirSegunTipo(idAuth) {
  const tipo = await gsObtenerTipoUsuario(idAuth);
  if (tipo === "empleado") {
    window.location.href = "/admin/dashboard.html";
    return;
  }
  if (tipo === "profesional") {
    const { data: perfil, error } = await supabaseClient
      .from("usuario_profesional")
      .select("id_profesional,estado_aprobacion,verificado,activo,motivo_rechazo,descripcion_rechazo")
      .eq("id_auth", idAuth).maybeSingle();
    if (error || !perfil) {
      gsToast("No pudimos cargar tu solicitud profesional. Intentá nuevamente.", "error");
      return;
    }
    if (perfil.estado_aprobacion !== "aprobado" || perfil.verificado !== true || perfil.activo !== true) {
      window.location.href = "/profesional/verificacion-pendiente.html";
      return;
    }
    window.location.href = "/profesional/dashboard.html";
    return;
  }
  if (tipo === "cliente") {
    window.location.href = "/cliente/dashboard.html";
    return;
  }
  gsToast("Tu usuario no tiene un perfil asociado todavía.", "error");
}

/** Consulta en qué tabla existe el id_auth dado. */
async function gsObtenerTipoUsuario(idAuth) {
  if (!gsRequireSupabase()) return null;

  const { data: empleado } = await supabaseClient
    .from("usuario_empleado").select("id_empleado").eq("id_auth", idAuth).maybeSingle();
  if (empleado) return "empleado";

  const { data: profesional } = await supabaseClient
    .from("usuario_profesional").select("id_profesional").eq("id_auth", idAuth).maybeSingle();
  if (profesional) return "profesional";

  const { data: cliente } = await supabaseClient
    .from("usuario_cliente").select("id_cliente").eq("id_auth", idAuth).maybeSingle();
  if (cliente) return "cliente";

  return null;
}

/** Cierra sesión y vuelve al inicio. */
async function gsLogout() {
  if (!gsRequireSupabase()) return;
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

/** Envía email de recuperación de contraseña. */
async function gsRecuperarPassword(email) {
  if (!gsRequireSupabase()) return;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/login.html",
  });
  if (error) gsToast("No se pudo enviar el correo: " + error.message, "error");
  else gsToast("Te enviamos un correo para restablecer tu contraseña.", "success");
}

/**
 * Protege una página: si no hay sesión, redirige a login.
 * Si se pasa un tipoEsperado ("cliente"|"profesional"|"empleado"),
 * también valida que el usuario sea de ese tipo.
 * Devuelve { user, tipo, perfil } o null si redirigió.
 */
async function gsConTimeout(promesa, ms = 10000) {
  let timer;
  try {
    return await Promise.race([
      promesa,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Tiempo de espera agotado al conectar con Supabase.")), ms); })
    ]);
  } finally { clearTimeout(timer); }
}

async function gsProtegerPagina(tipoEsperado = null) {
  if (!gsRequireSupabase()) return null;

  let session;
  try {
    const result = await gsConTimeout(supabaseClient.auth.getSession(), 10000);
    session = result?.data?.session || null;
  } catch (e) {
    console.error("[Gran Servicio] No se pudo comprobar la sesión:", e);
    gsToast("No se pudo conectar con la sesión. Recargá la página.", "error");
    return null;
  }
  if (!session) {
    window.location.href = "/login.html";
    return null;
  }

  let tipo;
  try { tipo = await gsConTimeout(gsObtenerTipoUsuario(session.user.id), 10000); }
  catch (e) { console.error("[Gran Servicio] No se pudo determinar el tipo de usuario:", e); gsToast("No se pudo cargar tu perfil. Recargá la página.", "error"); return null; }
  if (!tipo || (tipoEsperado && tipo !== tipoEsperado)) {
    gsToast("No tenés acceso a esta sección.", "error");
    window.location.href = "/index.html";
    return null;
  }

  const tabla = tipo === "empleado" ? "usuario_empleado" : tipo === "profesional" ? "usuario_profesional" : "usuario_cliente";
  let perfil;
  try {
    const selectPerfil = tipo === "empleado" ? "*, roles(id_rol,nombre)" : "*";
    const perfilResult = await gsConTimeout(supabaseClient.from(tabla).select(selectPerfil).eq("id_auth", session.user.id).single(), 10000);
    perfil = perfilResult?.data || null;
    if (perfilResult?.error) {
      console.error("[Gran Servicio] Error cargando perfil:", perfilResult.error);
      gsToast("No se pudo cargar tu perfil. Recargá la página.", "error");
      return null;
    }
  } catch (e) { console.error("[Gran Servicio] Timeout cargando perfil:", e); gsToast("No se pudo cargar tu perfil. Recargá la página.", "error"); return null; }

  if (tipo === "profesional") {
    const estado = perfil?.estado_aprobacion || "pendiente";
    const verificado = perfil?.verificado === true;
    const activo = perfil?.activo === true;
    if (estado !== "aprobado" || !verificado || !activo) {
      window.location.href = "/profesional/verificacion-pendiente.html";
      return null;
    }
  }

  if (tipo === "empleado") {
    const rol = String(perfil?.roles?.nombre || "").trim().toLowerCase();
    const ruta = (window.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
    const permisos = {
      "dashboard.html": ["administrador","soporte","operaciones","finanzas"],
      "aprobacion-profesionales.html": ["administrador"],
      "empleados.html": ["administrador"],
      "clientes.html": ["administrador","soporte","operaciones"],
      "profesionales.html": ["administrador","soporte","operaciones"],
      "solicitudes.html": ["administrador","operaciones"],
      "propuestas.html": ["administrador","operaciones"],
      "asignaciones.html": ["administrador","operaciones"],
      "pagos.html": ["administrador","finanzas"],
      "transacciones.html": ["administrador","finanzas"],
      "facturas.html": ["administrador","finanzas"],
      "comisiones.html": ["administrador","finanzas"],
      "reclamos.html": ["administrador","soporte"],
      "soporte.html": ["administrador","soporte"],
      "suscripciones.html": ["administrador","finanzas"],
      "geografia.html": ["administrador","operaciones"],
      "catalogos.html": ["administrador","operaciones"]
    };
    if (permisos[ruta] && !permisos[ruta].includes(rol)) {
      gsToast("Tu rol no tiene acceso a esta sección.", "error");
      window.location.href = "/admin/dashboard.html";
      return null;
    }
    document.documentElement.dataset.gsEmployeeRole = rol;
    document.querySelectorAll(".sidebar-nav a[href]").forEach(a => {
      const href = String(a.getAttribute("href") || "").split("?")[0].split("#")[0];
      const target = href.split("/").pop().toLowerCase();
      if (permisos[target] && !permisos[target].includes(rol)) {
        const li = a.closest("li");
        if (li) li.hidden = true;
      }
    });
  }

  return { user: session.user, tipo, perfil };
}
