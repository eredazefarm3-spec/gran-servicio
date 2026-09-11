/* ============================================================
   GRAN SERVICIO — GEOLOCALIZACIÓN DEL CLIENTE
   ============================================================ */

/**
 * Pide la ubicación actual del usuario.
 * Devuelve una Promise<{lat, lng}> o null si rechaza / falla.
 */
function gsObtenerUbicacionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      gsToast("Tu navegador no soporta geolocalización.", "error");
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Geolocalización rechazada o falló:", err.message);
        gsToast("No pudimos acceder a tu ubicación. Podés elegirla manualmente.", "info");
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

/**
 * Sigue la ubicación del usuario en tiempo real (útil para profesionales en camino).
 * callback recibe {lat, lng} en cada actualización.
 * Devuelve el watchId para poder cancelarlo con navigator.geolocation.clearWatch(id).
 */
function gsSeguirUbicacion(callback) {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => console.warn("Error siguiendo ubicación:", err.message),
    { enableHighAccuracy: true, maximumAge: 15000 }
  );
}

/** Calcula distancia aproximada en km entre dos puntos (fórmula de Haversine). */
function gsDistanciaKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Actualiza en Supabase la ubicación en vivo del profesional autenticado. */
async function gsActualizarUbicacionProfesional(idProfesional, { lat, lng }) {
  if (!gsRequireSupabase()) return;
  await supabaseClient
    .from("usuario_profesional")
    .update({ latitud_publica: lat, longitud_publica: lng, ubicacion_actualizada: new Date().toISOString() })
    .eq("id_profesional", idProfesional);
}


/** Guarda la última ubicación del usuario en la tabla de seguimiento en vivo. */
async function gsGuardarUbicacionTiempoReal({idAuth, tipoUsuario, idAsignacion = null, idCliente = null, idProfesional = null, idSolicitud = null, precision = null, lat, lng}) {
  if (!gsRequireSupabase() || !idAuth) return null;
  const payload = {
    id_auth: idAuth,
    tipo_usuario: tipoUsuario,
    id_asignacion: idAsignacion,
    id_cliente: idCliente,
    id_profesional: idProfesional,
    id_solicitud: idSolicitud,
    precision,
    activo: true,
    latitud: lat,
    longitud: lng,
    actualizado_en: new Date().toISOString()
  };
  const { data: existente } = await supabaseClient
    .from("ubicaciones_tiempo_real")
    .select("id_ubicacion")
    .eq("id_auth", idAuth)
    .maybeSingle();

  if (existente?.id_ubicacion) {
    return supabaseClient.from("ubicaciones_tiempo_real")
      .update(payload).eq("id_ubicacion", existente.id_ubicacion).select().single();
  }
  return supabaseClient.from("ubicaciones_tiempo_real").insert(payload).select().single();
}
