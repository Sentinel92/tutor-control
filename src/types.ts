export interface Topic {
  id: string;
  unitNumber: number;
  title: string;
  shortDescription: string;
  icon: string;
  badge: string;
  keyFormulas: string[];
  suggestedPrompts: string[];
  theorySummary: string;
  matlabSnippet: string;
  simulinkBlocks: string[];
  challengeQuestion: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  topicTag?: string;
}

export interface ParsedStepResponse {
  step1: string; // Intuicion
  step2: string; // Desarrollo matematico
  step3: string; // Representacion matricial / G(s)
  step4: string; // Matlab y simulink
  step5: string; // Pregunta de verificacion
  rawText?: string;
  hasAllSteps: boolean;
}

export interface VerificationEvaluation {
  isCorrect: boolean | 'partial';
  feedback: string;
  correctSolution: string;
}

export interface Flashcard {
  id: string;
  topic: string;
  category: string;
  question: string;
  mathFormula?: string;
  answer: string;
  explanation: string;
}

