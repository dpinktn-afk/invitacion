const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.invitacionVL_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.invitacionVL_SUPABASE_SERVICE_ROLE_KEY || process.env.invitacionVL_SUPABASE_SECRET_KEY;
const ADMIN_PIN = process.env.ADMIN_PIN;

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function checkConfig(res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_PIN) {
    send(res, 500, { error: 'Faltan variables de entorno de Supabase/Vercel.' });
    return false;
  }
  return true;
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
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
      supabaseStatus: error.status || undefined
    });
  }
};
