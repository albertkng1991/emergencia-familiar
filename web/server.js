const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// ═══════════════════════════════════════════════════
// Storage: PostgreSQL (deployed) or filesystem (local)
// ═══════════════════════════════════════════════════

let storage;

if (DATABASE_URL) {
  // ─── PostgreSQL storage (Render / cloud) ───
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  async function initDB() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nucleos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  Base de datos PostgreSQL conectada');
  }

  storage = {
    init: initDB,

    async save(data) {
      const existing = await pool.query('SELECT id FROM nucleos WHERE nombre = $1', [data.nombre]);
      let id;
      let isUpdate;

      if (existing.rows.length > 0) {
        id = existing.rows[0].id;
        isUpdate = true;
        data.id = id;
        await pool.query(
          'UPDATE nucleos SET data = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(data), id]
        );
      } else {
        // Get next ID
        const result = await pool.query(
          "SELECT id FROM nucleos ORDER BY (SUBSTRING(id FROM 2))::int DESC LIMIT 1"
        );
        const maxNum = result.rows.length > 0
          ? parseInt(result.rows[0].id.substring(1), 10)
          : 0;
        id = `N${maxNum + 1}`;
        isUpdate = false;
        data.id = id;
        await pool.query(
          'INSERT INTO nucleos (id, nombre, data) VALUES ($1, $2, $3)',
          [id, data.nombre, JSON.stringify(data)]
        );
      }

      return { id, isUpdate, nombre: data.nombre };
    },

    async list() {
      const result = await pool.query('SELECT id, data, updated_at FROM nucleos ORDER BY (SUBSTRING(id FROM 2))::int');
      return result.rows.map(row => {
        const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return {
          id: row.id,
          nombre: d.nombre,
          miembros: d.miembros?.length || 0,
          modulos: d.modulosAdicionales || [],
          fechaEnvio: d.fechaEnvio || row.updated_at,
        };
      });
    },
  };

} else {
  // ─── Filesystem storage (local) ───
  const NUCLEOS_DIR = path.join(__dirname, '..', 'data', 'nucleos');
  if (!fs.existsSync(NUCLEOS_DIR)) fs.mkdirSync(NUCLEOS_DIR, { recursive: true });

  function getNextId() {
    const files = fs.readdirSync(NUCLEOS_DIR).filter(f => /^N\d+\.json$/.test(f));
    const nums = files.map(f => parseInt(f.match(/^N(\d+)/)[1], 10));
    return `N${(nums.length > 0 ? Math.max(...nums) : 0) + 1}`;
  }

  function findIdByName(nombre) {
    const files = fs.readdirSync(NUCLEOS_DIR).filter(f => /^N\d+\.json$/.test(f));
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(NUCLEOS_DIR, f), 'utf-8'));
        if (d.nombre === nombre) return d.id;
      } catch {}
    }
    return null;
  }

  storage = {
    init: async () => { console.log('  Almacenamiento local: data/nucleos/'); },

    async save(data) {
      const existing = findIdByName(data.nombre);
      const id = existing || getNextId();
      const isUpdate = !!existing;
      data.id = id;
      fs.writeFileSync(path.join(NUCLEOS_DIR, `${id}.json`), JSON.stringify(data, null, 2), 'utf-8');
      return { id, isUpdate, nombre: data.nombre };
    },

    async list() {
      const files = fs.readdirSync(NUCLEOS_DIR).filter(f => /^N\d+\.json$/.test(f));
      return files.map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(NUCLEOS_DIR, f), 'utf-8'));
          const stat = fs.statSync(path.join(NUCLEOS_DIR, f));
          return {
            id: d.id,
            nombre: d.nombre,
            miembros: d.miembros?.length || 0,
            modulos: d.modulosAdicionales || [],
            fechaEnvio: d.fechaEnvio || stat.mtime.toISOString(),
          };
        } catch { return null; }
      }).filter(Boolean);
    },
  };
}

// ═══════════════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════════════

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/enviar
  if (req.method === 'POST' && req.url === '/api/enviar') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.nombre || !data.nombre.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Falta el nombre de la familia.' }));
          return;
        }

        const result = await storage.save(data);
        const timestamp = new Date().toLocaleString('es-ES');
        console.log(`${result.isUpdate ? '↻' : '✓'} ${result.id} (${result.nombre}) — ${result.isUpdate ? 'actualizado' : 'nuevo'} — ${timestamp}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Error al guardar:', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error al procesar los datos.' }));
      }
    });
    return;
  }

  // GET /api/estado
  if (req.method === 'GET' && req.url === '/api/estado') {
    try {
      const nucleos = await storage.list();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(nucleos));
    } catch (e) {
      console.error('Error al listar:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno.' }));
    }
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

// ═══════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════

(async () => {
  await storage.init();
  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Plan de Emergencia Familiar — Servidor web    ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   http://localhost:${PORT}                           ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('Esperando formularios...');
    console.log('');
  });
})();
