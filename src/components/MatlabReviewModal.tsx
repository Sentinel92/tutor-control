import React, { useState } from 'react';
import { MatlabReviewResult } from '../types/extra';
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
} from 'lucide-react';

interface MatlabReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onApplyCode?: (code: string) => void;
  targetSystem?: string;
}

const DEFAULT_MATLAB_SAMPLE = `% Script de Simulación de Respuesta ante Escalón
% Sistema Masa-Resorte-Amortiguador (2do Orden)
clc; clear; close all;

m = 1.5;   % Masa (kg)
b = 2.0;   % Coeficiente de amortiguamiento (N*s/m)
k = 8.0;   % Constante elástica (N/m)

% Numerador y Denominador de G(s) = 1 / (m*s^2 + b*s + k)
num = [1];
den = [m, b, k];

sys = tf(num, den);

% Graficar respuesta temporal
figure;
step(sys);
title('Respuesta ante Entrada Escalón Unitario');
xlabel('Tiempo (segundos)');
ylabel('Posición x(t) [m]');
grid on;

% Análisis de parámetros característicos
wn = sqrt(k/m);
zeta = b / (2*sqrt(k*m));
fprintf('Frecuencia natural: %.2f rad/s\\n', wn);
fprintf('Factor de amortiguamiento: %.2f\\n', zeta);
`;

export const MatlabReviewModal: React.FC<MatlabReviewModalProps> = ({
  isOpen,
  onClose,
  initialCode,
  onApplyCode,
  targetSystem,
}) => {
  const [code, setCode] = useState<string>(initialCode || DEFAULT_MATLAB_SAMPLE);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<MatlabReviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    if (!code.trim()) {
      setErrorMessage('Por favor ingresa un fragmento de código MATLAB.');
      return;
    }

    setIsAuditing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/review-matlab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          targetSystem: targetSystem || 'Modelamiento y Simulación de Sistemas Dinámicos',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setReviewResult(data);
      } else {
        setErrorMessage(data.error || 'Error al comunicarse con el evaluador de MATLAB.');
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión con el servidor.');
    } finally {
      setIsAuditing(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Auditor de Sintaxis y Eficiencia MATLAB
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/80 border border-indigo-400/40 text-indigo-200 font-bold">
                  Control System Toolbox Linter
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Verifica consistencia física, funciones reservadas (tf, step, ss, bode) y optimización antes de simular
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#f8fafc]">
          {/* Editor Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Pega o edita tu script de MATLAB:</span>
                <span className="text-slate-400 font-normal">(.m script)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCode(DEFAULT_MATLAB_SAMPLE)}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Cargar Ejemplo
                </button>
                <button
                  onClick={() => handleCopyCode(code, false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {copiedOriginal ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedOriginal ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={8}
              placeholder="Pega tu código de MATLAB aquí..."
              className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs sm:text-sm rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              ControlBot revisará sintaxis, estabilidad, vectorización y coherencia física.
            </span>
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Auditando con ControlBot...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Auditar Código MATLAB</span>
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Review Results Section */}
          {reviewResult && (
            <div className="space-y-4 pt-3 border-t border-slate-200 animate-in fade-in duration-300">
              {/* Status Header Badge & Score */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {reviewResult.status === 'ready' && (
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  {reviewResult.status === 'needs_fixes' && (
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  {reviewResult.status === 'critical_error' && (
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {reviewResult.status === 'ready'
                          ? '✅ Código Correcto y Optimizado'
                          : reviewResult.status === 'needs_fixes'
                          ? '⚠️ Requiere Ajustes Menores de Sintaxis/Eficiencia'
                          : '❌ Errores Críticos de Ejecución Detectados'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{reviewResult.summary}</p>
                  </div>
                </div>

                <div className="text-right pl-4 border-l border-slate-100 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Puntaje de Calidad</div>
                  <div className="text-2xl font-black text-slate-900">
                    <span className={reviewResult.score >= 85 ? 'text-emerald-600' : reviewResult.score >= 60 ? 'text-amber-600' : 'text-rose-600'}>
                      {reviewResult.score}
                    </span>
                    <span className="text-slate-400 text-sm font-semibold">/100</span>
                  </div>
                </div>
              </div>

              {/* Three Breakdown Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Syntax & Toolbox */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Sintaxis & Toolbox</span>
                  </div>
                  {reviewResult.syntaxErrors.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg">
                      ✓ No se encontraron errores de sintaxis en funciones tf, step o variables.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {reviewResult.syntaxErrors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1.5 bg-rose-50/70 p-2 rounded-md text-rose-900">
                          <span className="font-bold">•</span>
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 2. Efficiency & Best Practices */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Eficiencia & Vectorización</span>
                  </div>
                  {reviewResult.efficiencyTips.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2">
                      El código sigue las pautas estándar de vectorización.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {reviewResult.efficiencyTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5 bg-amber-50/70 p-2 rounded-md text-amber-900">
                          <span className="font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Control & Physics Observations */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span>Análisis de Control Físico</span>
                  </div>
                  {reviewResult.controlObservations.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2">
                      Modelo consistente con sistemas dinámicos reales.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {reviewResult.controlObservations.map((obs, i) => (
                        <li key={i} className="flex items-start gap-1.5 bg-purple-50/70 p-2 rounded-md text-purple-900">
                          <span className="font-bold">•</span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Expected Simulation Output */}
              {reviewResult.expectedSimulationOutput && (
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950 font-medium">
                  <span className="font-bold block text-blue-800 mb-0.5">Comportamiento Dinámico Esperado al Simular:</span>
                  {reviewResult.expectedSimulationOutput}
                </div>
              )}

              {/* Corrected & Optimized Code Block */}
              {reviewResult.correctedCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Script Optimizado y Comentado por ControlBot:</span>
                    </span>
                    <button
                      onClick={() => handleCopyCode(reviewResult.correctedCode, true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      {copiedOptimized ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOptimized ? 'Copiado al portapapeles' : 'Copiar Código Optimizado'}</span>
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

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            Compatible con MATLAB R2020a-R2024b & GNU Octave
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Listo, volver al Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
