import React, { useState, useMemo } from 'react';
import { MathRenderer } from './MathRenderer';
import { Grid, Sparkles, Check, AlertCircle, Cpu, Layers } from 'lucide-react';

interface StateSpaceCalcProps {
  onAskControlBot: (prompt: string) => void;
}

export const StateSpaceCalc: React.FC<StateSpaceCalcProps> = ({ onAskControlBot }) => {
  // 2x2 Matrix A
  const [a11, setA11] = useState<number>(0);
  const [a12, setA12] = useState<number>(1);
  const [a21, setA21] = useState<number>(-8);
  const [a22, setA22] = useState<number>(-6);

  // 2x1 Matrix B
  const [b1, setB1] = useState<number>(0);
  const [b2, setB2] = useState<number>(1);

  // 1x2 Matrix C
  const [c1, setC1] = useState<number>(1);
  const [c2, setC2] = useState<number>(0);

  // 1x1 Matrix D
  const [d1, setD1] = useState<number>(0);

  // Preset Presets
  const applyPreset = (type: string) => {
    if (type === 'rlc') {
      // RLC: R=2, L=1, C=0.25 -> a21 = -1/(LC) = -4, a22 = -R/L = -2
      setA11(0); setA12(1); setA21(-4); setA22(-2);
      setB1(0); setB2(4);
      setC1(1); setC2(0);
      setD1(0);
    } else if (type === 'mass-spring') {
      // m=2, b=4, k=10 -> a21 = -k/m = -5, a22 = -b/m = -2
      setA11(0); setA12(1); setA21(-5); setA22(-2);
      setB1(0); setB2(0.5);
      setC1(1); setC2(0);
      setD1(0);
    } else if (type === 'unstable') {
      setA11(0); setA12(1); setA21(6); setA22(1);
      setB1(0); setB2(1);
      setC1(1); setC2(0);
      setD1(0);
    } else if (type === 'oscillator') {
      setA11(0); setA12(1); setA21(-9); setA22(0);
      setB1(0); setB2(1);
      setC1(1); setC2(0);
      setD1(0);
    }
  };

  // State Space Computations
  const results = useMemo(() => {
    // Characteristic poly: det(sI - A) = s^2 - (a11+a22)s + (a11*a22 - a12*a21)
    const tr = a11 + a22;
    const det = a11 * a22 - a12 * a21;
    // s^2 + a1 s + a0
    const a1 = -tr;
    const a0 = det;

    // Discriminant: tr^2 - 4*det
    const disc = tr * tr - 4 * det;
    let pole1Str = '';
    let pole2Str = '';
    let isStable = false;

    if (disc >= 0) {
      const p1 = (tr + Math.sqrt(disc)) / 2;
      const p2 = (tr - Math.sqrt(disc)) / 2;
      pole1Str = `${p1.toFixed(3)}`;
      pole2Str = `${p2.toFixed(3)}`;
      isStable = p1 < 0 && p2 < 0;
    } else {
      const real = tr / 2;
      const imag = Math.sqrt(-disc) / 2;
      pole1Str = `${real.toFixed(3)} + j${imag.toFixed(3)}`;
      pole2Str = `${real.toFixed(3)} - j${imag.toFixed(3)}`;
      isStable = real < 0;
    }

    // Controllability matrix: Ctrb = [B, A*B]
    // A*B:
    const ab1 = a11 * b1 + a12 * b2;
    const ab2 = a21 * b1 + a22 * b2;
    // det(Ctrb) = b1*ab2 - b2*ab1
    const detCtrb = b1 * ab2 - b2 * ab1;
    const isControllable = Math.abs(detCtrb) > 1e-6;

    // Observability matrix: Obsv = [C; C*A]
    // C*A:
    const ca1 = c1 * a11 + c2 * a21;
    const ca2 = c1 * a12 + c2 * a22;
    // det(Obsv) = c1*ca2 - c2*ca1
    const detObsv = c1 * ca2 - c2 * ca1;
    const isObservable = Math.abs(detObsv) > 1e-6;

    // Transfer function G(s) = C * adj(sI - A) * B / det(sI - A) + D
    // sI - A = [ s - a11,  -a12;  -a21, s - a22 ]
    // adj(sI - A) = [ s - a22,  a12;  a21, s - a11 ]
    // C * adj(sI-A) = [ c1*(s-a22) + c2*a21 , c1*a12 + c2*(s-a11) ]
    // (C * adj * B) = (c1*s - c1*a22 + c2*a21)*b1 + (c1*a12 + c2*s - c2*a11)*b2
    // = s * (c1*b1 + c2*b2) + [ b1*(-c1*a22 + c2*a21) + b2*(c1*a12 - c2*a11) ]
    const num_s1 = c1 * b1 + c2 * b2;
    const num_s0 = b1 * (-c1 * a22 + c2 * a21) + b2 * (c1 * a12 - c2 * a11);

    const numPoly = num_s1 !== 0 ? `${num_s1.toFixed(2)}s + ${num_s0.toFixed(2)}` : `${num_s0.toFixed(2)}`;
    const denPoly = `s^2 ${a1 >= 0 ? '+ ' + a1.toFixed(2) : '- ' + Math.abs(a1).toFixed(2)}s ${
      a0 >= 0 ? '+ ' + a0.toFixed(2) : '- ' + Math.abs(a0).toFixed(2)
    }`;

    return {
      tr,
      det,
      a1,
      a0,
      pole1Str,
      pole2Str,
      isStable,
      ab1,
      ab2,
      detCtrb,
      isControllable,
      ca1,
      ca2,
      detObsv,
      isObservable,
      numPoly,
      denPoly,
    };
  }, [a11, a12, a21, a22, b1, b2, c1, c2, d1]);

  const handleAskControlBot = () => {
    const prompt = `Analiza detalladamente este sistema en Espacio de Estados:
- Matriz A: [${a11}, ${a12}; ${a21}, ${a22}]
- Matriz B: [${b1}; ${b2}]
- Matriz C: [${c1}, ${c2}]
- Matriz D: [${d1}]

Resultados preliminares:
- Polinomio característico: det(sI-A) = ${results.denPoly}
- Polos: ${results.pole1Str}, ${results.pole2Str} (Estabilidad: ${results.isStable ? 'Estable' : 'Inestable'})
- Controlabilidad: det(C) = ${results.detCtrb.toFixed(2)} (${results.isControllable ? 'Controlable' : 'No controlable'})
- Observabilidad: det(O) = ${results.detObsv.toFixed(2)} (${results.isObservable ? 'Observable' : 'No observable'})

Por favor, desarrolla la solución completa en 5 pasos obligatorios:
1. Intuición Física
2. Desarrollo Matemático detallado con C*(sI-A)^(-1)*B + D
3. Representación Matricial final y formas canónicas
4. Código MATLAB listo con tf2ss, ctrb, obsv y diagrama Simulink
5. Pregunta de verificación desafiante.`;

    onAskControlBot(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Calculadora y Analizador de Espacio de Estados
            </h2>
            <p className="text-xs text-slate-500">
              Ingresa matrices A, B, C, D para calcular polinomio característico, polos, controlabilidad,
              observabilidad y función de transferencia G(s).
            </p>
          </div>
        </div>

        <button
          onClick={handleAskControlBot}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>Resolver en 5 Pasos con ControlBot</span>
        </button>
      </div>

      {/* Presets Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">Cargar Ejemplos Clásicos:</span>
        <button
          onClick={() => applyPreset('rlc')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 shadow-2xs transition-colors font-medium"
        >
          Circuito RLC Serie
        </button>
        <button
          onClick={() => applyPreset('mass-spring')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 shadow-2xs transition-colors font-medium"
        >
          Masa-Resorte-Amortiguador
        </button>
        <button
          onClick={() => applyPreset('oscillator')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 shadow-2xs transition-colors font-medium"
        >
          Oscilador Puro (Marginal)
        </button>
        <button
          onClick={() => applyPreset('unstable')}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 shadow-2xs transition-colors font-medium"
        >
          Sistema Inestable
        </button>
      </div>

      {/* Input Matrices Grid & Computed Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Matrix Inputs (Left - 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Definición de Matrices de Estado
            </h3>

            {/* Matrix A (2x2) */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Matriz Dinámica A (2x2):</span>
                <span className="text-[11px] font-mono text-blue-700 font-bold">
                  [{a11}, {a12}; {a21}, {a22}]
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">a11</label>
                  <input
                    type="number"
                    step="0.1"
                    value={a11}
                    onChange={(e) => setA11(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">a12</label>
                  <input
                    type="number"
                    step="0.1"
                    value={a12}
                    onChange={(e) => setA12(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">a21</label>
                  <input
                    type="number"
                    step="0.1"
                    value={a21}
                    onChange={(e) => setA21(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">a22</label>
                  <input
                    type="number"
                    step="0.1"
                    value={a22}
                    onChange={(e) => setA22(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Matrix B (2x1) & Matrix C (1x2) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">
                  Matriz Entrada B (2x1):
                </div>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="number"
                    step="0.1"
                    value={b1}
                    onChange={(e) => setB1(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={b2}
                    onChange={(e) => setB2(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">
                  Matriz Salida C (1x2):
                </div>
                <div className="flex gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="number"
                    step="0.1"
                    value={c1}
                    onChange={(e) => setC1(parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={c2}
                    onChange={(e) => setC2(parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Matrix D (1x1) */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">
                Transmisión Directa D (1x1):
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="number"
                  step="0.1"
                  value={d1}
                  onChange={(e) => setD1(parseFloat(e.target.value) || 0)}
                  className="w-24 mx-auto block px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Analytic Output & Properties (Right - 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Transfer Function Equivalence */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Función de Transferencia Equivalente G(s) = C(sI - A)⁻¹B + D
            </h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-blue-900 font-bold">
              <MathRenderer content={`$$G(s) = \\frac{${results.numPoly}}{${results.denPoly}}$$`} />
            </div>
          </div>

          {/* Poles & Stability */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Ecuación Característica y Polos
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                  results.isStable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {results.isStable ? 'Asintóticamente Estable' : 'Inestable o Marginal'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Polinomio Característico:</div>
                <div className="font-mono text-blue-700 font-bold text-sm">
                  P(s) = {results.denPoly} = 0
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Autovalores (Polos λ):</div>
                <div className="font-mono text-slate-800 font-bold text-sm">
                  s1 = {results.pole1Str}
                  <br />
                  s2 = {results.pole2Str}
                </div>
              </div>
            </div>
          </div>

          {/* Controllability & Observability (Kalman criteria) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Controllability */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase">Controlabilidad</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    results.isControllable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {results.isControllable ? 'Controlable' : 'No Controlable'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                <div className="font-bold text-slate-500">Matriz Ctrb = [B, A*B]:</div>
                <div className="mt-1 text-slate-800 font-bold">
                  [[{b1}, {results.ab1}]; [{b2}, {results.ab2}]]
                </div>
                <div className="mt-1 text-blue-700 font-bold">det(Ctrb) = {results.detCtrb.toFixed(2)}</div>
              </div>
            </div>

            {/* Observability */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase">Observabilidad</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    results.isObservable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {results.isObservable ? 'Observable' : 'No Observable'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                <div className="font-bold text-slate-500">Matriz Obsv = [C; C*A]:</div>
                <div className="mt-1 text-slate-800 font-bold">
                  [[{c1}, {c2}]; [{results.ca1}, {results.ca2}]]
                </div>
                <div className="mt-1 text-blue-700 font-bold">det(Obsv) = {results.detObsv.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
