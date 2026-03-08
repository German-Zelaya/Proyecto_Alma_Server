// ════════════════════════════════════════════════════════════
//  RUTAS DEL DIARIO — routes/journal.js
//
//  POST /journal   → Crea entrada, llama a Ollama, guarda y devuelve
//  GET  /journal   → Devuelve historial de entradas del usuario
// ════════════════════════════════════════════════════════════

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { analizarEntradaDiario } = require('../services/ollama');
const { guardarEntrada, obtenerHistorial } = require('../services/storage');

const router = express.Router();

// ── POST /journal ─────────────────────────────────────────
// Body: { text: string, mood: string, userId?: string }
// Response: { id, ai_response, createdAt }
router.post('/', async (req, res) => {
  const { text, mood, userId } = req.body;

  // Validación básica
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'El campo "text" es requerido y no puede estar vacío.' });
  }

  const uid = userId || req.headers['x-user-id'] || 'anon';
  const moodLabel = mood || 'neutral';

  console.log(`[POST /journal] userId=${uid} | mood=${moodLabel} | chars=${text.length}`);

  try {
    // ── Llamar a Ollama ──────────────────────────────────
    console.log('[Ollama] Generando respuesta empática...');
    const aiResponse = await analizarEntradaDiario(text.trim(), moodLabel);
    console.log('[Ollama] Respuesta generada correctamente.');

    // ── Construir entrada ────────────────────────────────
    const entrada = {
      id: uuidv4(),
      userId: uid,
      text: text.trim(),
      mood: moodLabel,
      ai_response: aiResponse,
      createdAt: new Date().toISOString(),
    };

    // ── Guardar en disco ─────────────────────────────────
    guardarEntrada(uid, entrada);

    // ── Responder al cliente ─────────────────────────────
    return res.status(201).json({
      id: entrada.id,
      ai_response: entrada.ai_response,
      createdAt: entrada.createdAt,
    });
  } catch (err) {
    console.error('[POST /journal] Error:', err.message);

    // Si Ollama no está corriendo, devolver error claro
    if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'El modelo de IA no está disponible. Asegúrate de que Ollama esté corriendo (ollama serve).',
      });
    }

    return res.status(500).json({ error: 'Error interno al procesar la entrada.' });
  }
});

// ── GET /journal ──────────────────────────────────────────
// Query: ?userId=string
// Response: [ { id, text, mood, ai_response, createdAt } ]
router.get('/', (req, res) => {
  const userId = req.query.userId || req.headers['x-user-id'] || 'anon';
  console.log(`[GET /journal] userId=${userId}`);

  const historial = obtenerHistorial(userId);
  return res.json(historial);
});

module.exports = router;
