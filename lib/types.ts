export type ProfileType =
  | "student"
  | "early-career"
  | "professional"
  | "creative"
  | "freelancer"
  | "career-changer";

export type ParsedCv = {
  text: string;
  wordCount: number;
  parseConfidence: "high" | "medium" | "low";
  warnings: string[];
};

export type CategoryScore = {
  name: string;
  score: number;
  summary: string;
  whatThisMeans: string;
  strengths: string[];
  improvements: FeedbackItem[];
  checks: CheckResult[];
};

export type AnalysisResult = {
  reportId: string;
  overallScore: number;
  profileType: ProfileType;
  profileLabel: string;
  summary: string;
  parseWarning?: string;
  categories: CategoryScore[];
  suggestions: FeedbackItem[];
  strengths: string[];
  generatedAt: string;
  reportPaid?: boolean;
};

export type RubricCheck = {
  label: string;
  weight: number;
  passes: (context: RubricContext) => boolean;
  strength: string;
  feedback: FeedbackItem;
};

export type RubricCategory = {
  name: string;
  description: string;
  checks: RubricCheck[];
};

export type FeedbackItem = {
  title: string;
  detail: string;
  action: string;
  example?: string;
  priority: "high" | "medium" | "low";
};

export type CheckResult = {
  label: string;
  passed: boolean;
  weight: number;
};

export type RubricContext = {
  text: string;
  lowerText: string;
  words: string[];
  jobDescription?: string;
  parseConfidence: ParsedCv["parseConfidence"];
  profileType: ProfileType;
};
