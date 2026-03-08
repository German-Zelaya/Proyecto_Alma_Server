// ════════════════════════════════════════════════════════════
//  ALMACENAMIENTO — services/storage.js
//  Guarda las entradas del diario en un archivo JSON local
//  data/journal.json → { [userId]: [entradas...] }
// ════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/journal.json');

// ── Leer base de datos ────────────────────────────────────
function leerDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// ── Guardar base de datos ─────────────────────────────────
function guardarDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ── Guardar entrada nueva ─────────────────────────────────
function guardarEntrada(userId, entrada) {
  const db = leerDB();
  if (!db[userId]) db[userId] = [];
  db[userId].unshift(entrada); // más reciente primero
  guardarDB(db);
}

// ── Obtener historial de usuario ──────────────────────────
function obtenerHistorial(userId) {
  const db = leerDB();
  return db[userId] ?? [];
}

// ── Obtener entrada por id ────────────────────────────────
function obtenerEntrada(userId, id) {
  const historial = obtenerHistorial(userId);
  return historial.find((e) => e.id === id) ?? null;
}

module.exports = { guardarEntrada, obtenerHistorial, obtenerEntrada };
