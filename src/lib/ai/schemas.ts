import { z } from "zod";

export const courseOutlineSchema = z.object({
  lessons: z.array(
    z.object({
      index: z.number().int().positive(),
      title: z.string().min(1),
      durationMinutes: z.number().int().positive().optional(),
    }),
  ),
});

export const generatedPlanSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()),
  tasks: z.array(
    z.object({
      date: z.string(),
      subject: z.string(),
      type: z.enum(["lecture", "workbook", "memorize", "review", "test", "custom"]),
      title: z.string(),
      detail: z.string(),
      estimatedMinutes: z.number().int().positive(),
    }),
  ),
});

export const submissionAnalysisSchema = z.object({
  summary: z.string(),
  detectedPages: z.array(z.string()),
  completionPercent: z.number().min(0).max(100),
  blurScore: z.number().min(0).max(1),
  blankAreas: z.array(z.string()),
  flags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const generatedTestSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      type: z.enum([
        "multiple_choice",
        "spelling",
        "dictation",
        "speaking",
        "short_answer",
        "fill_blank",
        "ordering",
        "essay",
        "oral",
      ]),
      prompt: z.string(),
      choices: z.array(z.string()).optional(),
      answer: z.union([z.string(), z.array(z.string())]),
      explanation: z.string().optional(),
      points: z.number().int().positive(),
    }),
  ),
});

export const freeResponseGradeSchema = z.object({
  scorePercent: z.number().min(0).max(100),
  correct: z.boolean(),
  rationale: z.string(),
  missingKeywords: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  needsParentReview: z.boolean(),
});

export type CourseOutlineOutput = z.infer<typeof courseOutlineSchema>;
export type GeneratedPlanOutput = z.infer<typeof generatedPlanSchema>;
export type SubmissionAnalysisOutput = z.infer<typeof submissionAnalysisSchema>;
export type GeneratedTestOutput = z.infer<typeof generatedTestSchema>;
export type FreeResponseGradeOutput = z.infer<typeof freeResponseGradeSchema>;
