// Compatible con variables creadas automáticamente por la integración Supabase/Vercel
// y con nombres genéricos para desarrollo local.
const rawSupabaseUrl =
  process.env.invitacionVL_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_URL = rawSupabaseUrl.replace(/\/$/, '');

// Para PostgREST usamos preferentemente la service_role JWT.
// La clave sb_secret_* moderna puede usarse como apikey, pero no siempre como Bearer JWT.
// NUNCA expongas estas claves en el navegador ni uses NEXT_PUBLIC_ para ellas.
const SUPABASE_SERVER_KEY =
  process.env.invitacionVL_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.invitacionVL_SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

const IS_JWT_KEY = SUPABASE_SERVER_KEY.startsWith('eyJ');

const ADMIN_PIN = process.env.ADMIN_PIN || process.env.invitacionVL_ADMIN_PIN || '';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function checkConfig(res) {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY || !ADMIN_PIN) {
    send(res, 500, {
      error: 'Faltan variables de entorno de Supabase/Vercel.',
      config: {
        hasUrl: Boolean(SUPABASE_URL),
        hasServerKey: Boolean(SUPABASE_SERVER_KEY),
        hasAdminPin: Boolean(ADMIN_PIN),
        projectRef: projectRefFromUrl(SUPABASE_URL)
      }
    });
    return false;
  }
  return true;
}

async function supabaseFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const headers = {
    apikey: SUPABASE_SERVER_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Authorization Bearer requiere una JWT (anon/service_role).
  if (IS_JWT_KEY) headers.Authorization = `Bearer ${SUPABASE_SERVER_KEY}`;

  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error('Supabase tardó más de 8 segundos en responder.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error_description || data?.hint || 'Supabase request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

module.exports = async (req, res) => {
  if (!checkConfig(res)) return;

  try {
    // Diagnóstico seguro: no devuelve ninguna clave.
    // Úsalo como /api/rsvp?health=1 para comprobar a qué proyecto apunta Vercel.
    if (req.method === 'GET' && req.query?.health === '1') {
      const rows = await supabaseFetch('invitados?select=id&limit=1');
      return send(res, 200, {
        ok: true,
        databaseReachable: true,
        projectRef: projectRefFromUrl(SUPABASE_URL),
        table: 'public.invitados',
        keyType: IS_JWT_KEY ? 'jwt-service-role' : 'secret-key',
        sampleRows: Array.isArray(rows) ? rows.length : 0
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const name = clean(body.name, 120);
      const contact = clean(body.contact, 160);
      const status = clean(body.status, 20);
      const message = clean(body.message, 1000);
      const guests = Math.max(1, Math.min(10, Number(body.guests || 1)));

      if (!name || !contact || !['confirmed', 'pending', 'declined'].includes(status)) {
        return send(res, 400, { error: 'Faltan datos obligatorios o la asistencia no es válida.' });
      }

      const inserted = await supabaseFetch('invitados', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          nombre: name,
          contacto: contact,
          asistencia: status,
          personas: guests,
          mensaje: message || null
        })
      });

      return send(res, 201, { ok: true, guest: inserted?.[0] || null });
    }

    if (req.method === 'GET') {
      if (req.headers['x-admin-pin'] !== ADMIN_PIN) {
        return send(res, 401, { error: 'No autorizado.' });
      }

      const rows = await supabaseFetch('invitados?select=id,nombre,contacto,asistencia,personas,mensaje,created_at&order=created_at.desc');
      return send(res, 200, { ok: true, guests: rows || [] });
    }

    if (req.method === 'DELETE') {
      if (req.headers['x-admin-pin'] !== ADMIN_PIN) {
        return send(res, 401, { error: 'No autorizado.' });
      }

      await supabaseFetch('invitados?id=not.is.null', {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return send(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return send(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error(error);
    return send(res, 500, {
      error: 'No se pudo completar la operación.',
      details: error.details || error.message || undefined,
      supabaseStatus: error.status || undefined,
      projectRef: projectRefFromUrl(SUPABASE_URL)
    });
  }
};
