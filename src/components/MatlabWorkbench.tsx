import React, { useState } from 'react';
import { MatlabReviewResult } from '../types/extra';
import { MathRenderer } from './MathRenderer';
import {
  Code,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Download,
  FileCode,
  Sliders,
  ExternalLink,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';

interface MatlabWorkbenchProps {
  onApplySystemParams?: (params: { wn: number; zeta: number; type: 'standard' | 'mechanical' | 'electrical' }) => void;
  onAskControlBot?: (prompt: string) => void;
}

interface MatlabPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  inferredWn?: number;
  inferredZeta?: number;
  type: 'standard' | 'mechanical' | 'electrical';
}

const MATLAB_PRESETS: MatlabPreset[] = [
  {
    id: 'mass-spring-damper',
    name: 'Masa-Resorte-Amortiguador (2do Orden)',
    category: 'Mecánico',
    description: 'Sistema traslacional con m=1.5 kg, b=1.2 Ns/m, k=13.5 N/m',
    inferredWn: 3.0,
    inferredZeta: 0.4,
    type: 'mechanical',
    code: `% Modelamiento de Sistema Masa-Resorte-Amortiguador
clc; clear; close all;

% Parámetros físicos del sistema
m = 1.5;   % Masa [kg]
b = 1.2;   % Coeficiente de amortiguamiento [N*s/m]
k = 13.5;  % Constante de rigidez [N/m]

% Función de Transferencia G(s) = X(s)/F(s) = 1 / (m*s^2 + b*s + k)
num = [1];
den = [m, b, k];
sys = tf(num, den);

% Cálculo de parámetros característicos
wn = sqrt(k/m);
zeta = b / (2*sqrt(k*m));
wd = wn * sqrt(1 - zeta^2);
Mp = exp(-pi*zeta/sqrt(1 - zeta^2)) * 100;
Ts_2 = 4 / (zeta*wn);

fprintf('--- Parámetros del Sistema ---\\n');
fprintf('Frecuencia Natural (wn): %.2f rad/s\\n', wn);
fprintf('Factor de Amortiguamiento (zeta): %.2f\\n', zeta);
fprintf('Sobreimpulso Máximo (Mp): %.2f %%\\n', Mp);
fprintf('Tiempo de Asentamiento al 2%% (Ts): %.2f s\\n', Ts_2);

% Gráfica de Respuesta ante Escalón Unitario
t = 0:0.01:6;
figure('Name', 'Respuesta Temporal', 'Color', 'w');
step(sys, t);
title('Respuesta ante Entrada Escalón Unitario - Masa Resorte');
xlabel('Tiempo [s]');
ylabel('Posición x(t) [m]');
grid on;
`,
  },
  {
    id: 'rlc-series-circuit',
    name: 'Circuito RLC Serie (Voltaje en Condensador)',
    category: 'Eléctrico',
    description: 'Circuito RLC serie con R=4.0 Ω, L=0.8 H, C=0.1 F',
    inferredWn: 3.54,
    inferredZeta: 0.71,
    type: 'electrical',
    code: `% Modelamiento de Circuito RLC Serie por Ley de Voltajes de Kirchhoff (LVK)
clc; clear; close all;

% Parámetros de componentes pasivos
R = 4.0;   % Resistencia [Ohmios]
L = 0.8;   % Inductancia [Henrios]
C = 0.1;   % Capacitancia [Faradios]

% Función de Transferencia Vc(s)/Vin(s) = (1/(L*C)) / (s^2 + (R/L)*s + 1/(L*C))
num = [1/(L*C)];
den = [1, R/L, 1/(L*C)];
G_rlc = tf(num, den);

% Polos y Ceros
[ceros, polos] = pzmap(G_rlc);
fprintf('Polos del Circuito RLC:\\n');
disp(polos);

% Respuesta temporal y Diagrama de Bode
figure('Name', 'Análisis Circuito RLC', 'Color', 'w');
subplot(2,1,1);
step(G_rlc);
title('Respuesta al Escalón de Voltaje Vc(t)');
xlabel('Tiempo [s]'); ylabel('Voltaje [V]'); grid on;

subplot(2,1,2);
bode(G_rlc);
grid on;
`,
  },
  {
    id: 'state-space-representation',
    name: 'Representación en Espacio de Estados (A, B, C, D)',
    category: 'Espacio de Estados',
    description: 'Conversión de ecuación diferencial a matrices de estado y simulación con lsim',
    inferredWn: 4.0,
    inferredZeta: 0.5,
    type: 'standard',
    code: `% Formulación en Espacio de Estados: dx/dt = A*x + B*u, y = C*x + D*u
clc; clear; close all;

% Matrices de estado para sistema de 2do orden
% x1 = posición x, x2 = velocidad dx/dt
A = [0, 1;
    -16, -4]; % wn^2 = 16 (wn=4), 2*zeta*wn = 4 (zeta=0.5)
B = [0;
     1];
C = [1, 0];
D = 0;

sys_ss = ss(A, B, C, D);

% Conversión a Función de Transferencia G(s)
[num, den] = ss2tf(A, B, C, D);
sys_tf = tf(num, den);

fprintf('Función de Transferencia Equivalente:\\n');
sys_tf

% Simulación con entrada arbitraria o escalón
t = 0:0.01:5;
u = ones(size(t)); % Escalón unitario
[y, t_out, x] = lsim(sys_ss, u, t);

figure('Name', 'Espacio de Estados', 'Color', 'w');
plot(t_out, y, 'LineWidth', 2, 'Color', [0 0.4470 0.7410]);
title('Salida y(t) del Sistema en Espacio de Estados');
xlabel('Tiempo [s]');
ylabel('Estado x_1(t) [Salida]');
grid on;
`,
  },
];

export const MatlabWorkbench: React.FC<MatlabWorkbenchProps> = ({
  onApplySystemParams,
  onAskControlBot,
}) => {
  const [code, setCode] = useState<string>(MATLAB_PRESETS[0].code);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(MATLAB_PRESETS[0].id);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<MatlabReviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);
  const [simulationApplied, setSimulationApplied] = useState(false);

  // Run audit with ControlBot API
  const handleRunAudit = async () => {
    if (!code.trim()) {
      setErrorMessage('Por favor pega o ingresa un script de MATLAB válido.');
      return;
    }

    setIsAuditing(true);
    setErrorMessage(null);
    setSimulationApplied(false);

    try {
      const response = await fetch('/api/review-matlab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          targetSystem: 'Modelamiento Dinámico y Control Automático (Control System Toolbox)',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setReviewResult(data);
      } else {
        setErrorMessage(data.error || 'Error al comunicarse con el evaluador de MATLAB.');
      }
    } catch (err: any) {
      setErrorMessage('Error de red al conectar con el servicio de revisión de MATLAB.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Copy code utility
  const handleCopyCode = (text: string, isOpt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOpt) {
      setCopiedOptimized(true);
      setTimeout(() => setCopiedOptimized(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
  };

  // Download .m file
  const handleDownloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulacion_controlbot.m';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Extract parameters from MATLAB script regex or preset to simulate in graphical lab
  const handleApplyToSimulationLab = () => {
    let wn = 3.0;
    let zeta = 0.4;
    let type: 'standard' | 'mechanical' | 'electrical' = 'standard';

    const currentPreset = MATLAB_PRESETS.find((p) => p.id === selectedPresetId);
    if (currentPreset && currentPreset.inferredWn) {
      wn = currentPreset.inferredWn;
      zeta = currentPreset.inferredZeta || 0.4;
      type = currentPreset.type;
    } else {
      // Basic regex parsing for wn and zeta from script
      const wnMatch = code.match(/wn\s*=\s*([0-9.]+)/i);
      const zetaMatch = code.match(/zeta\s*=\s*([0-9.]+)/i);
      const mMatch = code.match(/m\s*=\s*([0-9.]+)/i);
      const kMatch = code.match(/k\s*=\s*([0-9.]+)/i);
      const bMatch = code.match(/b\s*=\s*([0-9.]+)/i);

      if (wnMatch) wn = parseFloat(wnMatch[1]);
      if (zetaMatch) zeta = parseFloat(zetaMatch[1]);

      if (mMatch && kMatch && bMatch) {
        type = 'mechanical';
        const m = parseFloat(mMatch[1]);
        const k = parseFloat(kMatch[1]);
        const b = parseFloat(bMatch[1]);
        wn = Math.sqrt(k / m);
        zeta = b / (2 * Math.sqrt(m * k));
      }
    }

    if (onApplySystemParams) {
      onApplySystemParams({
        wn: Number(wn.toFixed(2)),
        zeta: Number(zeta.toFixed(2)),
        type,
      });
      setSimulationApplied(true);
      setTimeout(() => setSimulationApplied(false), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Preset Selector */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Taller de Código MATLAB & Control System Toolbox
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-300 font-bold">
                  Auditoría Automática con IA
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pega tu código .m: ControlBot audita sintaxis, compatibilidad con GNU Octave, rendimiento y coherencia física antes de simular.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plantillas:</span>
            {MATLAB_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setCode(preset.code);
                  setReviewResult(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  selectedPresetId === preset.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {preset.name.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor & Control Action Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Editor de Script MATLAB (.m):</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyCode(code, false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedOriginal ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              title="Descargar script .m listo para MATLAB Desktop o GNU Octave"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .m</span>
            </button>
          </div>
        </div>

        {/* Textarea code container */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setSelectedPresetId('custom');
            }}
            rows={12}
            placeholder="Pega tu código de MATLAB aquí..."
            className="w-full p-4 bg-slate-950 text-emerald-400 dark:text-emerald-300 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
            spellCheck={false}
          />
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToSimulationLab}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs"
              title="Cargar los parámetros de este código en las gráficas de respuesta interactiva"
            >
              {simulationApplied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">¡Parámetros Sincronizados!</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sincronizar con Simulador Gráfico</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {isAuditing ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Auditando con ControlBot...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Analizar Sintaxis & Optimizar</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Review Results Display Section */}
      {reviewResult && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors animate-in fade-in duration-300">
          {/* Status & Overall Score Header */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {reviewResult.status === 'ready' && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              {reviewResult.status === 'needs_fixes' && (
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              {reviewResult.status === 'critical_error' && (
                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {reviewResult.status === 'ready'
                    ? '✅ Código Correcto, Robusto y Listo para Simular'
                    : reviewResult.status === 'needs_fixes'
                    ? '⚠️ Requiere Ajustes Menores de Sintaxis o Eficiencia'
                    : '❌ Errores Críticos Detectados en MATLAB Toolbox'}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{reviewResult.summary}</p>
              </div>
            </div>

            <div className="text-right sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700 shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Puntaje de Eficiencia</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                <span
                  className={
                    reviewResult.score >= 85
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : reviewResult.score >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {reviewResult.score}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-sm font-semibold">/100</span>
              </div>
            </div>
          </div>

          {/* 3 Categories Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Syntax & Toolbox */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Sintaxis & Toolbox</span>
              </div>
              {reviewResult.syntaxErrors.length === 0 ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                  ✓ Sin errores de sintaxis en tf, step, ss o dimensiones de matrices.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {reviewResult.syntaxErrors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-md text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
                      <span className="font-bold text-rose-600">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2. Efficiency & Best Practices */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Eficiencia & Vectorización</span>
              </div>
              {reviewResult.efficiencyTips.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic p-2.5">
                  El código cumple con las buenas prácticas de vectorización y gestión de memoria.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {reviewResult.efficiencyTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-md text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
                      <span className="font-bold text-amber-600">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 3. Control & Dynamic Consistency */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Consistencia de Control</span>
              </div>
              {reviewResult.controlObservations.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic p-2.5">
                  Modelo matemáticamente causal y congruente con sistemas físicos.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {reviewResult.controlObservations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-1.5 bg-purple-50 dark:bg-purple-950/50 p-2 rounded-md text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-900">
                      <span className="font-bold text-purple-600">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Expected Simulation Output */}
          {reviewResult.expectedSimulationOutput && (
            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-200 font-medium">
              <span className="font-bold block text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Respuesta Dinámica Esperada al Ejecutar:</span>
              </span>
              {reviewResult.expectedSimulationOutput}
            </div>
          )}

          {/* Corrected Code Block */}
          {reviewResult.correctedCode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Script Optimizado y Comentado por ControlBot:</span>
                </span>
                <button
                  onClick={() => handleCopyCode(reviewResult.correctedCode, true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  {copiedOptimized ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOptimized ? 'Copiado' : 'Copiar Código Optimizado'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                {reviewResult.correctedCode}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
