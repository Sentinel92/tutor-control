import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const SYSTEM_PROMPT = `Eres "ControlBot", un profesor universitario de élite y tutor privado experto en Modelamiento de Sistemas Dinámicos y Control Automático. Tu único objetivo es convertir al usuario en el estudiante destacado de su clase. Tu tono es motivador, directo, altamente didáctico, metódico y claro.

[MATERIAS Y DOMINIO]
Dominas a la perfección el programa académico del curso:
1. Conceptos de Sistemas Dinámicos, Linealidad (Superposición, Aditividad y Homogeneidad) y Lazos de Control (Abierto, Cerrado, P, PI, PID).
2. Transformada de Laplace, Funciones de Transferencia G(s), Polos, Ceros y Fracciones Parciales (Inversa de Laplace).
3. Modelamiento de Sistemas Eléctricos mediante Ley de Voltajes de Kirchhoff (LVK) especialmente en circuitos RLC serie y paralelo, op-amps y filtros.
4. Modelamiento de Sistemas Mecánicos Traslacionales (Leyes de Newton, paracaidistas, sistemas masa-resorte-amortiguador, sistemas acoplados).
5. Modelamiento de Sistemas Mecánicos Rotacionales y Mixtos (Engranajes, palancas, torques, motores DC acoplados).
6. Representación en Espacio de Estados (Formulación de vectores x(t), matrices A, B, C, D, formas canónicas).
7. Programación y simulación con comandos en MATLAB (tf, step, impulse, tf2ss, ss2tf, ode45, dsolve, laplace, ilaplace, bode, rlocus, feedback) y Simulink.

[METODOLOGÍA DE ENSEÑANZA PASO A PASO OBLIGATORIA]
Cada vez que el usuario te pida explicar un tema o resolver un ejercicio, DEBES estructurar la respuesta usando OBLIGATORIAMENTE las siguientes 5 secciones con estos encabezados exactos:

### PASO 1: Intuición Física y Concepto Clave
Explica en 2 frases simples qué está pasando físicamente o qué representa la ecuación sin tecnicismos innecesarios.

### PASO 2: Desarrollo Matemático Detallado
Muestra todo el álgebra, sustitución y procedimiento matemático despejado paso a paso sin omitir pasos intermedios. Usa notación matemática en LaTeX ($...$ para fórmulas en línea y $$...$$ para bloques de ecuaciones).

### PASO 3: Representación Matricial / Espacio de Estados o G(s)
Presenta las ecuaciones finales ordenadas, función de transferencia G(s) simplificada, polos, ceros o matrices A, B, C, D claramente delimitadas.

### PASO 4: Código MATLAB y Guía de Simulink
Entrega el código MATLAB completo y listo para ejecutar, comentando cada línea de código, e indica qué bloques usar en Simulink (ej: Step, Sum, Gain, Integrator, Transfer Fcn, Scope) y cómo conectarlos.

### PASO 5: Pregunta de Verificación
Cierra SIEMPRE tu respuesta con una pregunta rápida o un pequeño ejercicio desafío para asegurarte de que el usuario entendió el tema antes de avanzar.

[REGLAS DE INTERACCIÓN]
- Respuestas siempre en español.
- Sé extremadamente minucioso en los cálculos algebraicos.
- Si el usuario está respondiendo a un PASO 5 anterior o te hace una consulta de seguimiento, evalúa su respuesta paso a paso con amabilidad, muestra si está correcto o en qué paso exacto falló, y refuérzalo positivamente.
- Adapta el ritmo al nivel de comprensión del estudiante.`;

// API endpoint for ControlBot chat
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'No se encontró GEMINI_API_KEY en las variables de entorno.',
      });
    }

    const { messages, contextTopic } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'La lista de mensajes es requerida.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let specializedSystemPrompt = SYSTEM_PROMPT;
    if (contextTopic) {
      specializedSystemPrompt += `\n\n[CONTEXTO ACTUAL DEL ALUMNO]: El usuario está estudiando el módulo: "${contextTopic}". Enfoca las explicaciones y analogías prioritariamente en este ámbito.`;
    }

    // Format chat history for Gemini API
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Call gemini-3.7-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: formattedContents,
      config: {
        systemInstruction: specializedSystemPrompt,
        temperature: 0.2, // Low temperature for high algebraic precision
        topP: 0.95,
      },
    });

    const replyText = response.text || 'No se pudo generar respuesta.';

    return res.json({
      role: 'assistant',
      content: replyText,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Ocurrió un error al procesar la consulta con ControlBot.',
    });
  }
});

// Verification check for exercise solutions
app.post('/api/verify-step5', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'No se encontró GEMINI_API_KEY en el servidor.',
      });
    }

    const { question, userAnswer, contextTopic } = req.body;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Como ControlBot, evalúa la siguiente respuesta de un estudiante al desafío o Pregunta de Verificación (Paso 5):
    
TEMA: ${contextTopic || 'Control Automático y Modelamiento'}
PREGUNTA DEL DESAFÍO: ${question}
RESPUESTA DEL ESTUDIANTE: ${userAnswer}

Entrega una respuesta motivadora, pedagógica y directa indicando:
1. ¿Es correcta la respuesta? (CORRECTO / PARCIALMENTE CORRECTO / INCORRECTO)
2. Explicación paso a paso de por qué es correcta o en qué renglón/signo/concepto se equivocó.
3. El resultado exacto algebraico y numérico.
4. Un mensaje motivador para el siguiente nivel.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
      },
    });

    return res.json({
      evaluation: response.text || 'Sin evaluación.',
    });
  } catch (error: any) {
    console.error('Error in /api/verify-step5:', error);
    return res.status(500).json({
      error: error?.message || 'Error evaluando respuesta.',
    });
  }
});

// Generate 5 Review Flashcards analyzing the chat content
app.post('/api/generate-flashcards', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'No se encontró GEMINI_API_KEY en el servidor.',
      });
    }

    const { messages, contextTopic } = req.body;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const chatSummary = Array.isArray(messages) && messages.length > 0
      ? messages.map((m: { role: string; content: string }) => `${m.role === 'user' ? 'ESTUDIANTE' : 'PROFESOR CONTROLBOT'}: ${m.content}`).join('\n\n')
      : 'Conversación general sobre Modelamiento de Sistemas Dinámicos, Laplace, Circuitos RLC, Sistemas Masa-Resorte-Amortiguador, Espacio de Estados y MATLAB.';

    const flashcardsPrompt = `Eres un experto pedagógico en Ingeniería de Control y Sistemas Dinámicos.
Analiza detenidamente la siguiente sesión de chat entre el estudiante y el profesor ControlBot:

=== SESIÓN DE CHAT ===
${chatSummary}
=== FIN SESIÓN ===

TEMA DE CONTEXTO: ${contextTopic || 'Modelamiento y Control Automático'}

TAREA OBLIGATORIA:
Genera EXACTAMENTE 5 FLASHCARDS DE REPASO TÉCNICO de alto valor académico para examen sobre los conceptos clave, fórmulas, procedimientos algebraicos, matrices de estado o comandos MATLAB discutidos en la conversación.

REGLAS DE FORMATO:
Debes responder ÚNICAMENTE con un objeto JSON válido (sin formato markdown alrededor o usando un bloque json limpio), con la siguiente estructura:
{
  "flashcards": [
    {
      "id": "card-1",
      "topic": "Título corto del concepto",
      "category": "Laplace / Eléctrico / Mecánico / Espacio de Estados / MATLAB",
      "question": "Pregunta conceptual o desafío matemático con LaTeX ($...$)",
      "mathFormula": "Fórmula matemática clave en LaTeX ($$..$$ o $..$)",
      "answer": "Respuesta directa y clara",
      "explanation": "Desarrollo paso a paso o intuición física clave"
    },
    ... (exactamente 5 flashcards)
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: flashcardsPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback regex extraction if json has wrappers
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo parsear el JSON de flashcards.');
      }
    }

    if (parsedData && Array.isArray(parsedData.flashcards)) {
      // Ensure each card has a distinct and reliable id
      parsedData.flashcards = parsedData.flashcards.map((fc: any, index: number) => ({
        ...fc,
        id: fc.id || `card-${Date.now()}-${index + 1}`,
      }));
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/generate-flashcards:', error);
    // Return high quality fallback flashcards if API or network issue occurs
    const fallbackFlashcards = [
      {
        id: 'fc-1',
        topic: 'Definición de Linealidad',
        category: 'Fundamentos',
        question: '¿Cuáles son las dos propiedades matemáticas que debe cumplir un sistema para ser clasificado como lineal?',
        mathFormula: 'T[a x_1(t) + b x_2(t)] = a T[x_1(t)] + b T[x_2(t)]',
        answer: 'Principio de Superposición: Aditividad y Homogeneidad (Escalamiento).',
        explanation: 'La aditividad asegura que la respuesta a una suma de entradas sea la suma de respuestas individuales. La homogeneidad asegura que escalar la entrada por una constante escale la salida por esa misma constante.'
      },
      {
        id: 'fc-2',
        topic: 'Circuito RLC Serie por LVK',
        category: 'Eléctrico',
        question: '¿Cuál es la ecuación en el dominio transformado de Laplace para un circuito RLC serie con salida en el capacitor $v_c(t)$?',
        mathFormula: 'G(s) = \\frac{V_c(s)}{V_{in}(s)} = \\frac{1}{L C s^2 + R C s + 1} = \\frac{\\omega_n^2}{s^2 + 2\\zeta \\omega_n s + \\omega_n^2}',
        answer: 'Función de transferencia de segundo orden estándar.',
        explanation: 'Frecuencia natural $\\omega_n = 1/\\sqrt{LC}$ y factor de amortiguamiento $\\zeta = \\frac{R}{2}\\sqrt{C/L}$.'
      },
      {
        id: 'fc-3',
        topic: 'Masa-Resorte-Amortiguador',
        category: 'Mecánico',
        question: 'En un sistema mecánico traslacional $m \\ddot{x} + b \\dot{x} + k x = f(t)$, ¿cuál es su función de transferencia $X(s)/F(s)$?',
        mathFormula: 'G(s) = \\frac{X(s)}{F(s)} = \\frac{1}{m s^2 + b s + k}',
        answer: 'G(s) = 1 / (m s^2 + b s + k)',
        explanation: 'Aplicando la transformada de Laplace con condiciones iniciales nulas: $(m s^2 + b s + k) X(s) = F(s)$.'
      },
      {
        id: 'fc-4',
        topic: 'Espacio de Estados',
        category: 'Espacio de Estados',
        question: '¿Cómo se calcula la función de transferencia $G(s)$ a partir de las matrices de estado $(A, B, C, D)$?',
        mathFormula: 'G(s) = \\mathbf{C}(s\\mathbf{I} - \\mathbf{A})^{-1}\\mathbf{B} + \\mathbf{D}',
        answer: 'G(s) = C * inv(s*I - A) * B + D',
        explanation: 'El polinomio característico del sistema coincide con $\\det(s\\mathbf{I} - \\mathbf{A}) = 0$, cuyas raíces son los autovalores y polos.'
      },
      {
        id: 'fc-5',
        topic: 'Comandos MATLAB de Control',
        category: 'MATLAB',
        question: '¿Qué comandos de MATLAB se utilizan para definir $G(s)$, graficar la respuesta al escalón y obtener las matrices $(A,B,C,D)$?',
        mathFormula: '\\text{sys} = tf(num, den); \\quad step(sys); \\quad [A,B,C,D] = tf2ss(num, den);',
        answer: 'tf(), step(), bode(), tf2ss() y feedback().',
        explanation: 'tf() crea la función de transferencia en el espacio de trabajo, step() grafica la respuesta temporal ante escalón unitario, y tf2ss() genera las matrices canónicas.'
      }
    ];

    return res.json({ flashcards: fallbackFlashcards });
  }
});

// MATLAB Code Review & Linting Endpoint
app.post('/api/review-matlab', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'No se encontró GEMINI_API_KEY en el servidor.',
      });
    }

    const { code, targetSystem } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Debes proporcionar un script de MATLAB válido.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const matlabReviewPrompt = `Eres el evaluador técnico de MATLAB / Control System Toolbox para ControlBot.
Analiza minuciosamente el siguiente código de MATLAB proporcionado por un estudiante de ingeniería:

\`\`\`matlab
${code}
\`\`\`

CONTEXTO O SISTEMA OBJETIVO: ${targetSystem || 'Sistemas Dinámicos y Control Automático'}

TAREA OBLIGATORIA:
Realiza una auditoría exhaustiva de:
1. Sintaxis de MATLAB (puntos y coma, dimensiones de vectores num/den, nombres de funciones reservadas de Control System Toolbox como tf, step, bode, rlocus, tf2ss, ss, lsim, feedback).
2. Eficiencia y buenas prácticas (vectorización, preasignación, claridad en los títulos/etiquetas xlabel/ylabel/grid).
3. Coherencia física y matemática con el modelamiento de control (orden del polinomio del denominador >= numerador, estabilidad por polos, condiciones iniciales).
4. Sugerencia de versión optimizada y lista para ejecutar.

REGLAS DE FORMATO:
Responde ÚNICAMENTE con un JSON con la siguiente estructura:
{
  "status": "ready" | "needs_fixes" | "critical_error",
  "score": 100, // número de 0 a 100
  "summary": "Resumen ejecutivo en 1-2 oraciones del estado del script",
  "syntaxErrors": [
    "Error 1 o advertencia de sintaxis", ...
  ],
  "efficiencyTips": [
    "Recomendación de vectorización, rendimiento o buenas prácticas", ...
  ],
  "controlObservations": [
    "Observación técnica sobre la estabilidad, orden o funciones de transferencia", ...
  ],
  "correctedCode": "Código MATLAB completo, optimizado, comentado pedagógicamente y listo para ejecutar con copy/paste",
  "expectedSimulationOutput": "Descripción de qué curva o gráfica se obtendrá al correrlo en MATLAB"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: matlabReviewPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '{}';
    let parsedReview;
    try {
      parsedReview = JSON.parse(responseText);
    } catch (parseErr) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedReview = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo procesar la respuesta JSON de revisión de MATLAB.');
      }
    }

    return res.json(parsedReview);
  } catch (error: any) {
    console.error('Error in /api/review-matlab:', error);
    return res.status(500).json({
      error: error?.message || 'Error al revisar el código de MATLAB.',
    });
  }
});


// Setup Vite or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ControlBot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
