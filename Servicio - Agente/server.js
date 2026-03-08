// ════════════════════════════════════════════════════════════
//  ALMA BACKEND — server.js
//  Agente IA de diario emocional con Ollama
//
//  Requisitos:
//    - Node.js 18+  (para fetch nativo)
//    - Ollama corriendo: ollama serve
//    - Modelo descargado: ollama pull llama3.2:3b
//
//  Iniciar:
//    npm install
//    npm run dev    ← desarrollo (auto-reload)
//    npm start      ← producción
// ════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const journalRoutes = require('./routes/journal');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(cors());                         // Permite peticiones desde la app Flutter
app.use(express.json({ limit: '10kb' })); // Parsea JSON del body

// ── Health check ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Alma Backend',
    version: '1.0.0',
    endpoints: {
      'POST /journal': 'Crear entrada del diario con respuesta IA',
      'GET  /journal': 'Obtener historial (query: ?userId=...)',
    },
  });
});

// ── Rutas ─────────────────────────────────────────────────
app.use('/journal', journalRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║         🌸  ALMA BACKEND  🌸             ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Servidor:  http://0.0.0.0:${PORT}          ║`);
  console.log(`║  Red local: http://192.168.43.224:${PORT}   ║`);
  console.log('║  Ollama:    http://localhost:11434       ║');
  console.log('║  Modelo:    llama3.2:3b                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  POST /journal   → Crear entrada con IA');
  console.log('  GET  /journal   → Obtener historial');
  console.log('');
});
