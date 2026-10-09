-- Align the legacy published-requests policy with the verified-professional requirement.
-- Permissive RLS policies are OR-combined, so this policy must not bypass stricter policies.
DROP POLICY IF EXISTS solicitudes_profesional_publicadas ON public.solicitud_servicio;

CREATE POLICY solicitudes_profesional_publicadas
ON public.solicitud_servicio
FOR SELECT
TO authenticated
USING (
  id_estado IN (
    SELECT e.id_estado
    FROM public.estados e
    WHERE e.tipo_entidad = 'solicitud'
      AND lower(trim(e.nombre)) IN ('publicada', 'propuestas recibidas', 'buscando profesional')
  )
  AND EXISTS (
    SELECT 1
    FROM public.usuario_profesional up
    JOIN public.profesional_servicio ps
      ON ps.id_profesional = up.id_profesional
     AND ps.id_servicio = solicitud_servicio.id_servicio
    WHERE up.id_auth = (SELECT auth.uid())
      AND up.activo IS TRUE
      AND up.verificado IS TRUE
      AND lower(coalesce(up.estado_aprobacion, '')) = 'aprobado'
      AND ps.activo IS TRUE
      AND lower(coalesce(ps.estado_aprobacion, '')) = 'aprobado'
  )
);