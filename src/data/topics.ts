import { Topic } from '../types';

export const TOPICS: Topic[] = [
  {
    id: 'unidad-1-fundamentos-linealidad',
    unitNumber: 1,
    title: 'Sistemas Dinámicos, Linealidad y Lazos de Control',
    shortDescription: 'Principio de superposición (aditividad y homogeneidad), clasificación LTI y lazos abiertos vs. cerrados.',
    icon: 'Activity',
    badge: 'Fundamentos',
    keyFormulas: [
      'f(a x_1 + b x_2) = a f(x_1) + b f(x_2)',
      'e(t) = r(t) - y(t)',
      'T(s) = \\frac{G(s)}{1 + G(s)H(s)}'
    ],
    theorySummary: 'Un sistema es dinámico si su salida depende de entradas presentes y pasadas (posee memoria/energía almacenada). Es lineal si cumple el principio de superposición: homogeneidad f(kx) = kf(x) y aditividad f(x1+x2) = f(x1)+f(x2). En un lazo cerrado con retroalimentación negativa, el controlador actúa sobre el error e(t) para estabilizar la planta.',
    suggestedPrompts: [
      '¿Cómo demuestro formalmente si el sistema y(t) = 3*x(t) + 5 es lineal o no lineal?',
      'Explica la diferencia entre un lazo de control abierto y cerrado en el control de temperatura de un horno.',
      '¿Qué significa que un sistema sea LTI (Lineal e Invariante en el Tiempo) y por qué permite usar Laplace?'
    ],
    matlabSnippet: `% Verificación de linealidad y lazo cerrado
s = tf('s');
G = 5 / (2*s + 1);      % Planta de 1er orden
H = 1;                  % Sensor unitario
T = feedback(G, H);     % Lazo cerrado unitario: G/(1+G*H)
figure;
step(G, 'r--', T, 'b-');
legend('Lazo Abierto G(s)', 'Lazo Cerrado T(s)');
grid on; title('Comparación Lazo Abierto vs Lazo Cerrado');`,
    simulinkBlocks: ['Step (Entrada)', 'Sum (Comparador +/-)', 'Gain (Controlador P)', 'Transfer Fcn (Planta)', 'Scope (Salida)'],
    challengeQuestion: 'Dado el sistema $y(t) = t \\cdot x(t)$, ¿es lineal? ¿es invariante en el tiempo? Justifica matemáticamente cada propiedad.'
  },
  {
    id: 'unidad-2-laplace-transferencia',
    unitNumber: 2,
    title: 'Transformada de Laplace y Funciones de Transferencia',
    shortDescription: 'Dominio de Laplace, cálculo de G(s), polos, ceros, teorema de valor final y fracciones parciales.',
    icon: 'GitCommit',
    badge: 'Dominio Complejo s',
    keyFormulas: [
      '\\mathcal{L}\\{f(t)\\} = F(s) = \\int_{0}^{\\infty} f(t) e^{-st} dt',
      '\\mathcal{L}\\{\\dot{x}(t)\\} = sX(s) - x(0)',
      'G(s) = \\frac{Y(s)}{U(s)} = \\frac{b_m s^m + \\dots + b_0}{a_n s^n + \\dots + a_0}',
      'y_{ss} = \\lim_{t \\to \\infty} y(t) = \\lim_{s \\to 0} s Y(s)'
    ],
    theorySummary: 'La función de transferencia G(s) representa la relación entrada-salida de un sistema LTI en el plano complejo s, asumiendo condiciones iniciales nulas. Las raíces del denominador son los POLOS (definen la estabilidad y dinámica temporal natural), mientras que las raíces del numerador son los CEROS (modifican amplitudes y fase).',
    suggestedPrompts: [
      'Calcula la respuesta temporal y(t) paso a paso mediante fracciones parciales para Y(s) = (2s+3) / (s^2 + 5s + 6) con entrada escalón.',
      'Explica la relación entre la posición de los polos en el plano complejo s y el tipo de respuesta (subamortiguada, sobreamortiguada, inestable).',
      'Aplica el Teorema del Valor Final para encontrar el valor estacionario de G(s) = 10 / (s^2 + 3s + 2) ante una entrada escalón unitario.'
    ],
    matlabSnippet: `% Análisis de Función de Transferencia, Polos y Ceros
num = [2, 3];
den = [1, 5, 6];
G = tf(num, den);
polos = pole(G)
ceros = zero(G)
figure;
pzmap(G); grid on; title('Mapa de Polos y Ceros');
figure;
step(G); grid on; title('Respuesta al Escalón Unitario');`,
    simulinkBlocks: ['Transfer Fcn [Numerator: [2 3], Denominator: [1 5 6]]', 'Step', 'Scope', 'Pole-Zero Map tool'],
    challengeQuestion: 'Encuentra los polos de $G(s) = \\frac{10}{s^2 + 4s + 20}$. ¿El sistema es estable? ¿Es subamortiguado, críticamente amortiguado o sobreamortiguado?'
  },
  {
    id: 'unidad-3-sistemas-electricos-rlc',
    unitNumber: 3,
    title: 'Modelamiento de Circuitos Eléctricos y RLC (LVK)',
    shortDescription: 'Leyes de Kirchhoff (LVK/LCK), circuitos RLC serie y paralelo, impedancias complejas y Op-Amps.',
    icon: 'Zap',
    badge: 'Electromagnetismo',
    keyFormulas: [
      'v_R(t) = R \\cdot i(t) \\quad \\Rightarrow \\quad V_R(s) = R I(s)',
      'v_L(t) = L \\frac{di(t)}{dt} \\quad \\Rightarrow \\quad V_L(s) = sL I(s)',
      'v_C(t) = \\frac{1}{C} \\int i(t) dt \\quad \\Rightarrow \\quad V_C(s) = \\frac{1}{sC} I(s)',
      'G(s) = \\frac{V_C(s)}{V_{in}(s)} = \\frac{1}{L C s^2 + R C s + 1}'
    ],
    theorySummary: 'En un circuito RLC serie, la Ley de Voltajes de Kirchhoff (LVK) establece que la suma de caídas de tensión es igual al voltaje de entrada: v_in(t) = v_R(t) + v_L(t) + v_C(t). Al sustituir las relaciones constitutivas e integrar respecto a la carga q(t) o voltaje en el capacitor v_C(t), obtenemos una ecuación diferencial de segundo orden estándar.',
    suggestedPrompts: [
      'Modela un circuito RLC serie con LVK tomando como entrada v_in(t) y como salida el voltaje en el capacitor v_C(t).',
      'Obtén la función de transferencia de un circuito Op-Amp integrador con resistencia R y capacitor C en la retroalimentación.',
      'Calcula la respuesta de corriente i(t) en un circuito RLC serie con R=4 ohm, L=1 H, C=0.25 F ante escalón de 12V.'
    ],
    matlabSnippet: `% Simulación Circuito RLC Serie
R = 4;      % Ohmios
L = 1;      % Henrios
C = 0.25;   % Faradios
num = [1];
den = [L*C, R*C, 1];
G_rlc = tf(num, den);
figure;
step(12 * G_rlc); grid on;
title('Respuesta de Voltaje V_C(t) para V_{in}=12V');
xlabel('Tiempo (s)'); ylabel('Voltaje V_c (V)');`,
    simulinkBlocks: ['Simscape / Electrical Specialised Elements: Series RLC Branch, Voltage Source, Voltage Measurement', 'o Bloque Transfer Fcn continuo'],
    challengeQuestion: 'Si en un circuito RLC serie $R = 2\\,\\Omega$, $L = 0.5\\,\\text{H}$, $C = 0.5\\,\\text{F}$, ¿cuál es el factor de amortiguamiento $\\zeta$ y la frecuencia natural $\\omega_n$?'
  },
  {
    id: 'unidad-4-sistemas-mecanicos-traslacionales',
    unitNumber: 4,
    title: 'Sistemas Mecánicos Traslacionales (Leyes de Newton)',
    shortDescription: 'Sistemas masa-resorte-amortiguador (m-b-k), paracaidistas, fricción viscosa y masas acopladas.',
    icon: 'Layers',
    badge: 'Mecánica Clásica',
    keyFormulas: [
      '\\sum F = m \\cdot a = m \\ddot{x}(t)',
      'F_{\\text{resorte}} = k \\cdot x(t) \\quad \\Rightarrow \\quad K X(s)',
      'F_{\\text{amortiguador}} = b \\cdot \\dot{x}(t) \\quad \\Rightarrow \\quad b s X(s)',
      'G(s) = \\frac{X(s)}{F(s)} = \\frac{1}{m s^2 + b s + k}'
    ],
    theorySummary: 'Por la 2da Ley de Newton, la aceleración de una masa m responde al balance de fuerzas aplicadas menos las fuerzas restauradoras del resorte (k*x) y disipativas del amortiguador viscoso (b*dx/dt). En sistemas de múltiples masas acopladas, se aísla cada cuerpo con su Diagrama de Cuerpo Libre (DCL) para generar un sistema de ecuaciones diferenciales acopladas.',
    suggestedPrompts: [
      'Modela un sistema masa-resorte-amortiguador horizontal con entrada fuerza F(t) y salida posición x(t).',
      'Modela el problema del paracaidista en caída libre considerando resistencia del aire proporcional a la velocidad: F_d = b*v(t).',
      'Modela un sistema de dos masas acopladas m1 y m2 unidas por resortes k1, k2 y amortiguador b.'
    ],
    matlabSnippet: `% Simulación Masa-Resorte-Amortiguador
m = 2;    % Masa (kg)
b = 3;    % Amortiguamiento (N*s/m)
k = 20;   % Rigidez resorte (N/m)
G_mec = tf(1, [m, b, k]);
t = 0:0.01:5;
[y, t_out] = step(G_mec, t);
figure;
plot(t_out, y, 'LineWidth', 2, 'Color', [0.2 0.4 0.8]);
grid on; title('Respuesta al Escalón x(t) del Sistema Masa-Resorte');
xlabel('Tiempo (s)'); ylabel('Posición x(t) [m]');`,
    simulinkBlocks: ['Force Source (Step)', 'Gain 1/m', 'Integrator 1 (Velocidad)', 'Integrator 2 (Posición)', 'Gain b (Fricción)', 'Gain k (Resorte)', 'Sum'],
    challengeQuestion: 'Para un sistema $m=1\\,\\text{kg}, k=25\\,\\text{N/m}$, ¿qué valor exacto debe tener $b$ para lograr un amortiguamiento crítico ($\\zeta=1$)?'
  },
  {
    id: 'unidad-5-sistemas-mecanicos-rotacionales',
    unitNumber: 5,
    title: 'Sistemas Rotacionales, Engranajes y Motores DC',
    shortDescription: 'Momento de inercia J, fricción rotacional B, trenes de engranajes N1/N2, torques y modelo electromecánico de Motor DC.',
    icon: 'Disc',
    badge: 'Rotación y Acoples',
    keyFormulas: [
      '\\sum T = J \\ddot{\\theta}(t) + B \\dot{\\theta}(t) + K \\theta(t)',
      '\\frac{\\theta_1}{\\theta_2} = \\frac{N_2}{N_1} = \\frac{T_2}{T_1}',
      'J_{\\text{reflejado}} = J_1 + J_2 \\left(\\frac{N_1}{N_2}\\right)^2',
      'e_b(t) = K_b \\dot{\\theta}(t), \\quad T_m(t) = K_t i_a(t)',
      'G_{\\text{motor}}(s) = \\frac{\\Omega(s)}{V_a(s)} = \\frac{K_t}{(R_a + s L_a)(J s + B) + K_t K_b}'
    ],
    theorySummary: 'En sistemas rotacionales, el torque T genera una aceleración angular sobre la inercia J. Los engranajes permiten transformar velocidad y torque según la relación de dientes N1/N2, reflejando inercias y fricciones multiplicadas por el cuadrado de la relación de transmisión. El motor DC acopla las ecuaciones eléctricas de armadura con las rotacionales mecánicas mediante las constantes electromecánicas Kt y Kb.',
    suggestedPrompts: [
      'Modela un tren de 2 engranajes con inercia J1 en el eje motor e inercia J2 en el eje de carga.',
      'Desarrolla el modelo completo de un motor DC controlado por armadura, desde las ecuaciones de Kirchhoff y Newton hasta G(s) = Omega(s)/Va(s).',
      '¿Cómo se refleja la inercia de una carga J_L a través de una caja reductora con relación N1/N2 = 1/10?'
    ],
    matlabSnippet: `% Modelo y Respuesta de Motor DC controlado por armadura
Ra = 2.0;    % Resistencia armadura (Ohms)
La = 0.5;    % Inductancia armadura (Henrios)
Kt = 0.1;    % Constante de torque (N*m/A)
Kb = 0.1;    % Constante contraelectromotriz (V*s/rad)
J = 0.02;    % Inercia rotor (kg*m^2)
B = 0.2;     % Fricción viscosa (N*m*s/rad)

num_motor = Kt;
den_motor = conv([La Ra], [J B]) + [0 0 Kt*Kb];
G_motor = tf(num_motor, den_motor);

figure;
step(G_motor); grid on;
title('Velocidad Angular \omega(t) del Motor DC ante 1V de entrada');
xlabel('Tiempo (s)'); ylabel('\omega (rad/s)');`,
    simulinkBlocks: ['Voltage Step', 'Sum (Va - Vb)', 'Transfer Fcn 1/(La*s + Ra)', 'Gain Kt', 'Sum (Tm - Tload)', 'Transfer Fcn 1/(J*s + B)', 'Gain Kb (Retroalimentación FEM)'],
    challengeQuestion: 'Si despreciamos la inductancia de armadura ($L_a \\approx 0$), ¿a qué orden se reduce la función de transferencia del motor DC? Escribe la expresión simplificada.'
  },
  {
    id: 'unidad-6-espacio-de-estados',
    unitNumber: 6,
    title: 'Representación en Espacio de Estados (A, B, C, D)',
    shortDescription: 'Vectores de estado, formulación matricial dx/dt = Ax + Bu, y = Cx + Du, formas canónicas y conversión a G(s).',
    icon: 'Grid',
    badge: 'Matricial Multivariable',
    keyFormulas: [
      '\\dot{\\mathbf{x}}(t) = \\mathbf{A}\\mathbf{x}(t) + \\mathbf{B}u(t)',
      'y(t) = \\mathbf{C}\\mathbf{x}(t) + \\mathbf{D}u(t)',
      'G(s) = \\mathbf{C}(s\\mathbf{I} - \\mathbf{A})^{-1}\\mathbf{B} + \\mathbf{D}',
      '\\Phi(t) = \\mathcal{L}^{-1}\\{(s\\mathbf{I} - \\mathbf{A})^{-1}\\} = e^{\\mathbf{A}t}'
    ],
    theorySummary: 'El Espacio de Estados es una representación en el dominio del tiempo basada en variables de estado que almacenan la energía del sistema. Permite modelar sistemas MIMO (múltiples entradas y salidas), no lineales y variantes en el tiempo. La matriz A describe la dinámica interna, B la influencia de la entrada, C la lectura de las salidas y D la transmisión directa.',
    suggestedPrompts: [
      'Convierte la función de transferencia G(s) = (2s + 5)/(s^2 + 4s + 13) a Forma Canónica Controlable y Observable.',
      'Obtén la representación en espacio de estados para el sistema masa-resorte-amortiguador eligiendo x1=posición y x2=velocidad.',
      'Calcula analíticamente G(s) a partir de las matrices A = [0 1; -6 -5], B = [0; 1], C = [1 0], D = 0 mediante C*(sI-A)^(-1)*B + D.'
    ],
    matlabSnippet: `% Conversión Función de Transferencia a Espacio de Estados
num = [2, 5];
den = [1, 4, 13];
[A, B, C, D] = tf2ss(num, den);
sys_ss = ss(A, B, C, D);

disp('Matriz A:'); disp(A);
disp('Matriz B:'); disp(B);
disp('Matriz C:'); disp(C);
disp('Matriz D:'); disp(D);

% Autovalores de A (Polos del sistema)
autovalores = eig(A)
figure;
step(sys_ss); grid on; title('Respuesta al Escalón desde Espacio de Estados');`,
    simulinkBlocks: ['Bloque "State-Space" [Parámetros: A, B, C, D, Initial conditions: x0]', 'Step', 'Scope'],
    challengeQuestion: 'Dada la matriz $\\mathbf{A} = \\begin{bmatrix} 0 & 1 \\\\ -8 & -6 \\end{bmatrix}$, calcula la ecuación característica $\\det(s\\mathbf{I}-\\mathbf{A})=0$ y determina si el sistema es asintóticamente estable.'
  },
  {
    id: 'unidad-7-matlab-simulink-master',
    unitNumber: 7,
    title: 'Simulación y Programación en MATLAB & Simulink',
    shortDescription: 'Comandos esenciales: tf, step, impulse, tf2ss, ode45, dsolve, laplace, ilaplace, bode, rlocus y diagramas de bloques.',
    icon: 'Terminal',
    badge: 'Software & Simulación',
    keyFormulas: [
      'sys = tf(num, den); \\quad [y, t] = step(sys);',
      '[t, x] = ode45(@(t,x) odefun(t,x), tspan, x0);',
      'F = laplace(f, t, s); \\quad f = ilaplace(F, s, t);',
      'sys_cl = feedback(G * C, H);'
    ],
    theorySummary: 'MATLAB y Simulink son el estándar de la industria y la academia para la verificación de modelos dinámicos. MATLAB permite el análisis analítico y numérico mediante scripts reproducibles, mientras que Simulink ofrece simulación no lineal visual mediante diagramas de flujo de señales con integradores y bloques funcionales.',
    suggestedPrompts: [
      'Escribe un script completo de MATLAB para resolver una ecuación diferencial no lineal con ode45 y graficar sus estados.',
      'Muestra cómo calcular la transformada inversa de Laplace analíticamente en MATLAB con el Symbolic Math Toolbox (ilaplace).',
      'Explica paso a paso cómo armar en Simulink el lazo cerrado de un control de posición con ganancia K_p.'
    ],
    matlabSnippet: `% Script Maestro de Simulación con ode45 y Control Toolbox
clc; clear; close all;

% 1. Definición Simbólica y Analítica
syms s t
F_s = (3*s + 2) / (s^2 + 4*s + 20);
f_t = ilaplace(F_s, s, t);
fprintf('Solución Analítica f(t) = %s\\n', char(f_t));

% 2. Modelo Numérico LTI
G = tf([3 2], [1 4 20]);
[A, B, C, D] = tf2ss([3 2], [1 4 20]);

% 3. Gráficas de Desempeño
figure('Position', [100, 100, 900, 400]);
subplot(1, 2, 1);
step(G); grid on; title('Respuesta al Escalón');
subplot(1, 2, 2);
pzmap(G); grid on; title('Plano s: Polos y Ceros');`,
    simulinkBlocks: ['Sources > Step', 'Math Operations > Sum', 'Continuous > Transfer Fcn', 'Sinks > Scope', 'Simulink > Dashboard > Display Gauge'],
    challengeQuestion: '¿Cuál es la diferencia fundamental entre resolver una ecuación diferencial con dsolve y con ode45 en MATLAB?'
  }
];

export const CHEAT_SHEET_ITEMS = {
  laplaceTable: [
    { time: '\\delta(t)', sDomain: '1', name: 'Impulso Unitario' },
    { time: 'u(t)', sDomain: '\\frac{1}{s}', name: 'Escalón Unitario' },
    { time: 't \\cdot u(t)', sDomain: '\\frac{1}{s^2}', name: 'Rampa Unitaria' },
    { time: 't^n \\cdot u(t)', sDomain: '\\frac{n!}{s^{n+1}}', name: 'Polinomio' },
    { time: 'e^{-at} u(t)', sDomain: '\\frac{1}{s + a}', name: 'Exponencial' },
    { time: '\\sin(\\omega t) u(t)', sDomain: '\\frac{\\omega}{s^2 + \\omega^2}', name: 'Seno' },
    { time: '\\cos(\\omega t) u(t)', sDomain: '\\frac{s}{s^2 + \\omega^2}', name: 'Coseno' },
    { time: 'e^{-at}\\sin(\\omega t) u(t)', sDomain: '\\frac{\\omega}{(s+a)^2 + \\omega^2}', name: 'Seno Amortiguado' },
    { time: 'e^{-at}\\cos(\\omega t) u(t)', sDomain: '\\frac{s+a}{(s+a)^2 + \\omega^2}', name: 'Coseno Amortiguado' }
  ],
  properties: [
    { prop: 'Linealidad', expr: '\\mathcal{L}\\{a f_1(t) + b f_2(t)\\} = a F_1(s) + b F_2(s)' },
    { prop: '1° Derivada', expr: '\\mathcal{L}\\{\\dot{f}(t)\\} = s F(s) - f(0^-)' },
    { prop: '2° Derivada', expr: '\\mathcal{L}\\{\\ddot{f}(t)\\} = s^2 F(s) - s f(0^-) - \\dot{f}(0^-)' },
    { prop: 'Integral', expr: '\\mathcal{L}\\left\\{\\int_{0^-}^{t} f(\\tau) d\\tau\\right\\} = \\frac{F(s)}{s}' },
    { prop: 'Desplazamiento en s', expr: '\\mathcal{L}\\{e^{-at}f(t)\\} = F(s + a)' },
    { prop: 'Valor Final', expr: '\\lim_{t \\to \\infty} f(t) = \\lim_{s \\to 0} s F(s)' },
    { prop: 'Valor Inicial', expr: '\\lim_{t \\to 0^+} f(t) = \\lim_{s \\to \\infty} s F(s)' }
  ],
  secondOrderParams: [
    { param: 'Función Estándar', formula: 'G(s) = \\frac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}' },
    { param: 'Polos Complejos', formula: 's_{1,2} = -\\zeta\\omega_n \\pm j \\omega_n \\sqrt{1 - \\zeta^2} = -\\sigma \\pm j \\omega_d' },
    { param: 'Sobreimpulso Máximo (%Mp)', formula: 'M_p = e^{-\\frac{\\pi \\zeta}{\\sqrt{1-\\zeta^2}}} \\times 100\\%' },
    { param: 'Tiempo Pico (Tp)', formula: 'T_p = \\frac{\\pi}{\\omega_d} = \\frac{\\pi}{\\omega_n \\sqrt{1-\\zeta^2}}' },
    { param: 'Tiempo de Asentamiento (Ts 2%)', formula: 'T_s \\approx \\frac{4}{\\zeta \\omega_n} = \\frac{4}{\\sigma}' },
    { param: 'Tiempo de Subida (Tr 10%-90%)', formula: 'T_r \\approx \\frac{1.8}{\\omega_n}' }
  ]
};
