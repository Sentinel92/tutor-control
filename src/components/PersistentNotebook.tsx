import React, { useState, useEffect } from 'react';
import { MathRenderer } from './MathRenderer';
import { syncProgressToFirebase, loadProgressFromFirebase } from '../services/progressService';
import {
  FileText,
  Save,
  Download,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Eye,
  Edit3,
  Columns,
  BookMarked,
  Send,
  HelpCircle,
  Cloud,
} from 'lucide-react';

interface PersistentNotebookProps {
  onSendToChat?: (text: string) => void;
  isDualMode?: boolean;
}

const STORAGE_KEY = 'controlbot_persistent_notebook_notes';

const FORMULA_SNIPPETS = [
  { label: 'G(s) 2° Orden', snippet: '$$G(s) = \\frac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}$$' },
  { label: 'Espacio Estados', snippet: '$$\\begin{cases} \\dot{\\mathbf{x}}(t) = \\mathbf{A}\\mathbf{x}(t) + \\mathbf{B}u(t) \\\\ y(t) = \\mathbf{C}\\mathbf{x}(t) + \\mathbf{D}u(t) \\end{cases}$$' },
  { label: 'G(s) desde (A,B,C,D)', snippet: '$$G(s) = \\mathbf{C}(s\\mathbf{I} - \\mathbf{A})^{-1}\\mathbf{B} + \\mathbf{D}$$' },
  { label: 'Sobrepaso %Mp', snippet: '$$\\%M_p = 100 \\cdot e^{-\\frac{\\pi \\zeta}{\\sqrt{1-\\zeta^2}}}$$' },
  { label: 'Tiempo Asentamiento Ts', snippet: '$$T_s (2\\%) \\approx \\frac{4}{\\zeta \\omega_n}$$' },
  { label: 'Laplace Derivada', snippet: '$$\\mathcal{L}\\{\\dot{x}(t)\\} = s X(s) - x(0)$$ y $$\\mathcal{L}\\{\\ddot{x}(t)\\} = s^2 X(s) - s x(0) - \\dot{x}(0)$$' },
  { label: 'Circuito RLC', snippet: '$$L \\frac{di(t)}{dt} + R i(t) + \\frac{1}{C}\\int i(t)dt = v_{in}(t)$$' },
  { label: 'Masa-Resorte', snippet: '$$m\\ddot{x}(t) + b\\dot{x}(t) + k x(t) = f(t)$$' },
];

const TEMPLATES = [
  {
    name: 'Plantilla de Modelamiento (5 Pasos)',
    content: `# Apuntes de Modelamiento: [Nombre del Sistema]
Fecha: ${new Date().toLocaleDateString()}

### Paso 1: Ley Física Fundamental
- Ecuación gobernante: $m \\ddot{x} + b \\dot{x} + k x = f(t)$
- Variables de entrada $u(t)$: 
- Variable de salida $y(t)$:

### Paso 2: Dominio de Laplace
- Transformada con C.I. nulas: $(m s^2 + b s + k) X(s) = F(s)$

### Paso 3: Función de Transferencia G(s)
$$G(s) = \\frac{X(s)}{F(s)} = \\frac{1}{m s^2 + b s + k}$$

### Paso 4: Parámetros Característicos
- $\\omega_n = \\sqrt{k/m} =$
- $\\zeta = \\frac{b}{2\\sqrt{km}} =$
- Tipo de respuesta: (Subamortiguado / Crítico / Sobreamortiguado)

### Paso 5: Script de Validación MATLAB
\`\`\`matlab
m = 1; b = 2; k = 5;
num = [1];
den = [m b k];
sys = tf(num, den);
step(sys);
grid on;
\`\`\`
`,
  },
  {
    name: 'Formulario de Espacio de Estados',
    content: `# Notas: Espacio de Estados y Estabilidad

### Matrices del Sistema
$$A = \\begin{bmatrix} 0 & 1 \\\\ -k/m & -b/m \\end{bmatrix}, \\quad B = \\begin{bmatrix} 0 \\\\ 1/m \\end{bmatrix}$$
$$C = \\begin{bmatrix} 1 & 0 \\end{bmatrix}, \\quad D = 0$$

### Polinomio Característico
$$P(s) = \\det(sI - A) = 0$$
- Polos $\\lambda_{1,2} = $

### Matrices de Kalman
- Matriz de Controlabilidad: $\\mathcal{C} = [B \\quad AB]$
- Matriz de Observabilidad: $\\mathcal{O} = \\begin{bmatrix} C \\\\ CA \\end{bmatrix}$
`,
  },
];

const DEFAULT_INITIAL_NOTE = `# 📝 Bloc de Notas del Estudiante: Modelamiento y Control
*Escribe aquí tus fórmulas clave, deducciones y notas durante la clase con ControlBot.*

### 📌 Fórmulas Clave de la Sesión:
$$G(s) = \\frac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}$$

- **Frecuencia Natural:** $\\omega_n$ (rad/s)
- **Factor de Amortiguamiento:** $\\zeta$
- **Polos:** $s_{1,2} = -\\zeta \\omega_n \\pm j \\omega_n \\sqrt{1-\\zeta^2}$

### 💡 Apuntes Rápidos:
- Para circuito RLC serie: $\\omega_n = \\frac{1}{\\sqrt{LC}}$, $\\zeta = \\frac{R}{2}\\sqrt{\\frac{C}{L}}$.
- Si $\\zeta < 1$: Sistema subamortiguado (oscilatorio con sobrepaso $\%M_p$).
- Si $\\zeta = 1$: Sistema críticamente amortiguado (más rápido sin oscilaciones).
- Si $\\zeta > 1$: Sistema sobreamortiguado (polos reales distintos, respuesta lenta).
`;

export const PersistentNotebook: React.FC<PersistentNotebookProps> = ({
  onSendToChat,
  isDualMode = false,
}) => {
  const [noteContent, setNoteContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved : DEFAULT_INITIAL_NOTE;
    } catch {
      return DEFAULT_INITIAL_NOTE;
    }
  });

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Guardado');

  // Save to localStorage automatically on content change & sync to Firebase with debounce
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, noteContent);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(`Auto-guardado a las ${timeStr}`);
    } catch (e) {
      console.error('Error saving notebook locally:', e);
    }

    const timer = setTimeout(() => {
      syncProgressToFirebase({ notebookNotes: noteContent });
    }, 1500);

    return () => clearTimeout(timer);
  }, [noteContent]);

  // Insert formula snippet at cursor or at end
  const handleInsertSnippet = (snippet: string) => {
    setNoteContent((prev) => {
      return prev ? `${prev}\n\n${snippet}` : snippet;
    });
  };

  // Load a preset template
  const handleLoadTemplate = (templateContent: string) => {
    if (
      noteContent.trim() &&
      !window.confirm('¿Deseas agregar esta plantilla al final de tus apuntes actuales?')
    ) {
      return;
    }
    setNoteContent((prev) => (prev ? `${prev}\n\n${templateContent}` : templateContent));
  };

  // Copy all notes to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(noteContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as markdown file
  const handleExport = () => {
    const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Apuntes_ControlBot_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear notebook
  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar el bloc de notas?')) {
      setNoteContent('');
    }
  };

  // Send selected text or whole notebook to ControlBot
  const handleAskAboutNotes = () => {
    if (!onSendToChat) return;
    const prompt = `Profesor ControlBot, revisa los siguientes apuntes y fórmulas que he tomado en mi bloc de notas y verifica si son correctos o si falta algún paso para mi examen:\n\n${noteContent.slice(
      0,
      1500
    )}`;
    onSendToChat(prompt);
  };

  return (
    <div className="flex flex-col h-full min-h-[580px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0f172a] text-white border-b border-slate-800 shrink-0 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Bloc de Notas Persistente
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-bold">
                Auto-guardado Local
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {lastSavedTime} • Permanece guardado en tu navegador
            </p>
          </div>
        </div>

        {/* View mode toggle & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                viewMode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Modo Editor"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Vista Dividida (Editor + Vista Previa)"
            >
              <Columns className="w-3 h-3" />
              <span>Dividido</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                viewMode === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Vista Previa con KaTeX"
            >
              <Eye className="w-3 h-3" />
              <span>Render</span>
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Copiar contenido"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Descargar notas (.md)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
            title="Vaciar bloc de notas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Snippets Toolbar */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          Insertar Fórmula:
        </span>
        {FORMULA_SNIPPETS.map((f, i) => (
          <button
            key={i}
            onClick={() => handleInsertSnippet(f.snippet)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
            title={f.snippet}
          >
            +{f.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Area (Editor / Preview / Split) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden ${
              viewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-800' : ''
            }`}
          >
            <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Editor Markdown & LaTeX ($...$ / $$...$$)</span>
              <span className="text-slate-500 dark:text-slate-400">{noteContent.length} caracteres • {noteContent.split(/\s+/).filter(Boolean).length} palabras</span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Escribe aquí tus fórmulas, apuntes de clase, o pega desarrollos de ControlBot..."
              className="flex-1 w-full p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
            <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Vista Renderizada Matemática</span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">Renderizado con KaTeX</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-slate-800 dark:text-slate-100 text-sm leading-relaxed">
              {noteContent.trim() ? (
                <MathRenderer content={noteContent} />
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs italic">
                  Tu bloc de notas está vacío. Escribe en el editor para ver tus fórmulas renderizadas aquí.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Templates & Quick Consult Footer */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Plantillas:</span>
          {TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleLoadTemplate(tpl.content)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
            >
              +{tpl.name}
            </button>
          ))}
        </div>

        {onSendToChat && (
          <button
            onClick={handleAskAboutNotes}
            disabled={!noteContent.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors"
            title="Enviar tus notas a ControlBot para revisión y preguntas"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Consultar Notas a ControlBot</span>
          </button>
        )}
      </div>
    </div>
  );
};
