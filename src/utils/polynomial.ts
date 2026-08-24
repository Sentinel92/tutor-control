// Utility for Complex Numbers, Polynomial Root Finding, and Transfer Function Analysis

export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface PoleZeroItem extends ComplexNumber {
  id: string;
  type: 'pole' | 'zero';
  multiplicity?: number;
  dampingRatio?: number;
  naturalFrequency?: number;
  timeConstant?: number;
}

export interface StabilityReport {
  status: 'stable' | 'marginally_stable' | 'unstable';
  title: string;
  summary: string;
  explanation: string;
  polesInLHP: number;
  polesOnAxis: number;
  polesInRHP: number;
  dominantPoles: ComplexNumber[];
  routhArray: { power: string; values: number[] }[];
  routhSignChanges: number;
  dcGain: number | null;
  zeta?: number;
  wn?: number;
  ts?: number;
  tp?: number;
  mp?: number;
  tr?: number;
}

// Format complex number as string
export function formatComplex(c: ComplexNumber, precision = 3): string {
  const r = Math.abs(c.real) < 1e-5 ? 0 : Number(c.real.toFixed(precision));
  const i = Math.abs(c.imag) < 1e-5 ? 0 : Number(c.imag.toFixed(precision));

  if (i === 0) return `${r}`;
  if (r === 0) return `${i < 0 ? '-' : ''}j${Math.abs(i)}`;
  return `${r} ${i < 0 ? '-' : '+'} j${Math.abs(i)}`;
}

// Clean and parse polynomial string like "s^2 + 2s + 5" or "1, 2, 5" or "[1 2 5]"
export function parsePolynomial(input: string): number[] {
  if (!input || !input.trim()) return [1];

  const trimmed = input.trim();

  // If array format: "[1, 2, 5]" or "1, 2, 5" or "1 2 5"
  if (
    trimmed.startsWith('[') ||
    trimmed.includes(',') ||
    /^[0-9.\-\s]+$/.test(trimmed)
  ) {
    const cleaned = trimmed.replace(/[\[\]]/g, '').trim();
    const parts = cleaned.split(/[\s,]+/).map((v) => parseFloat(v));
    const valid = parts.filter((n) => !isNaN(n));
    return valid.length > 0 ? valid : [1];
  }

  // Parse algebraic expression with variable s, e.g. "2s^3 + 4s^2 - 5s + 10"
  try {
    let str = trimmed.toLowerCase().replace(/\s+/g, '');
    str = str.replace(/-/g, '+-');
    if (str.startsWith('+')) str = str.substring(1);
    const tokens = str.split('+').filter((t) => t.length > 0);

    const termMap: { [pow: number]: number } = {};
    let maxDegree = 0;

    for (const token of tokens) {
      let coeff = 1;
      let power = 0;

      if (token.includes('s')) {
        const [coeffPart, powPart] = token.split('s');
        if (coeffPart === '' || coeffPart === '+') coeff = 1;
        else if (coeffPart === '-') coeff = -1;
        else coeff = parseFloat(coeffPart);

        if (powPart === undefined || powPart === '') {
          power = 1;
        } else if (powPart.startsWith('^')) {
          power = parseInt(powPart.substring(1), 10);
        } else {
          power = 1;
        }
      } else {
        coeff = parseFloat(token);
        power = 0;
      }

      if (!isNaN(coeff) && !isNaN(power)) {
        termMap[power] = (termMap[power] || 0) + coeff;
        if (power > maxDegree) maxDegree = power;
      }
    }

    const coeffs: number[] = [];
    for (let p = maxDegree; p >= 0; p--) {
      coeffs.push(termMap[p] || 0);
    }

    // Strip leading zeros
    while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-9) {
      coeffs.shift();
    }

    return coeffs.length > 0 ? coeffs : [1];
  } catch {
    return [1];
  }
}

// Convert coefficients to LaTeX polynomial string
export function polyToLatex(coeffs: number[], variable = 's'): string {
  if (!coeffs || coeffs.length === 0) return '0';
  const degree = coeffs.length - 1;
  const terms: string[] = [];

  for (let i = 0; i <= degree; i++) {
    const c = coeffs[i];
    const power = degree - i;
    if (Math.abs(c) < 1e-6) continue;

    const absC = Math.abs(c);
    const sign = c < 0 ? '-' : (terms.length > 0 ? '+' : '');
    const cStr = absC === 1 && power > 0 ? '' : absC.toFixed(absC % 1 === 0 ? 0 : 2);

    if (power === 0) {
      terms.push(`${sign} ${absC.toFixed(absC % 1 === 0 ? 0 : 2)}`);
    } else if (power === 1) {
      terms.push(`${sign} ${cStr}${variable}`);
    } else {
      terms.push(`${sign} ${cStr}${variable}^{${power}}`);
    }
  }

  return terms.length > 0 ? terms.join(' ').trim() : '0';
}

// Complex arithmetic helpers
function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

function complexSub(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}

function complexMul(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

function complexDiv(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.real * b.real + b.imag * b.imag;
  if (denom === 0) return { real: 0, imag: 0 };
  return {
    real: (a.real * b.real + a.imag * b.imag) / denom,
    imag: (a.imag * b.real - a.real * b.imag) / denom,
  };
}

// Evaluate polynomial at complex point s
function evalPolyComplex(coeffs: number[], s: ComplexNumber): ComplexNumber {
  let res: ComplexNumber = { real: coeffs[0], imag: 0 };
  for (let i = 1; i < coeffs.length; i++) {
    res = complexAdd(complexMul(res, s), { real: coeffs[i], imag: 0 });
  }
  return res;
}

// Find roots of polynomial using exact solutions for deg <= 2 and Durand-Kerner algorithm for deg >= 3
export function findRoots(rawCoeffs: number[]): ComplexNumber[] {
  const coeffs = [...rawCoeffs];
  // Remove leading zeros
  while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-9) {
    coeffs.shift();
  }

  const degree = coeffs.length - 1;
  if (degree <= 0) return [];

  // Normalize polynomial so leading coeff is 1
  const a0 = coeffs[0];
  const normalized = coeffs.map((c) => c / a0);

  // Degree 1: s + b = 0 => s = -b
  if (degree === 1) {
    return [{ real: -normalized[1], imag: 0 }];
  }

  // Degree 2: s^2 + b*s + c = 0
  if (degree === 2) {
    const b = normalized[1];
    const c = normalized[2];
    const disc = b * b - 4 * c;

    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      return [
        { real: (-b + sqrtDisc) / 2, imag: 0 },
        { real: (-b - sqrtDisc) / 2, imag: 0 },
      ];
    } else {
      const sqrtDisc = Math.sqrt(-disc);
      return [
        { real: -b / 2, imag: sqrtDisc / 2 },
        { real: -b / 2, imag: -sqrtDisc / 2 },
      ];
    }
  }

  // Degree >= 3: Durand-Kerner (Weierstrass) method
  const roots: ComplexNumber[] = [];
  const radius = 1 + Math.max(...normalized.slice(1).map((c) => Math.abs(c)));

  // Initial root guesses on a complex circle
  for (let i = 0; i < degree; i++) {
    const theta = (2 * Math.PI * i) / degree + 0.4;
    const r = Math.pow(radius, (i + 1) / degree);
    roots.push({
      real: r * Math.cos(theta),
      imag: r * Math.sin(theta),
    });
  }

  const maxIter = 100;
  const tol = 1e-10;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let i = 0; i < degree; i++) {
      const pVal = evalPolyComplex(normalized, roots[i]);
      let denom: ComplexNumber = { real: 1, imag: 0 };

      for (let j = 0; j < degree; j++) {
        if (i !== j) {
          denom = complexMul(denom, complexSub(roots[i], roots[j]));
        }
      }

      const delta = complexDiv(pVal, denom);
      roots[i] = complexSub(roots[i], delta);

      const change = Math.hypot(delta.real, delta.imag);
      if (change > maxChange) maxChange = change;
    }

    if (maxChange < tol) break;
  }

  // Polish roots: clean small imaginary parts and pair complex conjugates
  return roots.map((r) => {
    let real = Math.abs(r.real) < 1e-6 ? 0 : r.real;
    let imag = Math.abs(r.imag) < 1e-6 ? 0 : r.imag;
    return { real, imag };
  });
}

// Compute Routh-Hurwitz array
export function calculateRouthArray(
  denCoeffs: number[]
): { routhArray: { power: string; values: number[] }[]; signChanges: number } {
  const coeffs = [...denCoeffs];
  while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-9) coeffs.shift();

  const degree = coeffs.length - 1;
  if (degree <= 0) return { routhArray: [], signChanges: 0 };

  const numCols = Math.ceil((degree + 1) / 2);
  const table: number[][] = [];

  // Row 1 (s^n)
  const row0: number[] = [];
  for (let i = 0; i < coeffs.length; i += 2) {
    row0.push(coeffs[i]);
  }
  while (row0.length < numCols) row0.push(0);
  table.push(row0);

  // Row 2 (s^(n-1))
  const row1: number[] = [];
  for (let i = 1; i < coeffs.length; i += 2) {
    row1.push(coeffs[i]);
  }
  while (row1.length < numCols) row1.push(0);
  table.push(row1);

  // Subsequent rows
  for (let r = 2; r <= degree; r++) {
    const prev1 = table[r - 1];
    const prev2 = table[r - 2];
    const pivot = prev1[0];

    const newRow: number[] = [];

    if (Math.abs(pivot) < 1e-9) {
      // Numerical epsilon replacement for zero pivot
      const eps = 1e-5;
      prev1[0] = eps;
    }

    for (let c = 0; c < numCols - 1; c++) {
      const a = prev2[0];
      const b = prev2[c + 1] || 0;
      const c1 = prev1[0];
      const d = prev1[c + 1] || 0;

      const val = (c1 * b - a * d) / c1;
      newRow.push(Math.abs(val) < 1e-8 ? 0 : val);
    }
    newRow.push(0);
    table.push(newRow);
  }

  // Count sign changes in first column
  let signChanges = 0;
  for (let i = 0; i < table.length - 1; i++) {
    const val1 = table[i][0];
    const val2 = table[i + 1][0];
    if (val1 * val2 < 0) {
      signChanges++;
    }
  }

  const routhArray = table.map((row, idx) => ({
    power: `s^{${degree - idx}}`,
    values: row.slice(0, Math.max(1, Math.ceil((degree + 1 - idx) / 2))),
  }));

  return { routhArray, signChanges };
}

// Full stability report
export function analyzeStability(
  numCoeffs: number[],
  denCoeffs: number[]
): StabilityReport {
  const poles = findRoots(denCoeffs);
  const zeros = findRoots(numCoeffs);

  let polesInLHP = 0;
  let polesOnAxis = 0;
  let polesInRHP = 0;

  for (const p of poles) {
    if (p.real < -1e-5) {
      polesInLHP++;
    } else if (p.real > 1e-5) {
      polesInRHP++;
    } else {
      polesOnAxis++;
    }
  }

  // Check multiple poles on jw axis
  let hasMultipleAxisPoles = false;
  if (polesOnAxis > 1) {
    for (let i = 0; i < poles.length; i++) {
      for (let j = i + 1; j < poles.length; j++) {
        if (
          Math.abs(poles[i].real) < 1e-5 &&
          Math.abs(poles[j].real) < 1e-5 &&
          Math.abs(poles[i].imag - poles[j].imag) < 1e-4
        ) {
          hasMultipleAxisPoles = true;
          break;
        }
      }
    }
  }

  let status: 'stable' | 'marginally_stable' | 'unstable' = 'stable';
  let title = 'Sistema Asintóticamente Estable';
  let summary = 'Todos los polos están estrictamente en el semiplano izquierdo (LHP).';
  let explanation =
    'El sistema convergerá a un valor finito de estado estacionario ante cualquier entrada acotada (BIBO Stable). Las respuestas libres decrecen exponencialmente.';

  if (polesInRHP > 0 || hasMultipleAxisPoles) {
    status = 'unstable';
    title = 'Sistema Inestable';
    summary = `${polesInRHP} polo(s) en el semiplano derecho (RHP)${
      hasMultipleAxisPoles ? ' o polos múltiples en el eje imaginario' : ''
    }.`;
    explanation =
      'La respuesta temporal contiene términos exponenciales crecientes que divergen al infinito con el tiempo. El sistema no puede operar en lazo abierto sin control estabilizante.';
  } else if (polesOnAxis > 0) {
    status = 'marginally_stable';
    title = 'Sistema Marginalmente Estable (Oscilatorio)';
    summary = `${polesOnAxis} polo(s) simples en el eje imaginario jω sin polos en el RHP.`;
    explanation =
      'La respuesta natural presenta oscilaciones sinusoidales sostenidas de amplitud constante (amplitud no crece ni decae a cero). Ante una entrada senoidal en resonancia, la salida diverge.';
  }

  // Routh-Hurwitz
  const { routhArray, signChanges } = calculateRouthArray(denCoeffs);

  // Dominant poles (poles with real part closest to imaginary axis)
  const sortedPoles = [...poles].sort((a, b) => b.real - a.real);
  const dominantPoles = sortedPoles.slice(0, 2);

  // Calculate DC gain: G(0) = num(0) / den(0)
  const num0 = numCoeffs[numCoeffs.length - 1] || 0;
  const den0 = denCoeffs[denCoeffs.length - 1] || 0;
  const dcGain = Math.abs(den0) > 1e-9 ? num0 / den0 : null;

  // Transient parameters for dominant pair if stable and complex
  let zeta: number | undefined;
  let wn: number | undefined;
  let ts: number | undefined;
  let tp: number | undefined;
  let mp: number | undefined;
  let tr: number | undefined;

  if (dominantPoles.length > 0) {
    const p = dominantPoles[0];
    wn = Math.hypot(p.real, p.imag);
    if (wn > 1e-6) {
      zeta = -p.real / wn;
      if (zeta > 0 && zeta < 1) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        ts = 4 / (zeta * wn);
        tp = Math.PI / wd;
        mp = Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) * 100;
        tr = 1.8 / wn;
      } else if (zeta >= 1) {
        ts = 5.8 / wn;
        tr = 2.2 / wn;
        mp = 0;
      }
    }
  }

  return {
    status,
    title,
    summary,
    explanation,
    polesInLHP,
    polesOnAxis,
    polesInRHP,
    dominantPoles,
    routhArray,
    routhSignChanges: signChanges,
    dcGain,
    zeta,
    wn,
    ts,
    tp,
    mp,
    tr,
  };
}

// Generate numerical Step Response time-series y(t)
export function simulateStepResponse(
  numCoeffs: number[],
  denCoeffs: number[],
  tEnd = 10,
  points = 300
): { t: number; y: number }[] {
  const poles = findRoots(denCoeffs);
  const zeros = findRoots(numCoeffs);

  // Check if unstable with huge exponent to prevent NaN/Infinity blowup in rendering
  const maxReal = Math.max(...poles.map((p) => p.real), 0);
  const adjustedTEnd = maxReal > 1.5 ? Math.min(tEnd, 4) : tEnd;

  // Convert transfer function to State-Space (Controllable Canonical Form) for exact integration
  const n = denCoeffs.length - 1;
  if (n <= 0) return [];

  const a0 = denCoeffs[0];
  const a = denCoeffs.map((c) => c / a0);
  const b = numCoeffs.map((c) => c / a0);

  // Pad b with leading zeros to match length n+1
  while (b.length < n + 1) {
    b.unshift(0);
  }

  // State vector x of dimension n
  let x = new Array(n).fill(0);
  const dt = adjustedTEnd / points;
  const result: { t: number; y: number }[] = [];

  // Matrix A and B for controllable canonical form
  // x_dot = A*x + B*u, y = C*x + D*u
  // For standard strict proper TF (D = b[0] if degree num == den, else 0)
  const dTerm = b[0];
  const cCoeffs: number[] = [];
  for (let i = 1; i <= n; i++) {
    cCoeffs.push(b[i] - dTerm * a[i]);
  }

  // Runge-Kutta 4th order integration
  const derivatives = (state: number[], u: number): number[] => {
    const xDot = new Array(n).fill(0);
    // For i = 0 to n-2: xDot[i] = state[i+1]
    for (let i = 0; i < n - 1; i++) {
      xDot[i] = state[i + 1];
    }
    // Last row: xDot[n-1] = -a_n*x_0 - a_{n-1}*x_1 ... + u
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += a[n - i] * state[i];
    }
    xDot[n - 1] = -sum + u;
    return xDot;
  };

  for (let step = 0; step <= points; step++) {
    const t = step * dt;
    const u = 1.0; // Unit step input

    // Compute output y = C*x + D*u
    let y = dTerm * u;
    for (let i = 0; i < n; i++) {
      y += cCoeffs[n - 1 - i] * x[i];
    }

    // Clamp huge values if unstable for clean chart rendering
    if (isNaN(y)) y = 0;
    if (y > 100) y = 100;
    if (y < -100) y = -100;

    result.push({ t: Number(t.toFixed(3)), y: Number(y.toFixed(4)) });

    // RK4 step
    const k1 = derivatives(x, u);
    const x2 = x.map((xi, idx) => xi + 0.5 * dt * k1[idx]);
    const k2 = derivatives(x2, u);
    const x3 = x.map((xi, idx) => xi + 0.5 * dt * k2[idx]);
    const k3 = derivatives(x3, u);
    const x4 = x.map((xi, idx) => xi + dt * k3[idx]);
    const k4 = derivatives(x4, u);

    x = x.map((xi, idx) => xi + (dt / 6) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx]));
  }

  return result;
}
