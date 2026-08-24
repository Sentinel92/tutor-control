import React, { useState } from 'react';
import { MathRenderer } from './MathRenderer';
import { syncProgressToFirebase, loadProgressFromFirebase } from '../services/progressService';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Sparkles,
  RefreshCw,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  id: string;
  unit: string;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado' | 'Examen';
  question: string;
  hint: string;
  expectedConcept: string;
}

const QUIZ_BANK: QuizQuestion[] = [
  {
    id: 'q1',
    unit: 'Unidad 1: Linealidad',
    difficulty: 'Fácil',
    question: 'Sea el sistema con relación entrada-salida $y(t) = 4 \\cdot x(t) + 7$. Demuestra formalmente si cumple con la propiedad de homogeneidad y si es lineal.',
    hint: 'Evalúa $f(k \\cdot x)$ y compáralo con $k \\cdot f(x)$. ¿Qué pasa con la constante +7 cuando $x=0$?',
    expectedConcept: 'No es lineal porque f(0) = 7 != 0 y no cumple homogeneidad ni aditividad.'
  },
  {
    id: 'q2',
    unit: 'Unidad 2: Laplace y Polos',
    difficulty: 'Intermedio',
    question: 'Dada la función de transferencia $G(s) = \\frac{25}{s^2 + 6s + 25}$, calcula los polos del sistema, la frecuencia natural $\\omega_n$, el factor de amortiguamiento $\\zeta$ y el sobreimpulso máximo porcentual $\\%M_p$.',
    hint: 'Compara con la forma estándar $s^2 + 2\\zeta\\omega_n s + \\omega_n^2$. Así $\\omega_n^2 = 25$ y $2\\zeta\\omega_n = 6$.',
    expectedConcept: 'wn=5, zeta=0.6, polos = -3 +- j4, %Mp = exp(-0.6*pi / 0.8) * 100% = 9.48%'
  },
  {
    id: 'q3',
    unit: 'Unidad 3: Circuitos RLC',
    difficulty: 'Intermedio',
    question: 'En un circuito RLC serie con $R = 4\\,\\Omega$, $L = 2\\,\\text{H}$, $C = 0.5\\,\\text{F}$, escribe la ecuación diferencial que relaciona la tensión de entrada $v_{in}(t)$ con la carga $q(t)$. Luego obtén la función de transferencia $\\frac{V_C(s)}{V_{in}(s)}$.',
    hint: 'Aplica LVK: $L \\ddot{q} + R \\dot{q} + \\frac{1}{C} q = v_{in}(t)$ y recuerda que $v_C(t) = \\frac{1}{C}q(t)$.',
    expectedConcept: '2 q\'\' + 4 q\' + 2 q = v_in(t), G(s) = 1 / (L*C*s^2 + R*C*s + 1) = 1 / (s^2 + 2s + 1)'
  },
  {
    id: 'q4',
    unit: 'Unidad 4: Masa-Resorte',
    difficulty: 'Avanzado',
    question: 'Para un sistema masa-resorte-amortiguador con $m = 2\\,\\text{kg}$ y rigidez $k = 32\\,\\text{N/m}$, ¿qué valor exacto debe tener el coeficiente de amortiguamiento viscoso $b$ para que el sistema tenga un amortiguamiento crítico ($\\zeta = 1$)?',
    hint: 'Usa la fórmula $\\zeta = \\frac{b}{2\\sqrt{m k}} = 1 \\Rightarrow b = 2\\sqrt{m k}$.',
    expectedConcept: 'b = 2 * sqrt(2 * 32) = 2 * sqrt(64) = 2 * 8 = 16 N*s/m'
  },
  {
    id: 'q5',
    unit: 'Unidad 5: Engranajes y Motores',
    difficulty: 'Avanzado',
    question: 'Un motor con inercia $J_1 = 0.05\\,\\text{kg}\\cdot\\text{m}^2$ se acopla a una carga con inercia $J_2 = 5\\,\\text{kg}\\cdot\\text{m}^2$ mediante un reductor con relación de dientes $\\frac{N_1}{N_2} = \\frac{1}{10}$. Calcula la inercia total equivalente reflejada en el eje del motor $J_{eq}$.',
    hint: 'La inercia de la carga reflejada al eje 1 es $J_2 \\cdot \\left(\\frac{N_1}{N_2}\\right)^2$.',
    expectedConcept: 'J_eq = J_1 + J_2*(N1/N2)^2 = 0.05 + 5*(1/100) = 0.05 + 0.05 = 0.1 kg*m^2'
  },
  {
    id: 'q6',
    unit: 'Unidad 6: Espacio de Estados',
    difficulty: 'Examen',
    question: 'Dado el sistema $\\dot{\\mathbf{x}} = \\begin{bmatrix} 0 & 1 \\\\ -10 & -7 \\end{bmatrix} \\mathbf{x} + \\begin{bmatrix} 0 \\\\ 1 \\end{bmatrix} u$, $y = \\begin{bmatrix} 2 & 1 \\end{bmatrix} \\mathbf{x}$. Determina la función de transferencia $G(s) = \\frac{Y(s)}{U(s)}$ analíticamente.',
    hint: 'Calcula $(s\\mathbf{I}-\\mathbf{A})^{-1}$ usando la adjunta y determinante, y evalúa $\\mathbf{C}(s\\mathbf{I}-\\mathbf{A})^{-1}\\mathbf{B}$.',
    expectedConcept: 'det(sI-A) = s^2 + 7s + 10 = (s+2)(s+5). C*adj*B = [2 1]*[1; s] = s + 2. G(s) = (s+2)/(s^2+7s+10) = 1/(s+5)'
  },
];

interface QuizTrainerProps {
  onAskControlBot: (prompt: string) => void;
}

export const QuizTrainer: React.FC<QuizTrainerProps> = ({ onAskControlBot }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [userSolution, setUserSolution] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const currentQ = QUIZ_BANK[selectedIdx];

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSolution.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluation(null);

    try {
      const res = await fetch('/api/verify-step5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          userAnswer: userSolution.trim(),
          contextTopic: currentQ.unit,
        }),
      });

      const data = await res.json();
      if (res.ok && data.evaluation) {
        setEvaluation(data.evaluation);
        const isCorrect =
          data.evaluation.toLowerCase().includes('correcto') &&
          !data.evaluation.toLowerCase().includes('incorrecto');

        if (isCorrect) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });

          // Sync solved challenge to Firebase
          loadProgressFromFirebase().then((current) => {
            const solved = current.solvedChallengeIds || [];
            if (!solved.includes(currentQ.id)) {
              syncProgressToFirebase({
                solvedChallengeIds: [...solved, currentQ.id],
              });
            }
          });
        }
      } else {
        setEvaluation(data.error || 'Error evaluando.');
      }
    } catch {
      setEvaluation('Error de conexión con el evaluador.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAskFullExplanation = () => {
    const prompt = `Resuelve este ejercicio de examen correspondiente a "${currentQ.unit}":
"${currentQ.question}"

Aplica la metodología completa de 5 pasos con todo el rigor algebraico:
1. Intuición Física
2. Desarrollo Matemático Detallado
3. Representación Matricial / G(s)
4. Código MATLAB y Simulink
5. Pregunta de verificación adicional`;

    onAskControlBot(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Entrenador de Desafíos & Banco de Exámenes (Paso 5)
            </h2>
            <p className="text-xs text-slate-500">
              Pon a prueba tus habilidades de modelamiento y control. Escribe tu procedimiento y
              recibe corrección instantánea paso a paso de ControlBot.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold">
            Ejercicio {selectedIdx + 1} de {QUIZ_BANK.length}
          </span>
        </div>
      </div>

      {/* Quiz Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {QUIZ_BANK.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => {
              setSelectedIdx(idx);
              setUserSolution('');
              setEvaluation(null);
              setShowHint(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all shadow-2xs ${
              selectedIdx === idx
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>Reto {idx + 1}: {q.unit.split(':')[1] || q.unit}</span>
          </button>
        ))}
      </div>

      {/* Active Challenge Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Panel (Left 6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {currentQ.unit}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                  currentQ.difficulty === 'Examen'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : currentQ.difficulty === 'Avanzado'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                Nivel {currentQ.difficulty}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm md:text-base font-medium leading-relaxed">
              <MathRenderer content={currentQ.question} />
            </div>

            {/* Hint toggler */}
            <div>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1"
              >
                <span>{showHint ? 'Ocultar Pista de Modelamiento' : '💡 Ver Pista de Modelamiento'}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                  <MathRenderer content={currentQ.hint} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleAskFullExplanation}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Pedir Desarrollo de 5 Pasos a ControlBot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Answer Submission & AI Grading (Right 6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tu Solución Algebraica o Respuesta
              </span>
              <span className="text-[11px] text-slate-500 font-mono">ControlBot AI Review</span>
            </div>

            <form onSubmit={handleEvaluate} className="space-y-3">
              <textarea
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                placeholder="Escribe aquí tu procedimiento paso a paso, ecuaciones o valores finales (ej: wn=5, polos=-3+-j4, %Mp=9.48%)..."
                rows={6}
                className="w-full p-3.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserSolution('');
                    setEvaluation(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  disabled={!userSolution.trim() || isEvaluating}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluando con Rigor...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Calificar Mi Solución</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Evaluation Result Feedback */}
            {evaluation && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-blue-200 text-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Dictamen y Retroalimentación de ControlBot:</span>
                </div>
                <MathRenderer content={evaluation} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
