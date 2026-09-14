-- Gran Servicio
-- Seguridad: las solicitudes disponibles para profesionales se filtran por los
-- servicios activos y aprobados que el profesional realmente ofrece.
-- No crea tablas ni columnas nuevas.

CREATE OR REPLACE FUNCTION public.obtener_solicitudes_compatibles_profesional(p_limit integer DEFAULT 100)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_profesional public.usuario_profesional.id_profesional%TYPE;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);
BEGIN
  SELECT up.id_profesional
    INTO v_id_profesional
  FROM public.usuario_profesional up
  WHERE up.id_auth = auth.uid()
    AND up.activo = true
    AND up.verificado = true
    AND lower(COALESCE(up.estado_aprobacion, '')) = 'aprobado'
  LIMIT 1;

  IF v_id_profesional IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id_solicitud', s.id_solicitud,
    'id_servicio', s.id_servicio,
    'id_estado', s.id_estado,
    'descripcion', s.descripcion,
    'presupuesto_maximo', s.presupuesto_maximo,
    'latitud', s.latitud,
    'longitud', s.longitud,
    'fecha_solicitud', s.fecha_solicitud,
    'id_barrio', s.id_barrio,
    'servicio_nombre', sv.nombre,
    'barrio_nombre', b.nombre,
    'estado_nombre', e.nombre
  )
  FROM public.solicitud_servicio s
  JOIN public.servicios sv ON sv.id_servicio = s.id_servicio
  LEFT JOIN public.barrios b ON b.id_barrio = s.id_barrio
  LEFT JOIN public.estados e ON e.id_estado = s.id_estado
  WHERE sv.activo = true
    AND EXISTS (
      SELECT 1
      FROM public.profesional_servicio ps
      WHERE ps.id_profesional = v_id_profesional
        AND ps.id_servicio = s.id_servicio
        AND ps.activo = true
        AND lower(COALESCE(ps.estado_aprobacion, '')) = 'aprobado'
    )
    AND lower(COALESCE(e.nombre, '')) IN ('publicada', 'propuestas recibidas', 'buscando profesional')
  ORDER BY s.fecha_solicitud DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_solicitudes_compatibles_profesional(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_solicitudes_compatibles_profesional(integer) TO authenticated;

-- Defensa adicional a nivel de RLS para SELECT directo sobre solicitudes.
-- Es una política RESTRICTIVE: se suma a las políticas permisivas existentes,
-- por lo que no reemplaza el acceso que ya tienen clientes/empleados según sus políticas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'solicitud_servicio'
      AND policyname = 'gs_restrict_profesional_por_especialidad'
  ) THEN
    CREATE POLICY gs_restrict_profesional_por_especialidad
      ON public.solicitud_servicio
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.usuario_cliente uc
          WHERE uc.id_cliente = solicitud_servicio.id_cliente
            AND uc.id_auth = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.usuario_profesional up
          JOIN public.profesional_servicio ps
            ON ps.id_profesional = up.id_profesional
           AND ps.id_servicio = solicitud_servicio.id_servicio
          WHERE up.id_auth = auth.uid()
            AND up.activo = true
            AND up.verificado = true
            AND lower(COALESCE(up.estado_aprobacion, '')) = 'aprobado'
            AND ps.activo = true
            AND lower(COALESCE(ps.estado_aprobacion, '')) = 'aprobado'
        )
        OR EXISTS (
          SELECT 1
          FROM public.usuario_empleado ue
          JOIN public.roles r ON r.id_rol = ue.id_rol
          WHERE ue.id_auth = auth.uid()
            AND ue.activo = true
            AND lower(COALESCE(r.nombre, '')) IN ('administrador', 'operaciones')
        )
      );
  END IF;
END $$;
