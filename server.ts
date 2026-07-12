import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily to handle missing key gracefully
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API Endpoints

// 1. Explain a question
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const { pregunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, respuesta_correcta, respuesta_usuario, categoria, tema } = req.body;
    
    if (!pregunta || !respuesta_correcta) {
      res.status(400).json({ error: "Faltan parámetros requeridos para la explicación." });
      return;
    }

    const ai = getGenAI();

    const prompt = `
      Actúa como un tutor legal y experto en legislación policial y constitucional peruana para oficiales y suboficiales de la Policía Nacional del Perú (PNP).
      Explica de forma clara, didáctica y profesional la siguiente pregunta de examen de ascenso, indicando la base legal y constitucional aplicable en el Perú.

      Categoría: ${categoria || "General"}
      Tema: ${tema || "Legislación"}
      Pregunta: ${pregunta}
      Alternativas:
      A) ${alternativa_a}
      B) ${alternativa_b}
      C) ${alternativa_c}
      D) ${alternativa_d}
      E) ${alternativa_e}

      Respuesta Correcta: ${respuesta_correcta}
      Respuesta del Usuario: ${respuesta_usuario || "Sin responder"}

      Por favor estructura tu respuesta en los siguientes puntos usando formato Markdown elegante (con títulos y negritas):
      1. **Análisis de la Respuesta Correcta**: Por qué la opción ${respuesta_correcta} es la correcta de acuerdo con la norma legal/constitucional (cita los artículos exactos como Constitución o Ley PNP).
      2. **Por qué las otras opciones son incorrectas**: Explica brevemente el error común o distractor en las otras alternativas.
      3. **Comentario del Tutor**: Un consejo o regla mnemotécnica útil para memorizar o entender este punto específico de cara al examen.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/explain:", error);
    res.status(500).json({ error: error.message || "Error al generar la explicación con IA." });
  }
});

// 2. Develop a question with specific legal base, explanation and summary
app.post("/api/gemini/develop", async (req, res) => {
  try {
    const { pregunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, respuesta_correcta, categoria, tema, ubicacion } = req.body;
    
    if (!pregunta || !respuesta_correcta) {
      res.status(400).json({ error: "Faltan parámetros requeridos para el desarrollo." });
      return;
    }

    const ai = getGenAI();

    const prompt = `
      Actúa como un prestigioso catedrático constitucionalista y docente experto de la Escuela de Posgrado de la Policía Nacional del Perú (PNP).
      Tu misión es desarrollar y fundamentar de forma rigurosa, pedagógica y estructurada la siguiente pregunta del temario oficial de ascenso.

      Categoría: ${categoria || "General"}
      Tema: ${tema || "Legislación"}
      Pregunta: ${pregunta}
      Ubicación / Referencia Legal en la Base de Datos: ${ubicacion || "No especificada (Por favor búscala según el tema/pregunta)"}
      Alternativas:
      A) ${alternativa_a || "N/A"}
      B) ${alternativa_b || "N/A"}
      C) ${alternativa_c || "N/A"}
      D) ${alternativa_d || "N/A"}
      E) ${alternativa_e || "N/A"}

      Respuesta Correcta: ${respuesta_correcta}

      IMPORTANTE: Debes estructurar tu respuesta de forma EXACTA utilizando la siguiente estructura con títulos en Markdown:

      **Base Legal y Texto de la Norma:**
      [Aquí escribe el texto literal o fragmento de la ley, artículo, reglamento o disposición de la Constitución Política del Perú, Decreto Legislativo, Código Penal o Ley PNP que da sustento directo a la respuesta correcta]

      **¿Qué significa?**
      [Aquí brinda una explicación didáctica, amena y muy clara de por qué esto es así, qué significa en términos sencillos y prácticos para la labor policial, y cómo se interpreta en el contexto real]

      **En resumen:**
      * **Se encuentra en:** [Menciona el artículo exacto y el cuerpo legal, por ejemplo: Artículo 47 de la Constitución Política del Perú, o Artículo 3 del Decreto Legislativo 1267. Si se proporcionó una Ubicación arriba, úsala y perfecciónala para citar la base legal correcta de manera elegante]
      * **Dispone que:** [Resume en una o dos oraciones el mandato clave de dicha norma]
      
      Por favor, sé profesional, riguroso y mantén un lenguaje académico, elegante y de fácil comprensión para un miembro de la Policía Nacional.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ developed: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/develop:", error);
    res.status(500).json({ error: error.message || "Error al generar el desarrollo con IA." });
  }
});

// 3. Generate a study recommendation plan based on exam history
app.post("/api/gemini/study-plan", async (req, res) => {
  try {
    const { historial_intentos, usuario_nombre } = req.body;

    if (!historial_intentos || !Array.isArray(historial_intentos) || historial_intentos.length === 0) {
      res.status(400).json({ error: "Se requiere un historial de intentos válido para analizar." });
      return;
    }

    const ai = getGenAI();

    const prompt = `
      Actúa como un asesor pedagógico de alto nivel para exámenes de ascenso de la Policía Nacional del Perú (PNP).
      Analiza el siguiente historial de simulacros de examen tomados por el usuario ${usuario_nombre || "Usuario"} y redacta un plan de estudio y de recomendación altamente personalizado y motivador.

      Historial de simulacros:
      ${JSON.stringify(historial_intentos, null, 2)}

      Por favor, en tu recomendación (formato Markdown elegante):
      1. **Diagnóstico de Rendimiento**: Haz un resumen de sus fortalezas y debilidades. Identifica qué categorías (Constitución, Ley PNP, Código Procesal Penal, etc.) domina mejor y cuáles representan su mayor dificultad según las respuestas incorrectas o puntajes bajos.
      2. **Prioridades de Estudio**: Indica qué temas específicos debe estudiar con urgencia (por ejemplo, 'Decreto Legislativo 1267', 'Garantías Constitucionales', 'Derechos del Imputado').
      3. **Plan de Acción de 4 Semanas**: Diseña un mini plan de estudio semanal con horas sugeridas de dedicación y técnicas de estudio recomendadas (por ejemplo, flashcards para plazos, lectura cruzada para artículos).
      4. **Mensaje de Motivación**: Un mensaje final motivador con jerga institucional o policial respetuosa (ej. '¡Suboficial, a paso firme hacia su ascenso!').
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ studyPlan: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/study-plan:", error);
    res.status(500).json({ error: error.message || "Error al generar el plan de estudio con IA." });
  }
});

// Vite middleware and static serving configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
