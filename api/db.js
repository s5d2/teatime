const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const API_KEY = process.env.JSONBIN_API_KEY;
const BIN_ID = process.env.JSONBIN_BIN_ID;

// Helper: réponse JSON
function json(res, status, data) {
  res.status(status).json(data);
}

// Helper: fetch JSONbin
async function jbFetch(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': API_KEY,
      ...(options.headers || {})
    }
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`JSONbin ${r.status}: ${text}`);
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!API_KEY) return json(res, 500, { error: 'JSONBIN_API_KEY non configurée' });

  try {
    // GET /api/db → charge la DB
    if (req.method === 'GET') {
      // Si pas de BIN_ID configuré, retourner un état vide
      if (!BIN_ID) {
        return json(res, 200, { cards: [], users: {}, adminPass: 'admin123', _noBin: true });
      }
      const data = await jbFetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`);
      return json(res, 200, data.record);
    }

    // POST /api/db → créer le bin (premier lancement)
    if (req.method === 'POST') {
      const initial = { cards: [], users: {}, adminPass: 'admin123' };
      const data = await jbFetch(`${JSONBIN_BASE}/b`, {
        method: 'POST',
        headers: { 'X-Bin-Name': 'teamasters-db', 'X-Bin-Private': 'true' },
        body: JSON.stringify(initial)
      });
      return json(res, 200, { binId: data.metadata.id });
    }

    // PUT /api/db → sauvegarde la DB
    if (req.method === 'PUT') {
      if (!BIN_ID) return json(res, 400, { error: 'JSONBIN_BIN_ID non configuré' });
      const data = await jbFetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
        method: 'PUT',
        body: JSON.stringify(req.body)
      });
      return json(res, 200, data.record);
    }

    return json(res, 405, { error: 'Méthode non supportée' });

  } catch (e) {
    console.error('API error:', e.message);
    return json(res, 500, { error: e.message });
  }
}
