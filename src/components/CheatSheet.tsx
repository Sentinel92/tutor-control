import React, { useState } from 'react';
import { CHEAT_SHEET_ITEMS } from '../data/topics';
import { MathRenderer } from './MathRenderer';
import { Bookmark, Search, Copy, Check, FileText } from 'lucide-react';

export const CheatSheet: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filterItems = <T extends Record<string, any>>(items: T[], keys: (keyof T)[]) => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) =>
      keys.some((k) => String(item[k]).toLowerCase().includes(term))
    );
  };

  const filteredLaplace = filterItems(CHEAT_SHEET_ITEMS.laplaceTable, ['name', 'time', 'sDomain']);
  const filteredProps = filterItems(CHEAT_SHEET_ITEMS.properties, ['prop', 'expr']);
  const filtered2ndOrder = filterItems(CHEAT_SHEET_ITEMS.secondOrderParams, ['param', 'formula']);

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Formulario Oficial y Referencia Rápida de Control
            </h2>
            <p className="text-xs text-slate-500">
              Tablas de transformadas de Laplace, propiedades operacionales, parámetros de segundo orden
              y analogías físicas.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar fórmula (ej: seno, derivada, %Mp)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of Cheat Sheet sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Laplace Table (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Tabla de Pares de Transformada de Laplace L&#123;f(t)&#125;</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                    <th className="p-3">Función Temporal $f(t)$</th>
                    <th className="p-3">Transformada $F(s)$</th>
                    <th className="p-3">Nombre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredLaplace.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-900 font-semibold">
                        <MathRenderer content={`$${row.time}$`} />
                      </td>
                      <td className="p-3 text-blue-700 font-bold">
                        <MathRenderer content={`$${row.sDomain}$`} />
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px] font-medium">{row.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Properties of Laplace */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Propiedades y Teoremas de Laplace</span>
            </h3>

            <div className="space-y-2">
              {filteredProps.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-slate-800">{p.prop}:</span>
                  <div className="overflow-x-auto text-xs text-blue-700 font-bold">
                    <MathRenderer content={`$${p.expr}$`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2nd Order Parameters & Analogies (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Second Order Formulas */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Fórmulas de Desempeño de Sistemas de 2° Orden</span>
            </h3>

            <div className="space-y-3">
              {filtered2ndOrder.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{item.param}</div>
                  <div className="overflow-x-auto text-sm text-blue-700 font-semibold">
                    <MathRenderer content={`$$${item.formula}$$`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Electromechanical Analogies */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Analogía Fuerza-Voltaje (Mecánica vs. Eléctrica)</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                    <th className="p-3">Sistema Mecánico Traslacional</th>
                    <th className="p-3">Sistema Eléctrico (LVK)</th>
                    <th className="p-3">Impedancia en $s$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Fuerza $F(t)$" /></td>
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Voltaje $v(t)$" /></td>
                    <td className="p-3 text-blue-600 font-bold">Entrada</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Velocidad $v(t) = \dot{x}(t)$" /></td>
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Corriente $i(t) = \dot{q}(t)$" /></td>
                    <td className="p-3 text-blue-600 font-bold">Flujo</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Masa $m$" /></td>
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Inductancia $L$" /></td>
                    <td className="p-3 text-blue-700 font-bold"><MathRenderer content="$sL$ o $m s^2$" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Amortiguador $b$" /></td>
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Resistencia $R$" /></td>
                    <td className="p-3 text-blue-700 font-bold"><MathRenderer content="$R$ o $b s$" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Resorte $k$ (Rigidez)" /></td>
                    <td className="p-3 font-sans font-semibold text-slate-800"><MathRenderer content="Inverso Capacitancia $1/C$" /></td>
                    <td className="p-3 text-blue-700 font-bold"><MathRenderer content="$\frac{1}{sC}$ o $k$" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
