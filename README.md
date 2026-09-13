# Invitación Vianey & Luis

Sitio estático de la boda con confirmaciones guardadas en Supabase mediante una función serverless de Vercel.

## Importante: Vercel no almacena la base de datos

La base de datos se crea en **Supabase**. Vercel aloja la página y ejecuta `/api/rsvp.js`, que conecta con Supabase de forma segura.

## Configuración paso a paso

### 1. Crear la tabla en Supabase

1. Entra a [Supabase](https://supabase.com/dashboard) y crea o abre un proyecto.
2. Abre **SQL Editor → New query**.
3. Copia todo el contenido de `supabase-schema.sql`.
4. Pulsa **Run** y confirma que aparezca la tabla `public.invitados` en **Table Editor**.

No subas el archivo `.env` ni claves secretas a GitHub.

### 2. Subir el proyecto a Vercel

1. Descomprime este ZIP. **La carpeta que subas debe contener directamente** `index.html`, `api/` y `vercel.json`; no selecciones una carpeta padre vacía ni subas el ZIP dentro de otra carpeta.
2. Entra a [Vercel](https://vercel.com/new).
3. Elige **Add New → Project** y conecta el repositorio de GitHub, o usa **Import Third-Party Git Repository**.
4. Si Vercel pregunta por el framework, selecciona **Other** o **Other (Vercel)**.
5. Deja el **Root Directory** en la carpeta que contiene `index.html`, `api` y `vercel.json`.
6. En **Build and Output Settings**, deja el comando de build vacío y el directorio de salida vacío.
7. Pulsa **Deploy**.

Este proyecto es HTML/CSS/JS puro. No necesita `npm install` ni comando de build. Vercel detecta automáticamente la función `api/rsvp.js`.

Si lo conectas mediante GitHub, sube **el contenido de esta carpeta** al repositorio, no la carpeta contenedora ni el archivo ZIP. Si el repositorio contiene otros proyectos, configura **Root Directory** con la carpeta exacta donde están estos archivos.

### 3. Agregar las variables de entorno

En Vercel abre **Project → Settings → Environment Variables** y crea estas tres variables:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | En Supabase: **Project Settings → Data API → URL**; normalmente termina en `.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | En Supabase: **Project Settings → API Keys → Secret / service_role** |
| `ADMIN_PIN` | Un PIN privado elegido por ti |

Selecciona al menos **Production** y **Preview** si usarás ambos entornos. La `SUPABASE_SERVICE_ROLE_KEY` solamente debe existir en Vercel; nunca la pongas en `app.js`, HTML o GitHub.

Después de guardar las variables, ve a **Deployments → Redeploy**. Las variables nuevas no corrigen un deployment anterior hasta volver a desplegarlo.

## Prueba rápida

Abre la URL pública de Vercel y envía una confirmación. Luego revisa **Supabase → Table Editor → invitados**. Para abrir el panel privado, usa el botón de candado de la invitación y escribe el mismo `ADMIN_PIN`.

También puedes comprobar la función desde el navegador:

- `GET https://TU-DOMINIO.vercel.app/api/rsvp` sin PIN debe responder `401 No autorizado.` Esto confirma que la función está publicada.
- Si responde `500 Faltan variables de entorno...`, falta una de las tres variables o aún no se ha hecho Redeploy.

## Errores frecuentes

**`404 /api/rsvp`**: el Root Directory de Vercel apunta a una carpeta equivocada. Debe apuntar a la carpeta donde están simultáneamente `index.html` y `api/rsvp.js`.

**`500 Faltan variables de entorno`**: revisa los nombres exactamente, sin espacios, y haz Redeploy después de guardarlas.

**Error de Supabase `relation invitados does not exist`**: no se ejecutó `supabase-schema.sql` en el SQL Editor del proyecto correcto.

**Error de Supabase `Invalid API key`**: copia de nuevo la URL y la clave secret/service_role del mismo proyecto de Supabase. No uses la contraseña de la base de datos.

**La página carga pero el formulario falla**: abre la consola de Vercel en **Deployments → Functions → `api/rsvp` → Logs** para ver el detalle real.

## Archivos clave

- `index.html`, `styles.css`, `app.js`: sitio público.
- `api/rsvp.js`: API server-side para insertar, consultar y borrar registros.
- `supabase-schema.sql`: estructura de la tabla.
- `vercel.json`: configuración explícita de la función Node.js.
- `.env.example`: nombres de variables; no contiene valores reales.


## Diagnóstico mejorado

Esta versión muestra en el navegador el detalle que devuelve Supabase cuando el guardado falla, por ejemplo `Invalid API key`, `relation invitados does not exist` o un error de columnas. Esto facilita identificar el problema sin exponer la `service_role` al navegador.

Si aparece `Faltan variables de entorno de Supabase/Vercel`, revisa las tres variables y haz **Redeploy**.

Si aparece `relation "public.invitados" does not exist`, ejecuta `supabase-schema.sql` en el SQL Editor del mismo proyecto de Supabase.

Si aparece `Invalid API key`, vuelve a copiar `SUPABASE_URL` y la clave **Secret / service_role** del mismo proyecto.

Si aparece un error de permisos/RLS, confirma que la API está usando la clave server-side y que no la pusiste en `app.js`.
