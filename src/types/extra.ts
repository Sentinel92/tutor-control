export interface MatlabReviewResult {
  status: 'ready' | 'needs_fixes' | 'critical_error';
  score: number;
  summary: string;
  syntaxErrors: string[];
  efficiencyTips: string[];
  controlObservations: string[];
  correctedCode: string;
  expectedSimulationOutput: string;
}

export interface UserProgressData {
  examDate?: string;
  examTopic?: string;
  completedTopicIds: string[];
  solvedChallengeIds: string[];
  notebookNotes?: string;
  lastUpdated?: string;
  quizScore?: {
    totalAnswered: number;
    totalCorrect: number;
  };
}
