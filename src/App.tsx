import React, { useState, useEffect } from 'react';
import { Message } from './types';
import { UserProgressData } from './types/extra';
import { subscribeToUserProgress, syncProgressToFirebase } from './services/progressService';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ChatTutor } from './components/ChatTutor';
import { TopicsExplorer } from './components/TopicsExplorer';
import { SimulationLab } from './components/SimulationLab';
import { PoleZeroAnalyzer } from './components/PoleZeroAnalyzer';
import { StateSpaceCalc } from './components/StateSpaceCalc';
import { QuizTrainer } from './components/QuizTrainer';
import { CheatSheet } from './components/CheatSheet';
import { PersistentNotebook } from './components/PersistentNotebook';
import { ExamReminderWidget } from './components/ExamReminderWidget';
import {
  Bot,
  BookOpen,
  Sliders,
  Activity,
  Grid,
  Trophy,
  Bookmark,
  PlusCircle,
  Sparkles,
  Columns,
  Calendar,
  Cloud,
  Sun,
  Moon,
} from 'lucide-react';

type TabId = 'chat' | 'topics' | 'simulation' | 'polezero' | 'statespace' | 'quiz' | 'cheatsheet' | 'plan';

function MainAppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isDualMode, setIsDualMode] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTopicContext, setCurrentTopicContext] = useState<string | undefined>(undefined);
  const [userProgress, setUserProgress] = useState<UserProgressData>({
    examDate: '',
    examTopic: 'Modelamiento y Análisis de Sistemas Dinámicos',
    completedTopicIds: [],
    solvedChallengeIds: [],
    notebookNotes: '',
    quizScore: { totalAnswered: 0, totalCorrect: 0 },
  });

  // Subscribe to Firebase user progress on mount
  useEffect(() => {
    const unsubscribe = subscribeToUserProgress((data) => {
      setUserProgress(data);
    });
    return () => unsubscribe();
  }, []);

  // Send message to ControlBot API
  const handleSendMessage = async (text: string, contextTopic?: string) => {
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    if (contextTopic) {
      setCurrentTopicContext(contextTopic);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          contextTopic: contextTopic || currentTopicContext,
        }),
      });

      const data = await response.json();

      if (response.ok && data.content) {
        const assistantMsg: Message = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topicTag: contextTopic || currentTopicContext,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${data.error || 'Ocurrió un error al contactar al profesor ControlBot.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Error de conexión con el servidor. Verifica que el servidor de ControlBot esté en línea.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action from other tabs into Chat
  const handleAskControlBotFromOtherTab = (prompt: string, topicTitle?: string) => {
    setActiveTab('chat');
    handleSendMessage(prompt, topicTitle);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleNewExercise = () => {
    setActiveTab('chat');
    handleSendMessage(
      'Profesor ControlBot, plantéame un ejercicio de examen desafiante de modelamiento de sistemas dinámicos (circuito RLC, mecánico o espacio de estados) para resolverlo juntos paso a paso.'
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Bar (Sleek Dark Navy #0f172a with Blue Accent) */}
      <header className="sticky top-0 z-50 bg-[#0f172a] text-white border-b border-slate-700/80 px-4 lg:px-8 py-3 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-none whitespace-nowrap">
                CONTROLBOT
              </span>
              <span className="text-[9px] text-blue-300 uppercase tracking-widest font-semibold mt-0.5 whitespace-nowrap">
                Tutor Experto en Automática
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (1-2 Word Labels, Single-Line) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Tutor 5 Pasos
            </button>

            <button
              onClick={() => setActiveTab('topics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'topics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Módulos
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'simulation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Simulador
            </button>

            <button
              onClick={() => setActiveTab('polezero')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'polezero'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Polos y Ceros</span>
            </button>

            <button
              onClick={() => setActiveTab('statespace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'statespace'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Espacio Estados
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'quiz'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Desafíos
            </button>

            <button
              onClick={() => setActiveTab('cheatsheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'cheatsheet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Formulario
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'plan'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Plan Examen</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dark/Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-2xs"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-300" />
                  <span className="hidden sm:inline">Oscuro</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsDualMode(!isDualMode);
                if (activeTab !== 'chat') setActiveTab('chat');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDualMode && activeTab === 'chat'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Dividir pantalla: Chat con ControlBot + Bloc de Notas Persistente"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isDualMode && activeTab === 'chat' ? 'Modo Dual Activo' : 'Modo Dual'}
              </span>
            </button>

            <button
              onClick={handleNewExercise}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nuevo Ejercicio</span>
            </button>
          </div>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-700/80 overflow-x-auto">
          {[
            { id: 'chat', label: 'Tutor', icon: Bot },
            { id: 'topics', label: 'Módulos', icon: BookOpen },
            { id: 'simulation', label: 'Simulador', icon: Sliders },
            { id: 'polezero', label: 'Polos/Ceros', icon: Activity },
            { id: 'statespace', label: 'Matrices', icon: Grid },
            { id: 'quiz', label: 'Desafíos', icon: Trophy },
            { id: 'cheatsheet', label: 'Formulario', icon: Bookmark },
            { id: 'plan', label: 'Plan Examen', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                  isCurrent ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {activeTab === 'chat' && (
          isDualMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[600px] items-stretch">
              <div className="lg:col-span-7 h-full flex flex-col min-h-0">
                <ChatTutor
                  messages={messages}
                  isLoading={isLoading}
                  onSendMessage={(txt) => handleSendMessage(txt)}
                  onClearHistory={handleClearHistory}
                  currentTopicContext={currentTopicContext}
                  isDualMode={true}
                  onToggleDualMode={() => setIsDualMode(false)}
                />
              </div>
              <div className="lg:col-span-5 h-full flex flex-col min-h-0">
                <PersistentNotebook
                  onSendToChat={(txt) => handleSendMessage(txt)}
                  isDualMode={true}
                />
              </div>
            </div>
          ) : (
            <ChatTutor
              messages={messages}
              isLoading={isLoading}
              onSendMessage={(txt) => handleSendMessage(txt)}
              onClearHistory={handleClearHistory}
              currentTopicContext={currentTopicContext}
              isDualMode={false}
              onToggleDualMode={() => setIsDualMode(true)}
            />
          )
        )}

        {activeTab === 'topics' && (
          <TopicsExplorer
            onSelectPrompt={(p, topicTitle) => handleAskControlBotFromOtherTab(p, topicTitle)}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationLab
            onAskControlBot={(p) => handleAskControlBotFromOtherTab(p, 'Simulación Dinámica')}
          />
        )}

        {activeTab === 'polezero' && (
          <PoleZeroAnalyzer
            onAskControlBot={(p, title) => handleAskControlBotFromOtherTab(p, title || 'Análisis de Polos y Ceros')}
          />
        )}

        {activeTab === 'statespace' && (
          <StateSpaceCalc
            onAskControlBot={(p) => handleAskControlBotFromOtherTab(p, 'Espacio de Estados')}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizTrainer
            onAskControlBot={(p) => handleAskControlBotFromOtherTab(p, 'Desafíos de Examen')}
          />
        )}

        {activeTab === 'cheatsheet' && <CheatSheet />}

        {activeTab === 'plan' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <ExamReminderWidget
              progress={userProgress}
              onSelectTopic={(tId) => setActiveTab('topics')}
              onOpenTopicInChat={(prompt) => handleAskControlBotFromOtherTab(prompt, 'Plan de Repaso Examen')}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}

