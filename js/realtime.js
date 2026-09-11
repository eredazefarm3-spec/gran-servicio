/* ============================================================
   GRAN SERVICIO — SUPABASE REALTIME
   ============================================================
   Centraliza las suscripciones a cambios en tablas clave para
   que la interfaz se actualice sola, sin recargar la página.
   ============================================================ */

/** Escucha nuevas propuestas para una solicitud específica del cliente. */
function gsEscucharPropuestas(idSolicitud, onNuevaPropuesta) {
  if (!gsRequireSupabase()) return null;
  return supabaseClient
    .channel(`propuestas-solicitud-${idSolicitud}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "propuestas_profesional", filter: `id_solicitud=eq.${idSolicitud}` },
      (payload) => onNuevaPropuesta(payload.new)
    )
    .subscribe();
}

/** Escucha cambios de estado de una solicitud (línea de tiempo en vivo). */
function gsEscucharEstadoSolicitud(idSolicitud, onCambioEstado) {
  if (!gsRequireSupabase()) return null;
  return supabaseClient
    .channel(`estado-solicitud-${idSolicitud}`)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "solicitud_servicio", filter: `id_solicitud=eq.${idSolicitud}` },
      (payload) => onCambioEstado(payload.new)
    )
    .subscribe();
}

/** Escucha nuevas notificaciones para un cliente o profesional. */
function gsEscucharNotificaciones({ idCliente = null, idProfesional = null }, onNueva) {
  if (!gsRequireSupabase()) return null;
  const filtro = idCliente ? `id_cliente=eq.${idCliente}` : `id_profesional=eq.${idProfesional}`;
  return supabaseClient
    .channel(`notificaciones-${idCliente || idProfesional}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "notificaciones", filter: filtro },
      (payload) => onNueva(payload.new)
    )
    .subscribe();
}

/** Escucha nuevos mensajes en una conversación de soporte (chat). */
function gsEscucharMensajesSoporte(idConversacion, onNuevoMensaje) {
  if (!gsRequireSupabase()) return null;
  return supabaseClient
    .channel(`mensajes-${idConversacion}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "mensajes_soporte", filter: `id_conversacion=eq.${idConversacion}` },
      (payload) => onNuevoMensaje(payload.new)
    )
    .subscribe();
}

/** Escucha solicitudes nuevas publicadas cerca (para el feed del profesional). */
function gsEscucharSolicitudesNuevas(onNueva) {
  if (!gsRequireSupabase()) return null;
  return supabaseClient
    .channel("solicitudes-nuevas")
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "solicitud_servicio" },
      (payload) => onNueva(payload.new)
    )
    .subscribe();
}

/** Cancela una suscripción realtime. */
function gsDejarDeEscuchar(canal) {
  if (canal) supabaseClient.removeChannel(canal);
}
