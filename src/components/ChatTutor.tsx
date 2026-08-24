import React, { useState, useRef, useEffect } from 'react';
import { Message, Flashcard } from '../types';
import { StepStructuredMessage } from './StepStructuredMessage';
import { MathRenderer } from './MathRenderer';
import { FlashcardsModal } from './FlashcardsModal';
import {
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  Trash2,
  Volume2,
  VolumeX,
  Download,
  AlertCircle,
  CornerDownLeft,
  BookOpen,
  Layers,
  Maximize2,
  Minimize2,
  Type,
  Columns,
} from 'lucide-react';

interface ChatTutorProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  currentTopicContext?: string;
  isDualMode?: boolean;
  onToggleDualMode?: () => void;
}

const MATH_SHORTCUTS = [
  { label: 'G(s)', insert: 'G(s)' },
  { label: 'ωₙ', insert: '\\omega_n' },
  { label: 'ζ', insert: '\\zeta' },
  { label: 'ẍ(t)', insert: '\\ddot{x}(t)' },
  { label: 'ẋ(t)', insert: '\\dot{x}(t)' },
  { label: 'θ(t)', insert: '\\theta(t)' },
  { label: 'τ(t)', insert: '\\tau(t)' },
  { label: '∫', insert: '\\int' },
  { label: 'd/dt', insert: '\\frac{d}{dt}' },
  { label: 'LVK', insert: 'Ley de Voltajes de Kirchhoff (LVK)' },
  { label: 'Espacio Estados', insert: '\\dot{\\mathbf{x}} = \\mathbf{A}\\mathbf{x} + \\mathbf{B}u' },
  { label: 'ode45', insert: 'ode45' },
];

const PRESET_PROMPTS = [
  {
    title: 'Masa-Resorte-Amortiguador',
    prompt: 'Modela un sistema mecánico masa-resorte-amortiguador con m=2 kg, b=3 Ns/m y k=20 N/m. Obtén G(s)=X(s)/F(s), polos, MATLAB y Simulink con los 5 pasos.',
  },
  {
    title: 'Circuito RLC Serie (LVK)',
    prompt: 'Aplica LVK para modelar un circuito RLC serie con entrada Vin(t) y salida Vc(t) en el capacitor. Desarrolla la función de transferencia y espacio de estados en 5 pasos.',
  },
  {
    title: 'Motor DC Electromecánico',
    prompt: 'Desarrolla el modelo matemático completo de un motor DC controlado por armadura acoplando ecuaciones eléctricas y mecánicas en 5 pasos.',
  },
  {
    title: 'G(s) a Espacio de Estados',
    prompt: 'Convierte la función de transferencia G(s) = (3s + 5)/(s^2 + 4s + 13) a la Forma Canónica Controlable y determina las matrices A, B, C, D en 5 pasos.',
  },
  {
    title: 'Demostrar Linealidad',
    prompt: 'Explica y demuestra matemáticamente con los 5 pasos si el sistema y(t) = 3*x(t) + 4 es lineal o no lineal aplicando aditividad y homogeneidad.',
  },
];

export const ChatTutor: React.FC<ChatTutorProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
  currentTopicContext,
  isDualMode = false,
  onToggleDualMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isReadingMode, setIsReadingMode] = useState<boolean>(false);
  const [readingFontSize, setReadingFontSize] = useState<'normal' | 'large'>('normal');
  
  // Flashcards state
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState<boolean>(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInsertShortcut = (sym: string) => {
    setInputText((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + sym + ' ');
    inputRef.current?.focus();
  };

  // Text-to-speech for tutor replies
  const handleToggleSpeech = (msgId: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking === msgId) {
        window.speechSynthesis.cancel();
        setIsSpeaking(null);
      } else {
        window.speechSynthesis.cancel();
        // Clean markdown tags for natural speech
        const cleanText = text
          .replace(/```[\s\S]*?```/g, 'Código de programación omitido.')
          .replace(/[\$#\*_`]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(null);
        utterance.onerror = () => setIsSpeaking(null);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(msgId);
      }
    }
  };

  // Export chat notes
  const handleExportNotes = () => {
    const chatExport = messages
      .map(
        (m) =>
          `### [${m.role === 'user' ? 'ESTUDIANTE' : 'PROFESOR CONTROLBOT'}] - ${m.timestamp}\n\n${
            m.content
          }\n\n---\n`
      )
      .join('\n');

    const blob = new Blob([chatExport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ControlBot_Apuntes_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Flashcards generation function
  const handleGenerateFlashcards = async () => {
    setIsFlashcardsOpen(true);
    setIsLoadingFlashcards(true);

    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          contextTopic: currentTopicContext,
        }),
      });

      const data = await res.json();
      if (res.ok && data.flashcards && Array.isArray(data.flashcards)) {
        setFlashcards(data.flashcards);
      } else {
        // Fallback default
        setFlashcards([
          {
            id: 'fc-1',
            topic: 'Transformada de Laplace',
            category: 'Laplace',
            question: '¿Cuál es la propiedad de la transformada de Laplace para la primera y segunda derivada con condiciones iniciales nulas?',
            mathFormula: '\\mathcal{L}\\{\\dot{x}(t)\\} = s X(s), \\quad \\mathcal{L}\\{\\ddot{x}(t)\\} = s^2 X(s)',
            answer: 'Multiplicar por la variable compleja s por cada orden de derivada.',
            explanation: 'Facilita convertir ecuaciones diferenciales lineales en ecuaciones algebraicas directamente despejables.'
          }
        ]);
      }
    } catch (err) {
      console.error('Error generating flashcards:', err);
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 ${
        isReadingMode
          ? 'fixed inset-3 z-50 h-[calc(100vh-24px)]'
          : 'h-[calc(100vh-140px)] min-h-[580px]'
      }`}
    >
      {/* Chat Top Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0f172a] text-white border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              C
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0f172a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">Profesor ControlBot</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-200 font-semibold">
                Tutor Experto (5 Pasos)
              </span>
              {isReadingMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-400/50 text-emerald-300 font-bold flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>Modo Lectura Activo</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300">
              {currentTopicContext
                ? `Enfocado en: ${currentTopicContext}`
                : 'Modelamiento de Sistemas Dinámicos y Control Automático'}
            </p>
          </div>
        </div>

        {/* Action Controls in Top Bar */}
        <div className="flex items-center gap-2">
          {/* Dual Mode Switch */}
          {onToggleDualMode && (
            <button
              onClick={onToggleDualMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDualMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={
                isDualMode
                  ? 'Desactivar Modo Dual y volver a pantalla completa'
                  : 'Activar Modo Dual para dividir pantalla: Chat + Bloc de Notas'
              }
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isDualMode ? 'Cerrar Dual' : 'Modo Dual'}
              </span>
            </button>
          )}

          {/* Flashcards Generator Button */}
          <button
            onClick={handleGenerateFlashcards}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all hover:scale-105"
            title="Analizar conversación y generar 5 tarjetas de memoria (Flashcards)"
          >
            <Layers className="w-3.5 h-3.5 text-blue-100" />
            <span className="hidden sm:inline">5 Flashcards</span>
          </button>

          {/* Reading Mode Switch */}
          <button
            onClick={() => setIsReadingMode(!isReadingMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isReadingMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={
              isReadingMode
                ? 'Desactivar Modo Lectura y volver a vista estándar'
                : 'Activar Modo Lectura para maximizar fórmulas y explicaciones'
            }
          >
            {isReadingMode ? <Minimize2 className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isReadingMode ? 'Salir Lectura' : 'Modo Lectura'}
            </span>
          </button>

          {messages.length > 0 && (
            <>
              <button
                onClick={handleExportNotes}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
                title="Exportar apuntes en Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar</span>
              </button>
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 text-xs transition-colors border border-slate-700"
                title="Reiniciar conversación"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reading Mode Banner Bar (when active) */}
      {isReadingMode && (
        <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">
              Vista de Lectura Matemática Enfocada:
            </span>
            <span className="text-emerald-700 dark:text-emerald-300 hidden sm:inline">
              Interfaz maximizada con fórmulas de alto contraste y distracciones ocultas.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <Type className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <button
                onClick={() => setReadingFontSize('normal')}
                className={`px-1.5 py-0.5 rounded ${
                  readingFontSize === 'normal' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setReadingFontSize('large')}
                className={`px-1.5 py-0.5 rounded ${
                  readingFontSize === 'large' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Grande (A+)
              </button>
            </div>

            <button
              onClick={() => setIsReadingMode(false)}
              className="px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#f8fafc] dark:bg-slate-950 ${
          readingFontSize === 'large' ? 'text-base' : 'text-sm'
        }`}
      >
        {messages.length === 0 ? (
          /* Welcome state with pedagogical introduction and prompt cards */
          <div className="max-w-3xl mx-auto py-6 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                ¡Bienvenido a tu Tutoría de Control Automático con ControlBot!
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                Soy tu profesor universitario de élite. Mi único objetivo es convertirte en el
                estudiante destacado de tu curso. Cada consulta o ejercicio se estructurará con
                nuestra <strong className="text-blue-700 dark:text-blue-400">metodología obligatoria de 5 pasos</strong>:
              </p>

              {/* 5 Steps badge strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 text-xs text-left">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-blue-700 dark:text-blue-400">PASO 1</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Intuición Física</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-blue-700 dark:text-blue-400">PASO 2</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Álgebra Detallada</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-blue-700 dark:text-blue-400">PASO 3</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Matrices / G(s)</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">PASO 4</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">MATLAB & Simulink</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 col-span-2 sm:col-span-1">
                  <div className="font-bold text-blue-700 dark:text-blue-400">PASO 5</div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-300 font-medium mt-0.5">Verificación</div>
                </div>
              </div>
            </div>

            {/* Quick Starter Prompts (Hidden in Reading Mode to maximize focus) */}
            {!isReadingMode && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Selecciona una consulta inicial o escribe tu propio ejercicio:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(item.prompt)}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 text-left transition-all group shadow-sm"
                    >
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{item.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 mt-1 shadow-sm">
                    C
                  </div>
                )}

                <div
                  className={`rounded-2xl shadow-sm transition-all ${
                    isReadingMode ? 'max-w-5xl w-full p-6' : 'max-w-3xl p-5'
                  } ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-800 dark:text-slate-100 flex-1'
                  }`}
                >
                  {/* Message header */}
                  <div
                    className={`flex items-center justify-between gap-2 mb-3 pb-2 text-xs border-b ${
                      isUser ? 'border-blue-500/50 text-blue-100' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span className="font-bold">
                      {isUser ? 'Tú (Estudiante)' : 'Profesor ControlBot'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-80">{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.content)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title={isSpeaking === msg.id ? 'Detener voz' : 'Escuchar explicación'}
                        >
                          {isSpeaking === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <StepStructuredMessage
                      content={msg.content}
                      contextTopic={currentTopicContext}
                      onSendFollowUp={(text) => onSendMessage(text)}
                    />
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 mt-1 font-bold text-xs">
                    AR
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* In-Chat Flashcards Suggestion Callout Banner */}
        {messages.some((m) => m.role === 'assistant') && !isLoading && (
          <div className="my-2 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 dark:from-slate-850 dark:via-slate-800 dark:to-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>¿Listo para consolidar lo aprendido?</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 font-extrabold">
                    5 Flashcards
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Genera 5 tarjetas de memoria basadas en las ecuaciones y conceptos analizados en este chat.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateFlashcards}
              className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Generar Flashcards</span>
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 mt-1 animate-pulse">
              C
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  ControlBot está calculando el procedimiento paso a paso...
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verificando álgebra, matrices, Laplace y código MATLAB
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Math & Greek Symbols Toolbar (Hidden in Reading Mode to maintain clean focus) */}
      {!isReadingMode && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider shrink-0 mr-1">
            Símbolos:
          </span>
          {MATH_SHORTCUTS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertShortcut(s.insert)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 font-mono text-xs whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 font-medium"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className={`p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 ${isReadingMode ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isReadingMode
                ? "Haz una consulta rápida de seguimiento o escribe tu ejercicio..."
                : "Pregunta a ControlBot sobre Laplace, RLC, Masa-Resorte, Espacio de Estados, MATLAB o pega tu ejercicio..."
            }
            rows={isReadingMode ? 1 : 2}
            className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors shadow-2xs"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </>
            )}
          </button>
        </form>
        {!isReadingMode && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
            <span>Presiona <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para salto de línea.</span>
            <span className="hidden sm:inline">ControlBot aplica automáticamente los 5 pasos universitarios.</span>
          </div>
        )}
      </div>

      {/* 5-Flashcard Interactive Review Modal */}
      <FlashcardsModal
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        flashcards={flashcards}
        isLoading={isLoadingFlashcards}
        onRegenerate={handleGenerateFlashcards}
        contextTopic={currentTopicContext}
      />
    </div>
  );
};
