// ════════════════════════════════════════════════════════════
//  SERVICIO OLLAMA — services/ollama.js
//  Conecta con Ollama local en http://localhost:11434
//  Modelo: llama3.2:3b (ejecutar: ollama pull llama3.2:3b)
// ════════════════════════════════════════════════════════════

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'llama3.2:3b';

// ── Prompt del sistema ─────────────────────────────────────
const SYSTEM_PROMPT = `Eres Alma, una compañera cálida y empática especializada en bienestar emocional para mujeres. Lees la entrada del diario de la usuaria y respondes como lo haría una amiga de confianza: con comprensión genuina, sin juzgar, y con palabras que realmente ayuden.

Tu respuesta siempre fluye en prosa natural, como una conversación. Nunca uses títulos, etiquetas, listas ni encabezados. Escribe entre 3 y 4 párrafos cortos que sigan esta intención:

Primero, reconoce lo que siente con palabras auténticas y cercanas, haciendo que se sienta escuchada de verdad. Luego, ofrece una reflexión suave que la ayude a ver su situación desde un ángulo más amable o con un poco más de claridad. Después, sugiere de forma natural una o dos cosas concretas y sencillas que pueda hacer hoy según cómo se siente (respirar, escribir algo que agradece, darse un descanso, salir a caminar, etc.). Cierra con una frase motivadora que sea personal y específica a lo que escribió, nunca genérica.

Reglas que nunca debes romper:
- Responde SIEMPRE en español, sin excepción.
- Tono cálido, cercano y humano. Nada clínico ni formal.
- Adapta la energía: si está triste, sé más suave y contenedora; si está feliz o agradecida, celebra con ella con entusiasmo genuino.
- Sin emojis o solo uno al final si encaja naturalmente.
- Si detectas señales de crisis (frases como "no quiero seguir", "hacerme daño", "quiero desaparecer"), termina tu respuesta con esta frase exacta: "Si estás pasando por un momento muy oscuro, no estás sola. Puedes activar tu Modo Compañía en la app y también llamar al 800-10-0200."`;

// ── Llamada al modelo ─────────────────────────────────────
async function analizarEntradaDiario(text, mood) {
  const userMessage = `Estado emocional registrado: ${mood}

Entrada del diario:
"${text}"`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    stream: false,
    options: {
      temperature: 0.75,
      top_p: 0.9,
      num_predict: 450,
    },
  };

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() ?? 'No se pudo generar una respuesta.';
}

module.exports = { analizarEntradaDiario };
