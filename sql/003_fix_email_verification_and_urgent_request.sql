-- Gran Servicio — Corrección V10
-- 1) La confirmación de email de profesionales debe actualizar verificado
--    sin activar los triggers de protección de campos sensibles.
-- 2) Las solicitudes urgentes usan fecha_programada = NULL; el frontend
--    ya aplica esta regla. El CHECK existente acepta NULL.

create or replace function public.gs_sync_profesional_email_verification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or new.email_confirmed_at is distinct from old.email_confirmed_at) then
    perform set_config('gs.bypass_profesional_aprobacion','true',true);
    perform set_config('gs.bypass_verificacion','true',true);
    update public.usuario_profesional
       set verificado=true
     where id_auth=new.id
       and estado_aprobacion <> 'aprobado';
  end if;
  return new;
end;
$function$;

-- El CHECK correcto permite NULL para solicitudes urgentes:
-- CHECK ((fecha_programada IS NULL) OR (fecha_programada >= fecha_solicitud))
-- No hace falta eliminar ni debilitar este control.
