export type Role = "admin" | "parent" | "student";
export type SubjectName = "영어" | "수학" | "국어" | "과학" | "역사" | string;
export type TaskType = "lecture" | "workbook" | "memorize" | "review" | "test" | "custom";
export type TaskStatus =
  | "scheduled"
  | "in_progress"
  | "submitted"
  | "ai_review"
  | "parent_review"
  | "approved"
  | "rejected"
  | "remediation"
  | "overdue";

export type EvidenceKind = "check" | "timer" | "photo" | "memo" | "audio" | "test";

export interface Family {
  id: string;
  name: string;
  plan: "beta" | "plus";
  timezone: string;
  suspended: boolean;
}

export interface Student {
  id: string;
  familyId: string;
  name: string;
  handle: string;
  grade: number;
  avatar: string;
  color: string;
  weeklyGoalMinutes: number;
  streak: number;
}

export interface CourseLesson {
  id: string;
  index: number;
  title: string;
  durationMinutes?: number;
  externalUrl?: string;
}

export interface Course {
  id: string;
  familyId: string;
  studentId: string;
  subject: SubjectName;
  title: string;
  teacher?: string;
  source: "mbest" | "manual";
  lessons: CourseLesson[];
  completedLessonCount: number;
}

export interface Workbook {
  id: string;
  familyId: string;
  studentId: string;
  subject: SubjectName;
  title: string;
  unit?: string;
  currentPage: number;
  endPage: number;
  targetDate: string;
}

export interface StudyTask {
  id: string;
  familyId: string;
  studentId: string;
  subject: SubjectName;
  type: TaskType;
  title: string;
  detail: string;
  scheduledDate: string;
  dueTime?: string;
  estimatedMinutes: number;
  status: TaskStatus;
  evidence: EvidenceKind[];
  sourceId?: string;
  score?: number;
  priority?: "normal" | "high";
}

export interface AIReview {
  summary: string;
  detectedPages: string[];
  completionPercent: number;
  blurScore: number;
  blankAreas: string[];
  flags: string[];
  confidence: number;
  provider: string;
  model: string;
}

export interface Submission {
  id: string;
  taskId: string;
  familyId: string;
  studentId: string;
  submittedAt: string;
  note?: string;
  elapsedMinutes?: number;
  imageUrls: string[];
  audioUrl?: string;
  aiReview?: AIReview;
  parentDecision?: "approved" | "rejected";
  parentFeedback?: string;
}

export type QuestionType =
  | "multiple_choice"
  | "spelling"
  | "dictation"
  | "speaking"
  | "short_answer"
  | "fill_blank"
  | "ordering"
  | "essay"
  | "oral";

export interface TestQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  choices?: string[];
  answer: string | string[];
  explanation?: string;
  points: number;
  acceptedAnswers?: string[];
  source?: "parent" | "ai_draft" | "ai_auto";
}

export interface StudyTest {
  id: string;
  familyId: string;
  studentId: string;
  subject: SubjectName;
  title: string;
  scheduledDate: string;
  passScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  status: "draft" | "published" | "completed" | "retest";
  questions: TestQuestion[];
  latestScore?: number;
}

export interface NotificationItem {
  id: string;
  familyId: string;
  recipientId: string;
  title: string;
  body: string;
  type: "plan" | "due" | "submission" | "review" | "test" | "weekly";
  createdAt: string;
  read: boolean;
}

export type AICapability =
  | "parseCourseOutline"
  | "generateStudyPlan"
  | "analyzeSubmission"
  | "generateTest"
  | "gradeFreeResponse"
  | "transcribeSpeech";

export type AIProviderName = "openai" | "google";

export interface AIModelSelection {
  capability: AICapability;
  primaryProvider: AIProviderName;
  primaryModel: string;
  fallbackProvider?: AIProviderName;
  fallbackModel?: string;
}

export interface FamilyMetrics {
  completionRate: number;
  onTimeRate: number;
  rejectionRate: number;
  studyMinutes: number;
  averageScore: number;
  pendingReviews: number;
}
