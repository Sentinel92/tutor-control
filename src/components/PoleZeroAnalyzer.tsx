import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  parsePolynomial,
  polyToLatex,
  findRoots,
  analyzeStability,
  simulateStepResponse,
  formatComplex,
  ComplexNumber,
  StabilityReport,
} from '../utils/polynomial';
import { MathRenderer } from './MathRenderer';
import {
  Activity,
  Sliders,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Bot,
  Info,
  Maximize2,
  Layers,
  Table,
  LineChart,
  HelpCircle,
  Eye,
  Settings,
} from 'lucide-react';

interface PoleZeroAnalyzerProps {
  onAskControlBot?: (prompt: string, contextTitle?: string) => void;
}

// Classical preset systems
const PRESETS = [
  {
    name: 'Subamortiguado (Oscilatorio Estable)',
    desc: 'ζ = 0.38, ωn = 4. Polos complejos en semiplano izquierdo.',
    num: '16',
    den: 's^2 + 3s + 16',
    category: 'Segundo Orden',
  },
  {
    name: 'Críticamente Amortiguado',
    desc: 'ζ = 1.0, ωn = 3. Polos reales dobles en s = -3.',
    num: '9',
    den: 's^2 + 6s + 9',
    category: 'Segundo Orden',
  },
  {
    name: 'Sobreamortiguado (Lento)',
    desc: 'ζ = 1.5, ωn = 2. Dos polos reales distintos en s = -0.76 y s = -5.24.',
    num: '4',
    den: 's^2 + 6s + 4',
    category: 'Segundo Orden',
  },
  {
    name: 'Marginalmente Estable (Oscilador Puro)',
    desc: 'ζ = 0. Polos sobre el eje imaginario s = ±j5.',
    num: '25',
    den: 's^2 + 25',
    category: 'Límite de Estabilidad',
  },
  {
    name: 'Inestable (Polo en RHP)',
    desc: 'Polo en el semiplano derecho s = +1. Divergencia exponencial.',
    num: '10',
    den: 's^2 - 2s + 5',
    category: 'Inestabilidad',
  },
  {
    name: 'Fase No Mínima (Cero en RHP)',
    desc: 'Cero en s = +3 produce sobretiro inverso inicial (undershoot).',
    num: 's - 3',
    den: 's^2 + 4s + 8',
    category: 'Fase No Mínima',
  },
  {
    name: 'Circuito RLC Serie',
    desc: 'R = 4Ω, L = 1H, C = 0.1F => s^2 + 4s + 10.',
    num: '10',
    den: 's^2 + 4s + 10',
    category: 'Circuitos Eléctricos',
  },
  {
    name: 'Masa-Resorte-Amortiguador',
    desc: 'm = 1kg, b = 2 Ns/m, k = 5 N/m.',
    num: '1',
    den: 's^2 + 2s + 5',
    category: 'Mecánica',
  },
  {
    name: '3er Orden con Polo Dominante',
    desc: 'Polo rápido en s = -10 y polos lentos dominantes en s = -1 ± j2.',
    num: '50',
    den: 's^3 + 12s^2 + 25s + 50',
    category: 'Orden Superior',
  },
  {
    name: 'Integrador Puro (Tipo 1)',
    desc: 'Polo en el origen s = 0. Error estacionario nulo a escalón.',
    num: '5',
    den: 's^2 + 3s',
    category: 'Control Clásico',
  },
];

export const PoleZeroAnalyzer: React.FC<PoleZeroAnalyzerProps> = ({
  onAskControlBot,
}) => {
  // Input state
  const [numInput, setNumInput] = useState<string>('16');
  const [denInput, setDenInput] = useState<string>('s^2 + 2.4s + 16');
  const [copiedMatlab, setCopiedMatlab] = useState<boolean>(false);
  const [showRouthTable, setShowRouthTable] = useState<boolean>(false);
  const [showZetaLines, setShowZetaLines] = useState<boolean>(true);
  const [showWnCircles, setShowWnCircles] = useState<boolean>(true);
  const [hoveredEntity, setHoveredEntity] = useState<{
    type: 'pole' | 'zero';
    point: ComplexNumber;
    wn?: number;
    zeta?: number;
  } | null>(null);

  // SVG ref for D3
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Parse coefficients
  const numCoeffs = useMemo(() => parsePolynomial(numInput), [numInput]);
  const denCoeffs = useMemo(() => parsePolynomial(denInput), [denInput]);

  // Roots calculation
  const zeros = useMemo(() => findRoots(numCoeffs), [numCoeffs]);
  const poles = useMemo(() => findRoots(denCoeffs), [denCoeffs]);

  // Stability Analysis & Routh-Hurwitz
  const report: StabilityReport = useMemo(
    () => analyzeStability(numCoeffs, denCoeffs),
    [numCoeffs, denCoeffs]
  );

  // Step Response simulation
  const stepData = useMemo(
    () => simulateStepResponse(numCoeffs, denCoeffs, 10, 200),
    [numCoeffs, denCoeffs]
  );

  // LaTeX representation of G(s)
  const numLatex = useMemo(() => polyToLatex(numCoeffs), [numCoeffs]);
  const denLatex = useMemo(() => polyToLatex(denCoeffs), [denCoeffs]);

  // Generate MATLAB code
  const matlabCode = useMemo(() => {
    const numStr = `[${numCoeffs.join(' ')}]`;
    const denStr = `[${denCoeffs.join(' ')}]`;
    return `% Análisis de Estabilidad y Mapa de Polos y Ceros en MATLAB
num = ${numStr};
den = ${denStr};
G = tf(num, den);

% Polos, Ceros y Estabilidad
p = pole(G);
z = zero(G);
fprintf('--- POLOS DEL SISTEMA ---\\n');
disp(p);

% Gráfico Interactivo de Polos y Ceros (s-plane)
figure('Color', 'w');
pzmap(G);
grid on;
title('Mapa de Polos (x) y Ceros (o) - G(s)');
sgrid; % Muestra líneas de zeta y círculos de wn

% Respuesta al Escalón
figure('Color', 'w');
step(G);
grid on;
title('Respuesta Temporal al Escalón Unitario y(t)');

% Diagnóstico de Estabilidad
if isstable(G)
    disp('ESTADO: Sistema Asintóticamente Estable (LHP)');
else
    disp('ESTADO: Sistema Inestable o Marginalmente Estable');
end
damp(G); % Muestra amortiguamiento y frecuencia natural`;
  }, [numCoeffs, denCoeffs]);

  const handleCopyMatlab = () => {
    navigator.clipboard.writeText(matlabCode);
    setCopiedMatlab(true);
    setTimeout(() => setCopiedMatlab(false), 2500);
  };

  const handlePresetSelect = (preset: (typeof PRESETS)[0]) => {
    setNumInput(preset.num);
    setDenInput(preset.den);
  };

  // Ask ControlBot about this stability configuration
  const handleConsultBot = () => {
    if (!onAskControlBot) return;
    const prompt = `Analiza detalladamente la estabilidad de la función de transferencia $G(s) = \\frac{${numLatex}}{${denLatex}}$. 
- Calcula analíticamente sus polos y ceros en el plano complejo $s = \\sigma + j\\omega$.
- Diagnostica si es Estable, Marginalmente Estable o Inestable según el criterio de Routh-Hurwitz y la ubicación en el semiplano izquierdo (LHP).
- Explica qué características tendrá su respuesta temporal al escalón unitario (sobretiro $M_p$, tiempo de asentamiento $T_s$, oscilaciones) y proporciona el código MATLAB para validarlo.`;

    onAskControlBot(prompt, 'Análisis de Estabilidad y Polos/Ceros');
  };

  // D3.js S-Plane Visualization Effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 600;
    const height = 480;
    const margin = { top: 30, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine domain bounds based on poles and zeros
    const allReal = [...poles.map((p) => p.real), ...zeros.map((z) => z.real), -4, 2];
    const allImag = [
      ...poles.map((p) => p.imag),
      ...zeros.map((z) => z.imag),
      -4,
      4,
    ];

    const maxAbsReal = Math.max(Math.abs(Math.min(...allReal)), Math.abs(Math.max(...allReal)), 4);
    const maxAbsImag = Math.max(Math.abs(Math.min(...allImag)), Math.abs(Math.max(...allImag)), 4);
    const bound = Math.max(maxAbsReal, maxAbsImag) * 1.3;

    // Base coordinate scales
    const xDomain = [-bound, bound * 0.7]; // Give more room to LHP
    const yDomain = [-bound, bound];

    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    // Container Group for zoom/pan
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Add clip path
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 's-plane-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const contentG = g.append('g').attr('clip-path', 'url(#s-plane-clip)');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const newX = event.transform.rescaleX(xScale);
        const newY = event.transform.rescaleY(yScale);
        renderPlane(newX, newY);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    function renderPlane(curX: d3.ScaleLinear<number, number>, curY: d3.ScaleLinear<number, number>) {
      contentG.selectAll('*').remove();

      const originX = curX(0);
      const originY = curY(0);

      // 1. Stability Region Shading
      // LHP (Stable Region)
      contentG
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', Math.max(0, originX))
        .attr('height', innerHeight)
        .attr('fill', '#10b981')
        .attr('fill-opacity', 0.07);

      // RHP (Unstable Region)
      contentG
        .append('rect')
        .attr('x', Math.max(0, originX))
        .attr('y', 0)
        .attr('width', Math.max(0, innerWidth - originX))
        .attr('height', innerHeight)
        .attr('fill', '#ef4444')
        .attr('fill-opacity', 0.08);

      // Stability Labels
      contentG
        .append('text')
        .attr('x', 14)
        .attr('y', 20)
        .attr('fill', '#059669')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text('Zona Estable (LHP: Re(s) < 0)');

      contentG
        .append('text')
        .attr('x', innerWidth - 14)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('fill', '#dc2626')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text('Zona Inestable (RHP: Re(s) > 0)');

      // 2. Damping Ratio (zeta) Lines
      if (showZetaLines) {
        const zetas = [0.2, 0.4, 0.6, 0.8];
        const maxR = Math.max(...curX.domain().map(Math.abs), ...curY.domain().map(Math.abs)) * 2;

        zetas.forEach((z) => {
          const theta = Math.acos(z); // Angle from negative real axis
          const angle1 = Math.PI - theta;
          const angle2 = Math.PI + theta;

          const x1 = maxR * Math.cos(angle1);
          const y1 = maxR * Math.sin(angle1);
          const x2 = maxR * Math.cos(angle2);
          const y2 = maxR * Math.sin(angle2);

          contentG
            .append('line')
            .attr('x1', originX)
            .attr('y1', originY)
            .attr('x2', curX(x1))
            .attr('y2', curY(y1))
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.6);

          contentG
            .append('line')
            .attr('x1', originX)
            .attr('y1', originY)
            .attr('x2', curX(x2))
            .attr('y2', curY(y2))
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.6);

          // Zeta text label
          const labelDist = bound * 0.7;
          const lx = labelDist * Math.cos(angle1);
          const ly = labelDist * Math.sin(angle1);
          if (curX(lx) > 0 && curX(lx) < innerWidth && curY(ly) > 0 && curY(ly) < innerHeight) {
            contentG
              .append('text')
              .attr('x', curX(lx))
              .attr('y', curY(ly) - 4)
              .attr('fill', '#64748b')
              .attr('font-size', '9px')
              .attr('font-weight', 'semibold')
              .text(`ζ=${z}`);
          }
        });
      }

      // 3. Natural Frequency (wn) Circles
      if (showWnCircles) {
        const wnSteps = [2, 4, 6, 8, 10, 15, 20].filter((w) => w <= bound * 1.5);
        wnSteps.forEach((w) => {
          const rPixel = Math.abs(curX(w) - curX(0));
          contentG
            .append('circle')
            .attr('cx', originX)
            .attr('cy', originY)
            .attr('r', rPixel)
            .attr('fill', 'none')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,4')
            .attr('opacity', 0.7);

          // Label on circle
          if (originY - rPixel > 10 && originY - rPixel < innerHeight) {
            contentG
              .append('text')
              .attr('x', originX + 5)
              .attr('y', originY - rPixel + 12)
              .attr('fill', '#94a3b8')
              .attr('font-size', '9px')
              .text(`ωn=${w}`);
          }
        });
      }

      // 4. Grid lines
      const xTicks = curX.ticks(10);
      const yTicks = curY.ticks(10);

      xTicks.forEach((t) => {
        contentG
          .append('line')
          .attr('x1', curX(t))
          .attr('x2', curX(t))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#e2e8f0')
          .attr('stroke-width', 0.7);
      });

      yTicks.forEach((t) => {
        contentG
          .append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', curY(t))
          .attr('y2', curY(t))
          .attr('stroke', '#e2e8f0')
          .attr('stroke-width', 0.7);
      });

      // 5. Main Axes (Real Axis σ and Imaginary Axis jω)
      // Real axis (horizontal)
      contentG
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', originY)
        .attr('y2', originY)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1.8);

      // Imaginary axis (vertical jω - Critical Stability Boundary)
      contentG
        .append('line')
        .attr('x1', originX)
        .attr('x2', originX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#d97706') // Amber highlight
        .attr('stroke-width', 2.2)
        .attr('stroke-dasharray', '6,3');

      // Axes Labels
      contentG
        .append('text')
        .attr('x', innerWidth - 6)
        .attr('y', originY - 8)
        .attr('text-anchor', 'end')
        .attr('fill', '#1e293b')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text('σ (Eje Real)');

      contentG
        .append('text')
        .attr('x', originX + 8)
        .attr('y', 14)
        .attr('fill', '#d97706')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text('jω (Eje Imaginario)');

      // 6. Draw ZEROS (o)
      zeros.forEach((z, idx) => {
        const cx = curX(z.real);
        const cy = curY(z.imag);
        const wn = Math.hypot(z.real, z.imag);
        const zeta = wn > 1e-6 ? -z.real / wn : undefined;

        const zeroG = contentG
          .append('g')
          .attr('transform', `translate(${cx}, ${cy})`)
          .style('cursor', 'pointer')
          .on('mouseenter', () => {
            setHoveredEntity({ type: 'zero', point: z, wn, zeta });
          })
          .on('mouseleave', () => {
            setHoveredEntity(null);
          });

        // Zero outer circle
        zeroG
          .append('circle')
          .attr('r', 7)
          .attr('fill', '#ffffff')
          .attr('stroke', '#2563eb') // Blue circle
          .attr('stroke-width', 2.8)
          .attr('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))');

        // Zero center dot
        zeroG.append('circle').attr('r', 1.5).attr('fill', '#2563eb');

        // Label
        zeroG
          .append('text')
          .attr('x', 9)
          .attr('y', -7)
          .attr('fill', '#1d4ed8')
          .attr('font-weight', 'bold')
          .attr('font-size', '11px')
          .text(`z${zeros.length > 1 ? idx + 1 : ''}`);
      });

      // 7. Draw POLES (x)
      poles.forEach((p, idx) => {
        const cx = curX(p.real);
        const cy = curY(p.imag);
        const isRHP = p.real > 1e-5;
        const isAxis = Math.abs(p.real) <= 1e-5;
        const wn = Math.hypot(p.real, p.imag);
        const zeta = wn > 1e-6 ? -p.real / wn : undefined;

        // Color according to stability
        const poleColor = isRHP ? '#ef4444' : isAxis ? '#f59e0b' : '#0284c7';

        const poleG = contentG
          .append('g')
          .attr('transform', `translate(${cx}, ${cy})`)
          .style('cursor', 'pointer')
          .on('mouseenter', () => {
            setHoveredEntity({ type: 'pole', point: p, wn, zeta });
          })
          .on('mouseleave', () => {
            setHoveredEntity(null);
          });

        // Pulsing background glow if unstable
        if (isRHP) {
          poleG
            .append('circle')
            .attr('r', 14)
            .attr('fill', '#ef4444')
            .attr('fill-opacity', 0.25);
        }

        // 'X' Marker (two diagonal lines)
        const size = 7;
        poleG
          .append('line')
          .attr('x1', -size)
          .attr('y1', -size)
          .attr('x2', size)
          .attr('y2', size)
          .attr('stroke', poleColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round');

        poleG
          .append('line')
          .attr('x1', size)
          .attr('y1', -size)
          .attr('x2', -size)
          .attr('y2', size)
          .attr('stroke', poleColor)
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round');

        // Pole label
        poleG
          .append('text')
          .attr('x', 9)
          .attr('y', 12)
          .attr('fill', poleColor)
          .attr('font-weight', 'bold')
          .attr('font-size', '11px')
          .text(`p${poles.length > 1 ? idx + 1 : ''}`);
      });
    }

    // Initial render
    renderPlane(xScale, yScale);
  }, [poles, zeros, showZetaLines, showWnCircles]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Analizador de Polos, Ceros y Estabilidad Dinámica (D3.js)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 font-extrabold">
                s-Plane Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ingresa una Función de Transferencia $G(s)$, visualiza la distribución de polos ($\times$) y ceros ($\circ$) en el plano complejo $s$ y evalúa la estabilidad asintótica.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleConsultBot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all hover:scale-105"
          >
            <Bot className="w-4 h-4" />
            <span>Consultar con ControlBot</span>
          </button>

          <button
            onClick={handleCopyMatlab}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            title="Copiar código pzmap y tf para MATLAB"
          >
            {copiedMatlab ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Script MATLAB</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs + Preset Cards + Graphic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: TF Formula Input & Presets (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Transfer Function Input Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Función de Transferencia $G(s)$
              </h3>
              <span className="text-[11px] text-slate-400">Formato s o coeficientes</span>
            </div>

            {/* Render Current Math Equation */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[76px] overflow-x-auto text-center">
              <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                <MathRenderer
                  content={`$$G(s) = \\frac{N(s)}{D(s)} = \\frac{${numLatex}}{${denLatex}}$$`}
                />
              </div>
            </div>

            {/* Input Inputs for Num and Den */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Numerador $N(s)$ (Ceros):
                </label>
                <input
                  type="text"
                  value={numInput}
                  onChange={(e) => setNumInput(e.target.value)}
                  placeholder="Ej. 16  ó  2s + 4  ó  [2 4]"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Determina la ubicación de los ceros ($\circ$) del sistema.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Denominador $D(s)$ (Polos / Ec. Característica):
                </label>
                <input
                  type="text"
                  value={denInput}
                  onChange={(e) => setDenInput(e.target.value)}
                  placeholder="Ej. s^2 + 2.4s + 16  ó  [1 2.4 16]"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Las raíces de $D(s) = 0$ determinan la <strong>estabilidad</strong> y modos naturales ($\times$).
                </span>
              </div>
            </div>
          </div>

          {/* Preset Systems Catalog */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Plantillas y Casos de Estudio Clásicos:
              </span>
              <span className="text-[11px] text-slate-400">Clic para cargar</span>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {PRESETS.map((preset, idx) => {
                const isSelected = numInput === preset.num && denInput === preset.den;
                return (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 ring-1 ring-blue-300 dark:ring-blue-800'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {preset.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: D3.js Graphic & Interactive Tooling (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* S-Plane Visualization Surface */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-3 transition-colors">
            {/* Top Toolbar for S-Plane */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Plano Complejo $s = \sigma + j\omega$
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {poles.length} Polo(s) (×) | {zeros.length} Cero(s) (○)
                </span>
              </div>

              {/* View options and Reset Zoom */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowZetaLines(!showZetaLines)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    showZetaLines
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Mostrar rayos de factor de amortiguamiento constante (zeta)"
                >
                  Rayos ζ
                </button>

                <button
                  onClick={() => setShowWnCircles(!showWnCircles)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    showWnCircles
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Mostrar círculos de frecuencia natural constante (wn)"
                >
                  Círculos ωn
                </button>

                <button
                  onClick={handleResetZoom}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                  title="Restablecer escala y centrado original"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Centrar</span>
                </button>
              </div>
            </div>

            {/* D3 SVG Canvas Container */}
            <div className="relative w-full bg-[#fbfcfd] dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center min-h-[380px]">
              <svg
                ref={svgRef}
                viewBox="0 0 600 480"
                className="w-full h-auto max-h-[460px] select-none"
              />

              {/* Hover entity floating tooltip */}
              {hoveredEntity && (
                <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1 pointer-events-none z-10 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        hoveredEntity.type === 'pole' ? 'bg-rose-400' : 'bg-blue-400'
                      }`}
                    />
                    <span>
                      {hoveredEntity.type === 'pole' ? 'Polo (×)' : 'Cero (○)'}:{' '}
                      {formatComplex(hoveredEntity.point)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>
                      Parte Real ($\sigma$):{' '}
                      <span className="font-mono text-amber-300">
                        {hoveredEntity.point.real.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      Parte Imag ($j\omega$):{' '}
                      <span className="font-mono text-cyan-300">
                        {hoveredEntity.point.imag.toFixed(3)}
                      </span>
                    </div>
                    {hoveredEntity.wn !== undefined && (
                      <div>
                        Frecuencia Natural ($\omega_n$):{' '}
                        <span className="font-mono font-bold text-emerald-300">
                          {hoveredEntity.wn.toFixed(2)} rad/s
                        </span>
                      </div>
                    )}
                    {hoveredEntity.zeta !== undefined && (
                      <div>
                        Amortiguamiento ($\zeta$):{' '}
                        <span className="font-mono font-bold text-purple-300">
                          {hoveredEntity.zeta.toFixed(3)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">×</span> Polo Estable
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-sm">×</span> Polo Inestable
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">○</span> Cero
                </span>
              </div>
              <span className="text-slate-400 dark:text-slate-500">
                Usa la rueda del ratón o pellizca para hacer Zoom y Pan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stability Verdict, Transient Metrics & Step Response Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stability Report Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-3 transition-colors ${
              report.status === 'stable'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : report.status === 'marginally_stable'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {report.status === 'stable' ? (
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : report.status === 'marginally_stable' ? (
                <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                  <XCircle className="w-5 h-5" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  Diagnóstico de Estabilidad
                </span>
                <h3
                  className={`text-base font-black ${
                    report.status === 'stable'
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : report.status === 'marginally_stable'
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {report.title}
                </h3>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {report.summary}
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {report.explanation}
            </p>

            {/* Distribution Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {report.polesInLHP}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Polos LHP
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {report.polesOnAxis}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Polos Eje jω
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  {report.polesInRHP}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Polos RHP
                </div>
              </div>
            </div>

            {/* Toggle Routh-Hurwitz Array */}
            <button
              onClick={() => setShowRouthTable(!showRouthTable)}
              className="w-full py-2 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{showRouthTable ? 'Ocultar Arreglo de Routh' : 'Ver Arreglo de Routh-Hurwitz'}</span>
            </button>
          </div>

          {/* Routh-Hurwitz Calculation Table */}
          {showRouthTable && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tabla de Routh-Hurwitz
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {report.routhSignChanges} cambio(s) de signo
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-slate-800 dark:text-slate-200 border-collapse">
                  <tbody>
                    {report.routhArray.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-1 px-2 font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/50">
                          {row.power}
                        </td>
                        {row.values.map((v, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-1 px-2.5 text-right ${
                              cIdx === 0 && v < 0 ? 'text-rose-600 font-bold' : ''
                            }`}
                          >
                            {v.toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                El número de cambios de signo en la 1ra columna ({report.routhSignChanges}) equivale al número de polos en el semiplano derecho (RHP).
              </p>
            </div>
          )}
        </div>

        {/* Step Response & Poles List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Step Response Mini Curve */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Respuesta Temporal al Escalón Unitario $y(t)$
                </h3>
              </div>

              {report.dcGain !== null && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ganancia DC $G(0) = {report.dcGain.toFixed(2)}$
                </span>
              )}
            </div>

            {/* Step Response SVG */}
            <div className="w-full bg-[#f8fafc] dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[160px] flex items-center justify-center">
              {stepData.length > 0 ? (
                <svg viewBox="0 0 500 140" className="w-full h-36">
                  {/* Grid Lines */}
                  <line x1="40" y1="110" x2="480" y2="110" stroke="#94a3b8" strokeWidth="1" />
                  <line x1="40" y1="20" x2="40" y2="110" stroke="#94a3b8" strokeWidth="1" />

                  {/* Reference line 1.0 */}
                  {report.status === 'stable' && (
                    <line
                      x1="40"
                      y1="50"
                      x2="480"
                      y2="50"
                      stroke="#cbd5e1"
                      strokeDasharray="4,4"
                      strokeWidth="1"
                    />
                  )}

                  {/* Step Curve */}
                  {(() => {
                    const maxY = Math.max(...stepData.map((d) => d.y), 1.2);
                    const minY = Math.min(...stepData.map((d) => d.y), 0);
                    const yRange = Math.max(maxY - minY, 1);

                    const points = stepData
                      .map((d) => {
                        const px = 40 + (d.t / 10) * 440;
                        const py = 110 - ((d.y - minY) / yRange) * 90;
                        return `${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(' ');

                    return (
                      <polyline
                        fill="none"
                        stroke={
                          report.status === 'stable'
                            ? '#2563eb'
                            : report.status === 'marginally_stable'
                            ? '#d97706'
                            : '#ef4444'
                        }
                        strokeWidth="2.5"
                        points={points}
                      />
                    );
                  })()}

                  {/* Axis labels */}
                  <text x="475" y="125" fontSize="10" fill="#64748b" textAnchor="end">
                    Tiempo t (s)
                  </text>
                  <text x="35" y="15" fontSize="10" fill="#64748b">
                    y(t)
                  </text>
                </svg>
              ) : (
                <span className="text-xs text-slate-400">Sin datos de simulación</span>
              )}
            </div>

            {/* Transient Parameters Grid */}
            {report.status === 'stable' && report.wn && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    Frecuencia Natural
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                    $\omega_n = {report.wn.toFixed(2)}$ rad/s
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    Amortiguamiento
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                    $\zeta = {report.zeta ? report.zeta.toFixed(3) : '-'}$
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    Sobretiro Máximo
                  </div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                    $M_p = {report.mp !== undefined ? `${report.mp.toFixed(1)}%` : '0%'}$
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    T. Asentamiento (2%)
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    $T_s = {report.ts ? `${report.ts.toFixed(2)}s` : '-'}$
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List of Calculated Poles and Zeros */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detalle Analítico de Polos y Ceros
              </span>
              <span className="text-[11px] text-slate-400">Total: {poles.length + zeros.length} raíces</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Poles box */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Polos del Denominador $D(s) = 0$:</span>
                </div>
                {poles.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">Sin polos finitos</div>
                ) : (
                  poles.map((p, idx) => {
                    const isRHP = p.real > 1e-5;
                    const isAxis = Math.abs(p.real) <= 1e-5;
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                          isRHP
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            : isAxis
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="font-bold">p{idx + 1}:</span>
                        <span>{formatComplex(p)}</span>
                        <span className="text-[10px] font-sans font-bold">
                          {isRHP ? 'Inestable (RHP)' : isAxis ? 'Marginal (jω)' : 'Estable (LHP)'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Zeros box */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Ceros del Numerador $N(s) = 0$:</span>
                </div>
                {zeros.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                    Sin ceros en el plano finito (ganancia constante)
                  </div>
                ) : (
                  zeros.map((z, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between"
                    >
                      <span className="font-bold">z{idx + 1}:</span>
                      <span>{formatComplex(z)}</span>
                      <span className="text-[10px] font-sans font-bold text-blue-600 dark:text-blue-400">
                        {z.real > 1e-5 ? 'Fase No Mínima' : 'Cero LHP'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
