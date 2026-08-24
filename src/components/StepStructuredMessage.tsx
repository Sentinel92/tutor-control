import React, { useState } from 'react';
import { MathRenderer } from './MathRenderer';
import {
  Lightbulb,
  Calculator,
  Grid,
  Terminal,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StepStructuredMessageProps {
  content: string;
  contextTopic?: string;
  onSendFollowUp?: (text: string) => void;
}

export const StepStructuredMessage: React.FC<StepStructuredMessageProps> = ({
  content,
  contextTopic,
  onSendFollowUp,
}) => {
  const [collapsedSteps, setCollapsedSteps] = useState<{ [key: string]: boolean }>({});
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const toggleStep = (stepKey: string) => {
    setCollapsedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // Helper to split text by PASO headers
  const parseSteps = (raw: string) => {
    // Regex looking for headers like ### PASO 1, PASO 1:, **PASO 1**, etc.
    const step1Pattern = /(?:###\s*)?PASO\s*1[:\s\-–—]*([^\n]*)([\s\S]*?)(?=(?:###\s*)?PASO\s*2|$)/i;
    const step2Pattern = /(?:###\s*)?PASO\s*2[:\s\-–—]*([^\n]*)([\s\S]*?)(?=(?:###\s*)?PASO\s*3|$)/i;
    const step3Pattern = /(?:###\s*)?PASO\s*3[:\s\-–—]*([^\n]*)([\s\S]*?)(?=(?:###\s*)?PASO\s*4|$)/i;
    const step4Pattern = /(?:###\s*)?PASO\s*4[:\s\-–—]*([^\n]*)([\s\S]*?)(?=(?:###\s*)?PASO\s*5|$)/i;
    const step5Pattern = /(?:###\s*)?PASO\s*5[:\s\-–—]*([^\n]*)([\s\S]*)/i;

    const m1 = raw.match(step1Pattern);
    const m2 = raw.match(step2Pattern);
    const m3 = raw.match(step3Pattern);
    const m4 = raw.match(step4Pattern);
    const m5 = raw.match(step5Pattern);

    const hasStructuredSteps = Boolean(m1 && m2);

    return {
      hasStructuredSteps,
      intro: hasStructuredSteps && m1 && m1.index ? raw.substring(0, m1.index).trim() : '',
      step1: m1 ? (m1[1] + '\n' + m1[2]).trim() : '',
      step2: m2 ? (m2[1] + '\n' + m2[2]).trim() : '',
      step3: m3 ? (m3[1] + '\n' + m3[2]).trim() : '',
      step4: m4 ? (m4[1] + '\n' + m4[2]).trim() : '',
      step5: m5 ? (m5[1] + '\n' + m5[2]).trim() : '',
      fallback: raw,
    };
  };

  const parsed = parseSteps(content);

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || isVerifying) return;

    setIsVerifying(true);
    setVerificationFeedback(null);

    try {
      const res = await fetch('/api/verify-step5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: parsed.step5 || 'Pregunta del paso 5',
          userAnswer: userAnswer.trim(),
          contextTopic,
        }),
      });

      const data = await res.json();
      if (res.ok && data.evaluation) {
        setVerificationFeedback(data.evaluation);
        // Trigger celebratory confetti if correct
        if (
          data.evaluation.toLowerCase().includes('correcto') &&
          !data.evaluation.toLowerCase().includes('incorrecto')
        ) {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
      } else {
        setVerificationFeedback(
          data.error || 'No se pudo verificar la respuesta en este momento.'
        );
      }
    } catch {
      setVerificationFeedback('Error de conexión al verificar tu respuesta.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!parsed.hasStructuredSteps) {
    return (
      <div className="space-y-3">
        <MathRenderer content={content} />
      </div>
    );
  }

  const stepsList = [
    {
      id: 'step1',
      num: 1,
      title: 'Intuición Física y Concepto Clave',
      icon: Lightbulb,
      badgeColor: 'bg-blue-600 text-white',
      badgeText: 'Paso 1',
      content: parsed.step1,
    },
    {
      id: 'step2',
      num: 2,
      title: 'Desarrollo Matemático Detallado',
      icon: Calculator,
      badgeColor: 'bg-blue-600 text-white',
      badgeText: 'Paso 2',
      content: parsed.step2,
    },
    {
      id: 'step3',
      num: 3,
      title: 'Representación Matricial / Espacio de Estados o G(s)',
      icon: Grid,
      badgeColor: 'bg-blue-600 text-white',
      badgeText: 'Paso 3',
      content: parsed.step3,
    },
    {
      id: 'step4',
      num: 4,
      title: 'Código MATLAB y Guía de Simulink',
      icon: Terminal,
      badgeColor: 'bg-emerald-600 text-white',
      badgeText: 'Paso 4',
      content: parsed.step4,
    },
    {
      id: 'step5',
      num: 5,
      title: 'Pregunta de Verificación (Desafío de Comprensión)',
      icon: HelpCircle,
      badgeColor: 'bg-blue-600 text-white',
      badgeText: 'Paso 5 - Desafío',
      content: parsed.step5,
    },
  ];

  return (
    <div className="space-y-4 text-slate-800">
      {/* Optional Intro Paragraph */}
      {parsed.intro && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm">
          <MathRenderer content={parsed.intro} />
        </div>
      )}

      {/* 5 Steps Render */}
      <div className="space-y-4">
        {stepsList.map((step) => {
          if (!step.content) return null;
          const isCollapsed = collapsedSteps[step.id];
          const Icon = step.icon;

          return (
            <section
              key={step.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-sm ${
                step.num === 5
                  ? 'border-blue-200 bg-white ring-1 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Step Header */}
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors bg-white hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${step.badgeColor}`}
                  >
                    {step.badgeText}
                  </span>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    <h3 className="font-bold text-slate-800 text-sm md:text-base">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <span className="hidden sm:inline">
                    {isCollapsed ? 'Expandir' : 'Ocultar'}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Step Content */}
              {!isCollapsed && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                  <MathRenderer content={step.content} />

                  {/* Step 5 Interactive Verification Box */}
                  {step.num === 5 && (
                    <div className="mt-4 pt-4 border-t border-blue-100 bg-blue-50/50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Comprueba tu comprensión con ControlBot</span>
                      </div>

                      <form onSubmit={handleVerifyAnswer} className="space-y-2.5">
                        <div>
                          <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Escribe tu resultado o procedimiento algebraico aquí..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500">
                            ControlBot evaluará tu respuesta con rigor matemático.
                          </p>
                          <button
                            type="submit"
                            disabled={!userAnswer.trim() || isVerifying}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Evaluando...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Verificar Respuesta</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>

                      {/* Immediate Evaluation Feedback */}
                      {verificationFeedback && (
                        <div className="mt-3 p-4 rounded-xl bg-white border border-blue-200 text-sm shadow-sm">
                          <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-blue-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Evaluación del Profesor ControlBot:</span>
                          </div>
                          <MathRenderer content={verificationFeedback} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
