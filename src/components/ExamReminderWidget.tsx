import React, { useState, useEffect } from 'react';
import { UserProgressData } from '../types/extra';
import { syncProgressToFirebase } from '../services/progressService';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Settings2,
  ChevronRight,
  Flame,
  Cloud,
} from 'lucide-react';

interface ExamReminderWidgetProps {
  progress: UserProgressData;
  onSelectTopic: (topicId: string) => void;
  onOpenTopicInChat: (prompt: string) => void;
}

interface TopicPlan {
  id: string;
  title: string;
  category: string;
  daysThreshold: number; // recommended days prior to exam
  weight: string;
  prompt: string;
}

const TOPICS_CATALOG: TopicPlan[] = [
  {
    id: 'laplace-properties',
    title: 'Transformada de Laplace y Teoremas Fundamentales',
    category: 'Fundamentos Matemáticos',
    daysThreshold: 14,
    weight: '20% del examen',
    prompt: 'Profesor ControlBot, repasemos la Transformada de Laplace de derivadas e integrales para resolver ecuaciones diferenciales de control paso a paso.',
  },
  {
    id: 'rlc-circuits',
    title: 'Circuitos RLC Serie/Paralelo por Leyes de Kirchhoff',
    category: 'Sistemas Eléctricos',
    daysThreshold: 10,
    weight: '25% del examen',
    prompt: 'Profesor ControlBot, quiero modelar paso a paso un circuito RLC serie obteniendo la función de transferencia Vc(s)/Vin(s) con valores numéricos y parámetros wn y zeta.',
  },
  {
    id: 'mass-spring',
    title: 'Sistemas Mecánicos Traslacionales Masa-Resorte-Amortiguador',
    category: 'Sistemas Mecánicos',
    daysThreshold: 7,
    weight: '25% del examen',
    prompt: 'Explícame el modelamiento de un sistema masa-resorte-amortiguador con diagrama de cuerpo libre, función de transferencia X(s)/F(s) y análisis de amortiguamiento subamortiguado.',
  },
  {
    id: 'state-space',
    title: 'Espacio de Estados (A, B, C, D) y Polinomio Característico',
    category: 'Espacio de Estados',
    daysThreshold: 4,
    weight: '20% del examen',
    prompt: 'Enséñame a formular las matrices de estado (A, B, C, D) para un sistema de 2do orden y cómo obtener G(s) = C*inv(sI - A)*B + D.',
  },
  {
    id: 'matlab-validation',
    title: 'Validación en MATLAB: tf, step, bode y tf2ss',
    category: 'Simulación Computacional',
    daysThreshold: 2,
    weight: '10% del examen',
    prompt: 'Dame los comandos esenciales de MATLAB (tf, step, tf2ss, damp) para verificar funciones de transferencia y matrices de estado en mi examen.',
  },
];

export const ExamReminderWidget: React.FC<ExamReminderWidgetProps> = ({
  progress,
  onSelectTopic,
  onOpenTopicInChat,
}) => {
  const [examDate, setExamDate] = useState<string>(progress.examDate || '');
  const [examTopic, setExamTopic] = useState<string>(progress.examTopic || 'Examen de Modelamiento y Control');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (progress.examDate) setExamDate(progress.examDate);
    if (progress.examTopic) setExamTopic(progress.examTopic);
  }, [progress.examDate, progress.examTopic]);

  // Calculate days remaining
  const calculateDaysRemaining = (): number | null => {
    if (!examDate) return null;
    const target = new Date(examDate);
    target.setHours(23, 59, 59);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining();

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await syncProgressToFirebase({
      examDate,
      examTopic,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  // Determine pending topics recommendations based on days remaining
  const getRecommendedTopics = () => {
    const completedSet = new Set(progress.completedTopicIds || []);
    
    // Sort topics prioritizing those not completed
    return TOPICS_CATALOG.map((t) => ({
      ...t,
      isDone: completedSet.has(t.id),
      isUrgent: daysRemaining !== null && daysRemaining <= t.daysThreshold && !completedSet.has(t.id),
    })).sort((a, b) => {
      if (a.isDone === b.isDone) return 0;
      return a.isDone ? 1 : -1;
    });
  };

  const topicsList = getRecommendedTopics();
  const completedCount = topicsList.filter((t) => t.isDone).length;
  const progressPercent = Math.round((completedCount / TOPICS_CATALOG.length) * 100);

  const toggleTopicCompletion = async (topicId: string) => {
    const currentCompleted = progress.completedTopicIds || [];
    const nextCompleted = currentCompleted.includes(topicId)
      ? currentCompleted.filter((id) => id !== topicId)
      : [...currentCompleted, topicId];

    await syncProgressToFirebase({
      completedTopicIds: nextCompleted,
    });
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Header with Countdown & Cloud Sync */}
      <div className="px-5 py-3.5 bg-[#0f172a] text-white border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Recordatorios & Plan de Repaso
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 font-bold flex items-center gap-1">
                <Cloud className="w-2.5 h-2.5" />
                <span>Firebase Sync</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {examTopic}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cerrar' : 'Configurar'}</span>
        </button>
      </div>

      {/* Countdown Card Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900 shadow-2xs text-center min-w-[70px]">
              {daysRemaining !== null ? (
                <>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none">
                    {daysRemaining < 0 ? '0' : daysRemaining}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    {daysRemaining === 1 ? 'Día' : 'Días'}
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">Sin Fecha</div>
                </>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                {daysRemaining !== null ? (
                  daysRemaining <= 3 ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                      ¡Examen Inminente! Repaso Intensivo
                    </span>
                  ) : daysRemaining <= 7 ? (
                    <span className="text-amber-700 dark:text-amber-400">Semana Clave de Preparación</span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400">Plan de Estudio en Curso</span>
                  )
                ) : (
                  <span>Configura la fecha de tu examen para activar el plan guiado</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {examDate
                  ? `Fecha programada: ${new Date(examDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}`
                  : 'Ingresa la fecha de tu prueba o certamen en la configuración.'}
              </p>
            </div>
          </div>

          {/* Progress Pill Bar */}
          <div className="sm:text-right space-y-1">
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>{completedCount} de {TOPICS_CATALOG.length} temas listos</span>
              <span className="text-blue-700 dark:text-blue-400 font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full sm:w-36 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Editing Form Panel */}
      {isEditing && (
        <form onSubmit={handleSaveConfig} className="p-4 bg-slate-100/80 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Ajustar Información del Examen
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Materia o Nombre del Examen:
              </label>
              <input
                type="text"
                value={examTopic}
                onChange={(e) => setExamTopic(e.target.value)}
                placeholder="Ej. Certamen 1: Sistemas de Control Dinámico"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Fecha del Examen:
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Guardando en Firebase...' : 'Guardar y Sincronizar'}
            </button>
          </div>
        </form>
      )}

      {/* Suggested Topics List */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Temas Sugeridos para tu Examen:
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Haz clic para repasar con ControlBot</span>
        </div>

        <div className="space-y-2">
          {topicsList.map((topic) => (
            <div
              key={topic.id}
              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                topic.isDone
                  ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                  : topic.isUrgent
                  ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleTopicCompletion(topic.id)}
                  className="mt-0.5 sm:mt-0 p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-colors"
                  title={topic.isDone ? 'Marcar como pendiente' : 'Marcar como dominado'}
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      topic.isDone ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold ${
                        topic.isDone ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {topic.title}
                    </span>
                    {topic.isUrgent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/80 border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 font-bold">
                        ¡Prioridad Alta!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>{topic.category}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{topic.weight}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onOpenTopicInChat(topic.prompt)}
                className="self-end sm:self-center flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white dark:hover:text-white text-xs font-bold border border-blue-200 dark:border-slate-600 hover:border-blue-600 transition-colors whitespace-nowrap"
              >
                <span>Repasar con Tutor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
