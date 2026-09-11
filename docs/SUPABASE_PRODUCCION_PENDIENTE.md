# Gran Servicio — configuración de producción pendiente

## Auth: Site URL
En Supabase → Authentication → URL Configuration:

**Site URL**

`https://gran-servicio-seven.vercel.app`

**Redirect URLs**

- `https://gran-servicio-seven.vercel.app/**`
- `https://gran-servicio-seven.vercel.app/login.html`
- `https://gran-servicio-seven.vercel.app/profesional/verificacion-pendiente.html`

No usar `localhost:3000` en producción.

## Email de confirmación
La plantilla de confirmación debe reemplazar la plantilla genérica de Supabase por una versión de Gran Servicio en español, con el logo de la empresa y los colores azul/naranja.

El frontend ya genera `emailRedirectTo` usando `window.location.origin`, por lo que no conviene hardcodear localhost ni otro dominio en `js/auth.js`. Una vez configuradas las URLs anteriores, el enlace enviado desde producción apunta al dominio publicado.

## Corrección aplicada en base de datos
La función `gs_sync_profesional_email_verification()` fue corregida para activar ambos bypass internos antes de actualizar `usuario_profesional.verificado`.

## Solicitud urgente
`solicitud_servicio.gs_solicitud_fecha_programada_ck` ya acepta `NULL`. El error observado se produce porque el frontend enviaba la hora actual del navegador para `"ahora"`; por diferencia entre el reloj del navegador y el timestamp generado por PostgreSQL, la comparación podía fallar. El frontend V10 deja `fecha_programada = NULL` para modalidad urgente.
