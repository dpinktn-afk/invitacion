# Vianey & Luis — Sitio de boda

Sitio web moderno en tonos crema + azul marino, inspirado en la invitación.

## Incluye
- Invitación digital y contador regresivo.
- Datos de Casa Maya, Mérida, con botón de ubicación.
- Registro/RSVP.
- Panel privado de invitados protegido con PIN.
- Conteo de confirmados, pendientes y no asistentes.
- Sección de álbum/fotos preparada para Google Drive.
- Diseño responsive para celular.

## Registro real con Supabase + Vercel

Esta versión **ya no usa `localStorage` para las confirmaciones**. El formulario envía los datos a `/api/rsvp`, una función server-side de Vercel, y esa función los guarda en Supabase.

### 1. Crear la tabla en Supabase

Abre el proyecto de Supabase y entra a **SQL Editor**. Ejecuta el archivo `supabase-schema.sql` incluido en este ZIP.

La tabla se llama `invitados` y guarda:
- `nombre`
- `contacto`
- `asistencia` (`confirmed`, `pending` o `declined`)
- `personas`
- `mensaje`
- `created_at`

### 2. Variables de entorno en Vercel

En el proyecto de Vercel agrega:

- `SUPABASE_URL` = URL de tu proyecto de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = Service Role Key de Supabase
- `ADMIN_PIN` = un PIN privado que tú elijas

**No publiques la Service Role Key en `app.js`, HTML ni en GitHub.** La API de Vercel es la única parte que la utiliza.

### 3. Panel privado

El botón 🔒 de la invitación pide el `ADMIN_PIN`. Después consulta los registros reales de Supabase y muestra:
- confirmados
- pendientes
- no asistentes
- total de personas confirmadas
- lista de invitados

El botón **Borrar registros** elimina los registros de la tabla y requiere el mismo PIN.

### 4. Flujo completo

`Invitado → formulario → Vercel /api/rsvp → Supabase → panel privado`

Por eso ahora una confirmación enviada desde un celular estará disponible para ti desde cualquier dispositivo donde publiques la invitación.

### Seguridad

La tabla tiene Row Level Security (RLS) activado y no se crean políticas públicas. Las operaciones se realizan desde la función server-side de Vercel usando la Service Role Key.

El archivo `.env.example` muestra los nombres de las variables que debes configurar. No contiene claves reales.

## Google Drive
El botón de fotos apunta inicialmente a `https://drive.google.com/`.
Cámbialo en `app.js`:
`const DRIVE_FOLDER_URL="TU_URL_DE_CARPETA";`

Si quieres subida directa desde la página hacia Drive, hay que configurar autenticación OAuth y Google Drive API. Google documenta la carga de archivos mediante la API y los permisos `drive.file`. No conviene poner credenciales privadas directamente en el HTML.

## Publicar
Puedes subir esta carpeta a Netlify, Vercel o GitHub Pages. Si después quieres dominio propio, por ejemplo `vianeyyluis.com`, se puede conectar al hosting.

## Ubicación
Casa Maya:
C. 62 492, Centro, 97000 Mérida, Yucatán.
La URL del botón de mapa ya está configurada con Google Maps.


## Vercel + Supabase (recomendado para la versión real)

1. Sube este proyecto a Vercel.
2. Crea un proyecto gratuito en Supabase.
3. Crea una tabla `invitados` con:
   - `id`
   - `nombre`
   - `contacto`
   - `asistencia`
   - `personas`
   - `mensaje`
   - `created_at`
4. Agrega las variables de entorno de Supabase en Vercel.
5. Cambia el formulario de `app.js` para insertar/consultar los registros de Supabase.
6. El panel privado puede usar autenticación de Supabase para que solamente Vianey y Luis puedan entrar.

No pongas una `service_role` key de Supabase dentro del JavaScript público. Para el navegador se debe usar la clave pública/anónima con Row Level Security bien configurado, o un endpoint server-side de Vercel.

## Mesa de regalos
Incluye datos de Santander para regalos opcionales y botón para copiar los datos bancarios.
