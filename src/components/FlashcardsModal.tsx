import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { MathRenderer } from './MathRenderer';
import {
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Download,
  Volume2,
  VolumeX,
  Layers,
  Award,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Brain,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  isLoading: boolean;
  onRegenerate: () => void;
  contextTopic?: string;
}

const LEARNED_STORAGE_KEY = 'controlbot_learned_flashcards';

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  flashcards,
  isLoading,
  onRegenerate,
  contextTopic,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learnedIds, setLearnedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LEARNED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Save learned IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        LEARNED_STORAGE_KEY,
        JSON.stringify(Array.from(learnedIds))
      );
    } catch (e) {
      console.warn('Failed to save learned flashcards to localStorage', e);
    }
  }, [learnedIds]);

  // Reset state when flashcards change or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isOpen, flashcards]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'm') {
        if (flashcards[currentIndex]) {
          toggleLearned(flashcards[currentIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, flashcards]);

  if (!isOpen) return null;

  const currentCard = flashcards[currentIndex];
  const isLearned = currentCard ? learnedIds.has(currentCard.id) : false;
  const learnedCount = flashcards.filter((fc) => learnedIds.has(fc.id)).length;
  const totalCount = flashcards.length;
  const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

  const handleNext = () => {
    setIsFlipped(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(flashcards.length - 1);
    }
  };

  const toggleLearned = (id: string) => {
    setLearnedIds((prev) => {
      const next = new Set(prev);
      const isNowLearned = !next.has(id);
      if (isNowLearned) {
        next.add(id);
        // Confetti celebration if all cards in current set are learned
        const willBeAllLearned = flashcards.every(
          (fc) => fc.id === id || next.has(fc.id)
        );
        if (willBeAllLearned && flashcards.length > 0) {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Text-to-speech for card
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window) || !currentCard) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = isFlipped
        ? `Respuesta: ${currentCard.answer}. Explicación: ${currentCard.explanation}`
        : `Concepto: ${currentCard.topic}. Pregunta: ${currentCard.question}`;

      const cleanText = textToRead.replace(/[\$#\*_`\\]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Export flashcards as markdown
  const handleExportFlashcards = () => {
    const content = `# Flashcards de Repaso Técnico: ${contextTopic || 'Control Automático y Sistemas Dinámicos'}
Generado a partir del análisis del chat por ControlBot - ${new Date().toLocaleDateString()}

${flashcards
  .map(
    (card, idx) => `## Flashcard ${idx + 1}: ${card.topic} [${card.category}] - ${
      learnedIds.has(card.id) ? 'ESTADO: APRENDIDA ✓' : 'ESTADO: PENDIENTE'
    }
**Pregunta:** ${card.question}

${card.mathFormula ? `**Fórmula Clave:**\n${card.mathFormula}\n` : ''}
**Respuesta:** ${card.answer}

**Explicación Pedagógica:**
${card.explanation}

---
`
  )
  .join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ControlBot_Flashcards_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0f172a] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  5 Tarjetas de Memoria (Flashcards)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 border border-blue-400/40 text-blue-200 font-bold hidden sm:inline-block">
                  IA Analítica
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sintetizadas de los conceptos y fórmulas clave de tu conversación actual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Tarjeta {currentIndex + 1} de {totalCount}
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <div className="flex items-center gap-1 text-xs">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {learnedCount} de {totalCount} aprendidas
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                ({progressPercent}%)
              </span>
            </div>
          </div>

          {/* 5-step interactive indicator pills */}
          <div className="flex items-center gap-1.5">
            {flashcards.map((fc, i) => {
              const cardIsLearned = learnedIds.has(fc.id);
              const isSelected = i === currentIndex;
              return (
                <button
                  key={fc.id || i}
                  onClick={() => {
                    setCurrentIndex(i);
                    setIsFlipped(false);
                  }}
                  className={`h-2.5 rounded-full transition-all flex items-center justify-center ${
                    isSelected
                      ? 'w-9 bg-blue-600 ring-2 ring-blue-400/40'
                      : cardIsLearned
                      ? 'w-5 bg-emerald-500 hover:bg-emerald-600'
                      : 'w-5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  title={`Tarjeta ${i + 1}: ${fc.topic} (${cardIsLearned ? 'Aprendida' : 'Pendiente'})`}
                />
              );
            })}
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center items-center bg-[#f8fafc] dark:bg-slate-950">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-9 h-9 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Analizando el historial de conversación...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  ControlBot está extrayendo los 5 conceptos técnicos más importantes, ecuaciones diferenciales, teoremas de Laplace y comandos tratados.
                </p>
              </div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No hay flashcards generadas aún.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Inicia una conversación con ControlBot o genera el set con el botón a continuación.
              </p>
              <button
                onClick={onRegenerate}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm"
              >
                Generar 5 Flashcards de la Sesión
              </button>
            </div>
          ) : currentCard ? (
            <div className="w-full max-w-xl flex flex-col items-center space-y-4">
              {/* Interactive 3D/Clean Flip Card Surface */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full min-h-[310px] p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border-2 cursor-pointer transition-all duration-300 shadow-md flex flex-col justify-between select-none relative group ${
                  isLearned
                    ? 'border-emerald-400 dark:border-emerald-600/80 shadow-emerald-50 dark:shadow-none'
                    : isFlipped
                    ? 'border-blue-500 dark:border-blue-400 shadow-blue-50 dark:shadow-none ring-2 ring-blue-100 dark:ring-blue-900/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {/* Card Top Pill, Category & Learned Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/80 rounded-md border border-blue-100 dark:border-blue-800">
                      {currentCard.category || 'Control Automático'}
                    </span>
                    {isLearned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Aprendida</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                      {isFlipped ? 'Reverso (Respuesta)' : 'Anverso (Pregunta)'}
                    </span>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="py-4 text-center my-auto space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {currentCard.topic}
                  </h4>

                  {!isFlipped ? (
                    /* Front: Question & Formula */
                    <div className="space-y-3">
                      <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        <MathRenderer content={currentCard.question} />
                      </div>
                      {currentCard.mathFormula && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-900 dark:text-blue-300 font-bold text-sm inline-block max-w-full overflow-x-auto">
                          <MathRenderer content={`$$${currentCard.mathFormula}$$`} />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Back: Answer & Explanation */
                    <div className="space-y-3 text-left">
                      <div className="p-3 bg-blue-50/80 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 font-bold text-sm">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">
                          Respuesta Clave:
                        </div>
                        <MathRenderer content={currentCard.answer} />
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium space-y-1">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">
                          Explicación Pedagógica:
                        </div>
                        <MathRenderer content={currentCard.explanation} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Hint */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="hidden sm:inline">Haz clic o presiona <strong>Espacio</strong> para voltear</span>
                  <span className="sm:hidden">Toca para voltear</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                    {isFlipped ? '← Ver pregunta' : 'Ver respuesta y desarrollo →'}
                  </span>
                </div>
              </div>

              {/* Action Toolbar Below Card */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Speech & Explicit 'Marcar como aprendida' Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSpeech}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                    title={isSpeaking ? 'Detener audio' : 'Escuchar en voz alta'}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleLearned(currentCard.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-2xs ${
                      isLearned
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 ring-1 ring-emerald-300 dark:ring-emerald-800'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={
                      isLearned
                        ? 'Desmarcar esta tarjeta como aprendida'
                        : 'Marcar este concepto como aprendido (Tecla A)'
                    }
                  >
                    <CheckCircle2
                      className={`w-4 h-4 transition-transform ${
                        isLearned ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>
                      {isLearned ? 'Aprendida ✓' : 'Marcar como aprendida'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
              <span>Regenerar con IA</span>
            </button>

            <button
              onClick={handleExportFlashcards}
              disabled={flashcards.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Exportar (.md)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-colors"
          >
            Listo, volver al Chat
          </button>
        </div>
      </div>
    </div>
  );
};
