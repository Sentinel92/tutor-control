import React, { useState } from 'react';
import { TOPICS } from '../data/topics';
import { Topic } from '../types';
import { MathRenderer } from './MathRenderer';
import { MatlabReviewModal } from './MatlabReviewModal';
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Terminal,
  Layers,
  HelpCircle,
  Zap,
  Activity,
  GitCommit,
  Disc,
  Grid,
  Code,
} from 'lucide-react';

interface TopicsExplorerProps {
  onSelectPrompt: (prompt: string, topicTitle: string) => void;
}

export const TopicsExplorer: React.FC<TopicsExplorerProps> = ({ onSelectPrompt }) => {
  const [selectedTopic, setSelectedTopic] = useState<Topic>(TOPICS[0]);
  const [isMatlabAuditOpen, setIsMatlabAuditOpen] = useState<boolean>(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className="w-5 h-5" />;
      case 'GitCommit':
        return <GitCommit className="w-5 h-5" />;
      case 'Zap':
        return <Zap className="w-5 h-5" />;
      case 'Layers':
        return <Layers className="w-5 h-5" />;
      case 'Disc':
        return <Disc className="w-5 h-5" />;
      case 'Grid':
        return <Grid className="w-5 h-5" />;
      case 'Terminal':
        return <Terminal className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Programa Académico y Módulos de Aprendizaje
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona una de las 7 unidades de control automático y modelamiento dinámico para
              explorar teoría, fórmulas, código MATLAB y ejercicios guiados con ControlBot.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Topic selector list (left 4 cols) & Detail Viewer (right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Topic List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
            Módulos del Curso
          </div>
          {TOPICS.map((topic) => {
            const isSelected = selectedTopic.id === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {getIcon(topic.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Unidad {topic.unitNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600">
                      {topic.badge}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-800 truncate mt-0.5">
                    {topic.title}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {topic.shortDescription}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Topic Detail View */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Card */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Unidad {selectedTopic.unitNumber} • {selectedTopic.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedTopic.title}
                </h3>
              </div>

              <button
                onClick={() =>
                  onSelectPrompt(
                    `Explica detalladamente la ${selectedTopic.title} aplicando la metodología de 5 pasos para dominar el tema.`,
                    selectedTopic.title
                  )
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Pedir Clase Completa de 5 Pasos</span>
              </button>
            </div>

            {/* Theory Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  Paso 1
                </span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Concepto Teórico Fundamental
                </h4>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                {selectedTopic.theorySummary}
              </div>
            </div>

            {/* Key Formulas with KaTeX */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  Paso 2 & 3
                </span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ecuaciones y Modelos Matemáticos Clave
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedTopic.keyFormulas.map((form, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-center overflow-x-auto text-blue-900 font-semibold"
                  >
                    <MathRenderer content={`$$${form}$$`} />
                  </div>
                ))}
              </div>
            </div>

            {/* MATLAB Code & Simulink Blocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                    Paso 4
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-600" />
                    <span>Script MATLAB y Bloques de Simulink</span>
                  </h4>
                </div>

                <button
                  onClick={() => setIsMatlabAuditOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Auditar en Linter</span>
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-[#0f172a]">
                <MathRenderer content={`\`\`\`matlab\n${selectedTopic.matlabSnippet}\n\`\`\``} />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 mb-2">
                  Bloques a utilizar en Simulink:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopic.simulinkBlocks.map((blk, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-mono font-medium shadow-2xs"
                    >
                      {blk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Challenge Question */}
            <div className="p-5 rounded-xl bg-blue-600 text-white shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-white text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  Desafío
                </span>
                <h4 className="font-bold text-white text-sm">Pregunta de Verificación (Paso 5)</h4>
              </div>
              <p className="text-sm text-blue-50 leading-relaxed">
                {selectedTopic.challengeQuestion}
              </p>
              <button
                onClick={() =>
                  onSelectPrompt(
                    `Ayúdame a resolver y verificar paso a paso este desafío de la ${selectedTopic.title}: "${selectedTopic.challengeQuestion}"`,
                    selectedTopic.title
                  )
                }
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold shadow-sm transition-colors"
              >
                <span>Resolver y Verificar con ControlBot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggested Prompts for this Topic */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Preguntas Sugeridas para Consultar a ControlBot
              </h4>
              <div className="space-y-2">
                {selectedTopic.suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectPrompt(p, selectedTopic.title)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-left text-xs sm:text-sm text-slate-700 hover:text-blue-800 transition-all group"
                  >
                    <span>{p}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MATLAB Review Modal */}
      <MatlabReviewModal
        isOpen={isMatlabAuditOpen}
        onClose={() => setIsMatlabAuditOpen(false)}
        initialCode={selectedTopic.matlabSnippet}
        targetSystem={`${selectedTopic.title}: ${selectedTopic.focusEquation}`}
      />
    </div>
  );
};
