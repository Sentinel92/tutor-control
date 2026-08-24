import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { MathRenderer } from './MathRenderer';
import {
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Download,
  Volume2,
  VolumeX,
  Layers,
  Award,
  RefreshCw,
  BookOpen,
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
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset state when flashcards change or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isOpen, flashcards]);

  // Keyboard navigation
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, flashcards.length]);

  if (!isOpen) return null;

  const currentCard = flashcards[currentIndex];
  const isMastered = currentCard ? masteredIds.has(currentCard.id) : false;

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

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (next.size === flashcards.length) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
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
    const content = `# Flashcards de Repaso: ${contextTopic || 'Control Automático y Sistemas Dinámicos'}
Generado automáticamente por ControlBot - ${new Date().toLocaleDateString()}

${flashcards
  .map(
    (card, idx) => `## Flashcard ${idx + 1}: ${card.topic} [${card.category}]
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  5 Flashcards de Repaso Técnico
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 border border-blue-400/40 text-blue-200 font-bold">
                  IA Generativa
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sintetizadas a partir de los conceptos y fórmulas analizados en tu sesión de chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">
              Tarjeta {currentIndex + 1} de {flashcards.length}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {masteredIds.size} de {flashcards.length} dominadas
            </span>
          </div>

          {/* 5-step pill indicator */}
          <div className="flex items-center gap-1.5">
            {flashcards.map((fc, i) => (
              <button
                key={fc.id || i}
                onClick={() => {
                  setCurrentIndex(i);
                  setIsFlipped(false);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-8 bg-blue-600'
                    : masteredIds.has(fc.id)
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Ir a tarjeta ${i + 1}: ${fc.topic}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center bg-[#f8fafc]">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  Analizando el contenido de la sesión de chat...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ControlBot está extrayendo los 5 conceptos clave, teoremas de Laplace y ecuaciones para generar tus flashcards.
                </p>
              </div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                No hay flashcards disponibles todavía.
              </p>
              <button
                onClick={onRegenerate}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm"
              >
                Generar 5 Flashcards de la Sesión
              </button>
            </div>
          ) : currentCard ? (
            <div className="w-full max-w-xl flex flex-col items-center space-y-4">
              {/* Interactive Flip Card Surface */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full min-h-[300px] p-7 rounded-2xl bg-white border-2 cursor-pointer transition-all duration-300 shadow-md flex flex-col justify-between select-none relative group ${
                  isFlipped
                    ? 'border-blue-500 shadow-blue-100 ring-4 ring-blue-50'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {/* Card Top Pill & Category */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-100">
                    {currentCard.category || 'Control Automático'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                      {isFlipped ? 'Reverso (Respuesta)' : 'Anverso (Pregunta)'}
                    </span>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="py-4 text-center my-auto space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {currentCard.topic}
                  </h4>

                  {!isFlipped ? (
                    /* Front: Question & Formula */
                    <div className="space-y-3">
                      <div className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                        <MathRenderer content={currentCard.question} />
                      </div>
                      {currentCard.mathFormula && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-blue-900 font-bold text-sm inline-block max-w-full overflow-x-auto">
                          <MathRenderer content={`$$${currentCard.mathFormula}$$`} />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Back: Answer & Explanation */
                    <div className="space-y-3 text-left">
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 font-bold text-sm">
                        <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1">
                          Respuesta Clave:
                        </div>
                        <MathRenderer content={currentCard.answer} />
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium space-y-1">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                          Explicación Paso a Paso:
                        </div>
                        <MathRenderer content={currentCard.explanation} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Hint */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Haz clic o presiona <strong>Espacio</strong> para voltear</span>
                  <span className="font-semibold text-blue-600 group-hover:underline">
                    {isFlipped ? 'Ver pregunta' : 'Ver respuesta y desarrollo'} →
                  </span>
                </div>
              </div>

              {/* Action Toolbar Below Card */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs transition-colors"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Flip, Speech & Mastery Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSpeech}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs transition-colors"
                    title={isSpeaking ? 'Detener voz' : 'Escuchar flashcard'}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4 text-blue-600 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleMastered(currentCard.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors shadow-2xs ${
                      isMastered
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${isMastered ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                    <span>{isMastered ? 'Dominada' : 'Marcar Dominada'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Regenerar con IA</span>
            </button>

            <button
              onClick={handleExportFlashcards}
              disabled={flashcards.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar (.md)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Listo, volver al Chat
          </button>
        </div>
      </div>
    </div>
  );
};
