import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Info,
  Code,
  ShieldCheck,
  LineChart,
  Terminal,
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { MatlabReviewModal } from './MatlabReviewModal';
import { MatlabWorkbench } from './MatlabWorkbench';

interface SimulationLabProps {
  onAskControlBot: (prompt: string) => void;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({ onAskControlBot }) => {
  // Navigation between Graphical Simulation vs MATLAB Workbench
  const [activeSubTab, setActiveSubTab] = useState<'graph' | 'matlab'>('graph');

  // Parameters
  const [modelType, setModelType] = useState<'standard' | 'mechanical' | 'electrical'>('standard');
  const [wn, setWn] = useState<number>(3.0); // rad/s
  const [zeta, setZeta] = useState<number>(0.4); // damping ratio
  const [inputType, setInputType] = useState<'step' | 'impulse' | 'ramp'>('step');
  const [tMax, setTMax] = useState<number>(6); // seconds
  const [isMatlabReviewOpen, setIsMatlabReviewOpen] = useState<boolean>(false);

  // Physical component variables
  const [mass, setMass] = useState<number>(1.5); // kg
  const [bMec, setBMec] = useState<number>(1.2); // N*s/m
  const [kMec, setKMec] = useState<number>(13.5); // N/m

  const [resistor, setResistor] = useState<number>(4.0); // Ohms
  const [inductor, setInductor] = useState<number>(0.8); // H
  const [capacitor, setCapacitor] = useState<number>(0.1); // F

  // Live animation state
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Sync physical params when in mechanical/electrical mode
  useEffect(() => {
    if (modelType === 'mechanical') {
      const calculatedWn = Math.sqrt(kMec / mass);
      const calculatedZeta = bMec / (2 * Math.sqrt(mass * kMec));
      setWn(Number(calculatedWn.toFixed(2)));
      setZeta(Number(calculatedZeta.toFixed(2)));
    } else if (modelType === 'electrical') {
      const calculatedWn = 1 / Math.sqrt(inductor * capacitor);
      const calculatedZeta = (resistor / 2) * Math.sqrt(capacitor / inductor);
      setWn(Number(calculatedWn.toFixed(2)));
      setZeta(Number(calculatedZeta.toFixed(2)));
    }
  }, [modelType, mass, bMec, kMec, resistor, inductor, capacitor]);

  // Derived mathematical quantities
  const metrics = useMemo(() => {
    const sigma = zeta * wn;
    const isUnderdamped = zeta > 0 && zeta < 1;
    const isCriticallyDamped = Math.abs(zeta - 1) < 0.01;
    const isOverdamped = zeta > 1;
    const isUndamped = zeta === 0;

    let wd = 0;
    let mp = 0;
    let tp = 0;
    let ts = 0;
    let tr = 0;
    let pole1 = '';
    let pole2 = '';
    let poleCoords: { real: number; imag: number }[] = [];

    if (isUnderdamped) {
      wd = wn * Math.sqrt(1 - zeta * zeta);
      mp = Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) * 100;
      tp = Math.PI / wd;
      ts = 4 / (zeta * wn);
      tr = (1.8 / wn);
      pole1 = `-${sigma.toFixed(2)} + j${wd.toFixed(2)}`;
      pole2 = `-${sigma.toFixed(2)} - j${wd.toFixed(2)}`;
      poleCoords = [
        { real: -sigma, imag: wd },
        { real: -sigma, imag: -wd },
      ];
    } else if (isCriticallyDamped) {
      ts = 5.8 / wn;
      tr = 2.2 / wn;
      pole1 = `-${wn.toFixed(2)}`;
      pole2 = `-${wn.toFixed(2)}`;
      poleCoords = [
        { real: -wn, imag: 0 },
        { real: -wn, imag: 0 },
      ];
    } else if (isOverdamped) {
      const s1 = -zeta * wn + wn * Math.sqrt(zeta * zeta - 1);
      const s2 = -zeta * wn - wn * Math.sqrt(zeta * zeta - 1);
      ts = 4 / Math.abs(s1);
      tr = 2.5 / wn;
      pole1 = `${s1.toFixed(2)}`;
      pole2 = `${s2.toFixed(2)}`;
      poleCoords = [
        { real: s1, imag: 0 },
        { real: s2, imag: 0 },
      ];
    } else {
      // Undamped
      wd = wn;
      pole1 = `+j${wn.toFixed(2)}`;
      pole2 = `-j${wn.toFixed(2)}`;
      poleCoords = [
        { real: 0, imag: wn },
        { real: 0, imag: -wn },
      ];
    }

    let regimeLabel = 'Subamortiguado (Oscilatorio Estable)';
    let regimeColor = 'text-cyan-400 bg-cyan-950/50 border-cyan-500/30';
    if (isUndamped) {
      regimeLabel = 'No Amortiguado (Oscilación Pura)';
      regimeColor = 'text-amber-400 bg-amber-950/50 border-amber-500/30';
    } else if (isCriticallyDamped) {
      regimeLabel = 'Críticamente Amortiguado (Más rápido sin sobreimpulso)';
      regimeColor = 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30';
    } else if (isOverdamped) {
      regimeLabel = 'Sobreamortiguado (Lento sin oscilaciones)';
      regimeColor = 'text-indigo-400 bg-indigo-950/50 border-indigo-500/30';
    }

    return {
      sigma,
      wd,
      mp,
      tp,
      ts,
      tr,
      pole1,
      pole2,
      poleCoords,
      regimeLabel,
      regimeColor,
      isUnderdamped,
      isCriticallyDamped,
      isOverdamped,
      isUndamped,
    };
  }, [wn, zeta]);

  // Compute time response y(t)
  const calculateY = (t: number): number => {
    if (t < 0) return 0;
    const { isUnderdamped, isCriticallyDamped, isOverdamped, isUndamped, wd, sigma } = metrics;

    if (inputType === 'step') {
      if (isUndamped) {
        return 1 - Math.cos(wn * t);
      }
      if (isUnderdamped) {
        const phi = Math.atan(Math.sqrt(1 - zeta * zeta) / zeta);
        return 1 - (Math.exp(-sigma * t) / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t + phi);
      }
      if (isCriticallyDamped) {
        return 1 - Math.exp(-wn * t) * (1 + wn * t);
      }
      if (isOverdamped) {
        const s1 = -zeta * wn + wn * Math.sqrt(zeta * zeta - 1);
        const s2 = -zeta * wn - wn * Math.sqrt(zeta * zeta - 1);
        return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2);
      }
    } else if (inputType === 'impulse') {
      if (isUnderdamped) {
        return (wn / Math.sqrt(1 - zeta * zeta)) * Math.exp(-sigma * t) * Math.sin(wd * t);
      }
      if (isCriticallyDamped) {
        return wn * wn * t * Math.exp(-wn * t);
      }
      if (isOverdamped) {
        const s1 = -zeta * wn + wn * Math.sqrt(zeta * zeta - 1);
        const s2 = -zeta * wn - wn * Math.sqrt(zeta * zeta - 1);
        return (wn * wn / (s1 - s2)) * (Math.exp(s1 * t) - Math.exp(s2 * t));
      }
      return wn * Math.sin(wn * t);
    } else {
      // Ramp
      if (isUnderdamped) {
        const phi = Math.atan(Math.sqrt(1 - zeta * zeta) / zeta);
        const ts2 = (2 * zeta) / wn;
        return t - ts2 + (Math.exp(-sigma * t) / (wn * Math.sqrt(1 - zeta * zeta))) * Math.sin(wd * t + 2 * phi);
      }
      return Math.max(0, t - 2 / wn);
    }
    return 0;
  };

  // Generate curve data points
  const points = useMemo(() => {
    const numPoints = 250;
    const pts: { t: number; y: number }[] = [];
    let maxY = 1.2;

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * tMax;
      const y = calculateY(t);
      pts.push({ t, y });
      if (y > maxY) maxY = y;
    }

    return { pts, maxY: Math.max(maxY * 1.1, 1.5) };
  }, [wn, zeta, inputType, tMax, metrics]);

  // Live animation loop
  useEffect(() => {
    if (!isSimulating) return;

    let lastTimestamp = performance.now();
    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setSimTime((prev) => {
        const next = prev + delta;
        return next > tMax ? 0 : next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, tMax]);

  const currentY = calculateY(simTime);

  // Send system configuration to ControlBot for 5-step tutorial
  const handleConsultControlBot = () => {
    const prompt = `Analiza detalladamente este sistema de 2do orden configurado en el Laboratorio:
- Frecuencia natural: \\omega_n = ${wn} rad/s
- Factor de amortiguamiento: \\zeta = ${zeta} (${metrics.regimeLabel})
- Función de Transferencia: G(s) = \\frac{${(wn * wn).toFixed(2)}}{s^2 + ${(2 * zeta * wn).toFixed(2)}s + ${(wn * wn).toFixed(2)}}
- Polos del sistema: ${metrics.pole1} y ${metrics.pole2}
- Sobreimpulso Máximo: ${metrics.mp > 0 ? metrics.mp.toFixed(2) + '%' : '0%'}
- Tiempo de Asentamiento (2%): ${metrics.ts.toFixed(2)} s

Por favor, realiza el análisis completo usando la metodología de 5 pasos:
1. Intuición física.
2. Desarrollo matemático de la respuesta temporal al escalón.
3. Representación en espacio de estados y ubicación de polos.
4. Código de MATLAB para graficar y bloques en Simulink.
5. Pregunta de verificación desafiante.`;

    onAskControlBot(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Laboratorio Interactivo de Respuesta Dinámica & Taller MATLAB
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simula sistemas de 2do orden en tiempo real, audita código .m con IA y analiza polos en el plano complejo.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tab view toggle */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'graph'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Simulador Gráfico</span>
            </button>
            <button
              onClick={() => setActiveSubTab('matlab')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'matlab'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Taller MATLAB & Linter</span>
            </button>
          </div>

          <button
            onClick={handleConsultControlBot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Consultar a ControlBot</span>
          </button>
        </div>
      </div>

      {/* When in MATLAB Mode */}
      {activeSubTab === 'matlab' ? (
        <MatlabWorkbench
          onApplySystemParams={(params) => {
            setWn(params.wn);
            setZeta(params.zeta);
            setModelType(params.type);
            setActiveSubTab('graph');
          }}
          onAskControlBot={onAskControlBot}
        />
      ) : (
        <>
          {/* Model Selector Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setModelType('standard')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all shadow-xs ${
                modelType === 'standard'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">Forma Canónica Estándar</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2)</div>
              </div>
            </button>

            <button
              onClick={() => setModelType('mechanical')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all shadow-xs ${
                modelType === 'mechanical'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">Masa - Resorte - Amortiguador</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">m*x'' + b*x' + k*x = F(t)</div>
              </div>
            </button>

            <button
              onClick={() => setModelType('electrical')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all shadow-xs ${
                modelType === 'electrical'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">Circuito RLC Serie (LVK)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">L*q'' + R*q' + (1/C)*q = Vin(t)</div>
              </div>
            </button>
          </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (Left - 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Slider Parameters Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Parámetros del Sistema
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {metrics.regimeLabel.split(' ')[0]}
              </span>
            </div>

            {/* If Standard Mode */}
            {modelType === 'standard' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Frecuencia Natural (ωₙ):
                    </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{wn} rad/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.1"
                    value={wn}
                    onChange={(e) => setWn(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    <span>0.5 rad/s (Lento)</span>
                    <span>15.0 rad/s (Rápido)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Factor de Amortiguamiento (ζ):
                    </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{zeta}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={zeta}
                    onChange={(e) => setZeta(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    <span>0.0 (Oscilatorio)</span>
                    <span>1.0 (Crítico)</span>
                    <span>2.5 (Sobreamortiguado)</span>
                  </div>
                </div>
              </div>
            )}

            {/* If Mechanical Mode */}
            {modelType === 'mechanical' && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Masa m (kg):</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{mass} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="10"
                    step="0.1"
                    value={mass}
                    onChange={(e) => setMass(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Amortiguamiento b (N·s/m):</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{bMec} N·s/m</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="15"
                    step="0.1"
                    value={bMec}
                    onChange={(e) => setBMec(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Rigidez Resorte k (N/m):</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{kMec} N/m</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="0.5"
                    value={kMec}
                    onChange={(e) => setKMec(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-mono text-slate-700 dark:text-slate-300">
                  <div>wn = sqrt(k/m) = {wn} rad/s</div>
                  <div>zeta = b/(2*sqrt(m*k)) = {zeta}</div>
                </div>
              </div>
            )}

            {/* If Electrical Mode */}
            {modelType === 'electrical' && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Resistencia R (Ω):</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{resistor} Ω</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={resistor}
                    onChange={(e) => setResistor(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Inductancia L (H):</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{inductor} H</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={inductor}
                    onChange={(e) => setInductor(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Capacitancia C (F):</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{capacitor} F</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={capacitor}
                    onChange={(e) => setCapacitor(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-mono text-slate-700 dark:text-slate-300">
                  <div>wn = 1/sqrt(L*C) = {wn} rad/s</div>
                  <div>zeta = (R/2)*sqrt(C/L) = {zeta}</div>
                </div>
              </div>
            )}

            {/* Input Signal Type */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Señal de Entrada:</span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['step', 'impulse', 'ramp'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`py-1.5 px-2 rounded-lg font-medium capitalize transition-colors ${
                      inputType === type
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type === 'step' ? 'Escalón' : type === 'impulse' ? 'Impulso' : 'Rampa'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transfer Function & Poles Display */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Función de Transferencia $G(s)$
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <MathRenderer
                content={`$$G(s) = \\frac{${(wn * wn).toFixed(2)}}{s^2 + ${(2 * zeta * wn).toFixed(
                  2
                )} s + ${(wn * wn).toFixed(2)}}$$`}
              />
            </div>
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Polo $s_1$:</span>
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{metrics.pole1}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Polo $s_2$:</span>
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{metrics.pole2}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Atenuación $\\sigma = \\zeta \\omega_n$:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{metrics.sigma.toFixed(2)}</span>
              </div>
              {metrics.wd > 0 && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Frecuencia amortiguada $\\omega_d$:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{metrics.wd.toFixed(2)} rad/s</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts & Interactive Canvas (Right - 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main Response Curve */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Respuesta Temporal $y(t)$ ({inputType.toUpperCase()})
                </span>
              </div>

              {/* Play / Pause / Reset Animation */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? 'Pausar' : 'Reanudar'}</span>
                </button>
                <button
                  onClick={() => setSimTime(0)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Reiniciar tiempo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800">
                  t = {simTime.toFixed(2)} s
                </span>
              </div>
            </div>

            {/* SVG Interactive Waveform Graph */}
            <div className="relative w-full h-64 bg-[#0f172a] rounded-xl border border-slate-700/80 overflow-hidden select-none shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 500 240" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.5, 1.0, 1.5, 2.0].map((val) => {
                  const yPos = 210 - (val / points.maxY) * 180;
                  return (
                    <g key={val}>
                      <line
                        x1="45"
                        y1={yPos}
                        x2="485"
                        y2={yPos}
                        stroke="#334155"
                        strokeDasharray={val === 1.0 ? '4 2' : '2 4'}
                        strokeWidth="0.8"
                      />
                      <text x="38" y={yPos + 3} fill="#94a3b8" fontSize="9" textAnchor="end">
                        {val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Time Axis Labels */}
                {[0, tMax / 4, tMax / 2, (3 * tMax) / 4, tMax].map((tVal, idx) => {
                  const xPos = 45 + (idx / 4) * 440;
                  return (
                    <g key={idx}>
                      <line x1={xPos} y1="30" x2={xPos} y2="210" stroke="#1e293b" strokeWidth="0.8" />
                      <text x={xPos} y="226" fill="#94a3b8" fontSize="9" textAnchor="middle">
                        {tVal.toFixed(1)}s
                      </text>
                    </g>
                  );
                })}

                {/* Reference unit step 1.0 line */}
                {inputType === 'step' && (
                  <line
                    x1="45"
                    y1={210 - (1.0 / points.maxY) * 180}
                    x2="485"
                    y2={210 - (1.0 / points.maxY) * 180}
                    stroke="#10b981"
                    strokeDasharray="4 3"
                    strokeWidth="1.2"
                  />
                )}

                {/* Settling Time ts marker */}
                {metrics.ts < tMax && metrics.ts > 0 && inputType === 'step' && (
                  <g>
                    <line
                      x1={45 + (metrics.ts / tMax) * 440}
                      y1="30"
                      x2={45 + (metrics.ts / tMax) * 440}
                      y2="210"
                      stroke="#ec4899"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={45 + (metrics.ts / tMax) * 440}
                      y="42"
                      fill="#f472b6"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      Ts ({metrics.ts.toFixed(1)}s)
                    </text>
                  </g>
                )}

                {/* Peak Time tp marker */}
                {metrics.isUnderdamped && metrics.tp < tMax && inputType === 'step' && (
                  <g>
                    <line
                      x1={45 + (metrics.tp / tMax) * 440}
                      y1="30"
                      x2={45 + (metrics.tp / tMax) * 440}
                      y2="210"
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={45 + (metrics.tp / tMax) * 440}
                      y="42"
                      fill="#fbbf24"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      Tp ({metrics.tp.toFixed(1)}s)
                    </text>
                  </g>
                )}

                {/* The Response Curve */}
                <path
                  d={points.pts.reduce((acc, p, idx) => {
                    const x = 45 + (p.t / tMax) * 440;
                    const y = 210 - (p.y / points.maxY) * 180;
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, '')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Animated Time Indicator Marker */}
                {simTime <= tMax && (
                  <g>
                    <line
                      x1={45 + (simTime / tMax) * 440}
                      y1="30"
                      x2={45 + (simTime / tMax) * 440}
                      y2="210"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={45 + (simTime / tMax) * 440}
                      cy={210 - (currentY / points.maxY) * 180}
                      r="5"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Performance Indicators Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Sobreimpulso %Mp</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {metrics.mp > 0 ? `${metrics.mp.toFixed(1)}%` : '0%'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Tiempo Pico Tp</div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                  {metrics.tp > 0 ? `${metrics.tp.toFixed(2)} s` : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Asentamiento Ts (2%)</div>
                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono mt-0.5">
                  {metrics.ts > 0 ? `${metrics.ts.toFixed(2)} s` : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Tiempo Subida Tr</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {metrics.tr > 0 ? `${metrics.tr.toFixed(2)} s` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Split: Complex s-Plane & Physical Live Animation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* s-Plane Pole Zero Map */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Plano Complejo s
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  Semiplano Izq (Estable)
                </span>
              </div>

              <div className="relative w-full h-44 bg-[#0f172a] rounded-xl border border-slate-700/80 overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" viewBox="-12 -10 24 20">
                  {/* Stable Region highlight */}
                  <rect x="-12" y="-10" width="12" height="20" fill="#064e3b" fillOpacity="0.25" />
                  <rect x="0" y="-10" width="12" height="20" fill="#7f1d1d" fillOpacity="0.15" />

                  {/* Axes */}
                  <line x1="-12" y1="0" x2="12" y2="0" stroke="#475569" strokeWidth="0.4" />
                  <line x1="0" y1="-10" x2="0" y2="10" stroke="#475569" strokeWidth="0.4" />

                  {/* Axis labels */}
                  <text x="11" y="-0.6" fill="#94a3b8" fontSize="1" textAnchor="end">
                    σ (Real)
                  </text>
                  <text x="0.6" y="-8.5" fill="#94a3b8" fontSize="1" textAnchor="start">
                    jω (Imag)
                  </text>

                  {/* Damping angle line if underdamped */}
                  {metrics.isUnderdamped && (
                    <line
                      x1="0"
                      y1="0"
                      x2={-metrics.sigma}
                      y2={metrics.wd}
                      stroke="#93c5fd"
                      strokeDasharray="0.6 0.6"
                      strokeWidth="0.3"
                    />
                  )}

                  {/* Poles markers (X) */}
                  {metrics.poleCoords.map((coord, idx) => (
                    <g key={idx} transform={`translate(${coord.real}, ${-coord.imag})`}>
                      <line x1="-0.7" y1="-0.7" x2="0.7" y2="0.7" stroke="#f43f5e" strokeWidth="0.6" />
                      <line x1="-0.7" y1="0.7" x2="0.7" y2="-0.7" stroke="#f43f5e" strokeWidth="0.6" />
                      <text x="0.9" y="0.4" fill="#fb7185" fontSize="0.9" fontWeight="bold">
                        s{idx + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Los polos determinan el modo natural: cuanto más a la izquierda, más rápido se extingue la respuesta.
              </div>
            </div>

            {/* Physical System Live Animation */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {modelType === 'electrical' ? 'Comportamiento Capacitor (RLC)' : 'Animación Física: Masa-Resorte'}
                </span>
                <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 font-bold">
                  {modelType === 'electrical' ? `Vc(t) = ${(currentY * 10).toFixed(1)} V` : `x(t) = ${currentY.toFixed(2)} m`}
                </span>
              </div>

              <div className="relative w-full h-44 bg-[#0f172a] rounded-xl border border-slate-700/80 overflow-hidden flex items-center justify-center p-2">
                {modelType === 'electrical' ? (
                  /* RLC Capacitor Charge Graphic */
                  <div className="w-full flex flex-col items-center justify-center space-y-2">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <div className="text-[10px] text-slate-400">Entrada Vin</div>
                        <div className="w-8 h-8 rounded-full border border-blue-400 flex items-center justify-center text-xs font-bold text-blue-300">
                          +10V
                        </div>
                      </div>
                      <div className="w-12 h-1 bg-amber-400 rounded" />
                      <div className="flex flex-col items-center">
                        <div className="text-[10px] text-slate-400">Capacitor C</div>
                        <div className="relative w-16 h-16 rounded-xl border border-cyan-400 bg-cyan-950/40 flex items-center justify-center overflow-hidden">
                          <div
                            className="absolute bottom-0 w-full bg-cyan-500/40 transition-all duration-75"
                            style={{ height: `${Math.min(Math.max(currentY * 50, 5), 100)}%` }}
                          />
                          <span className="relative z-10 text-xs font-bold text-cyan-200">
                            {(currentY * 10).toFixed(1)}V
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Energía almacenada E = 0.5 * C * Vc^2
                    </div>
                  </div>
                ) : (
                  /* Mass Spring Damper Mechanical Canvas */
                  <svg className="w-full h-full" viewBox="0 0 300 120">
                    {/* Fixed Wall */}
                    <line x1="20" y1="10" x2="20" y2="110" stroke="#64748b" strokeWidth="4" />
                    {/* Floor */}
                    <line x1="18" y1="105" x2="280" y2="105" stroke="#475569" strokeWidth="2" />

                    {/* Spring Coils */}
                    {(() => {
                      const massX = 140 + (currentY - 1) * 45;
                      const clampedX = Math.max(70, Math.min(230, massX));
                      return (
                        <>
                          {/* Spring */}
                          <path
                            d={`M 20 40 L 40 40 L 45 30 L 55 50 L 65 30 L 75 50 L 85 30 L 95 50 L 105 30 L 115 50 L 125 40 L ${clampedX} 40`}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                          />
                          {/* Damper Cylinder & Piston */}
                          <rect x="50" y="70" width="40" height="16" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                          <line x1="20" y1="78" x2="50" y2="78" stroke="#94a3b8" strokeWidth="2" />
                          <line x1="70" y1="78" x2={clampedX} y2="78" stroke="#f59e0b" strokeWidth="2" />
                          <line x1="70" y1="72" x2="70" y2="84" stroke="#f59e0b" strokeWidth="2" />

                          {/* Mass Block */}
                          <rect
                            x={clampedX}
                            y="25"
                            width="50"
                            height="80"
                            rx="6"
                            fill="#2563eb"
                            stroke="#60a5fa"
                            strokeWidth="2"
                          />
                          <text
                            x={clampedX + 25}
                            y="70"
                            fill="#ffffff"
                            fontSize="13"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            m
                          </text>

                          {/* Force Arrow */}
                          <line x1={clampedX + 50} y1="65" x2={clampedX + 75} y2="65" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Visualización física interactiva en sincronía con la ecuación diferencial.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
    )}

      {/* MATLAB Syntax and Efficiency Auditor Modal */}
      <MatlabReviewModal
        isOpen={isMatlabReviewOpen}
        onClose={() => setIsMatlabReviewOpen(false)}
        targetSystem={`Sistema de 2do Orden: wn=${wn} rad/s, zeta=${zeta}, G(s) = ${(wn*wn).toFixed(2)} / (s^2 + ${(2*zeta*wn).toFixed(2)}s + ${(wn*wn).toFixed(2)})`}
      />
    </div>
  );
};
