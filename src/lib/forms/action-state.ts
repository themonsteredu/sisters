// Shared shape for useActionState-driven forms.
//
// This deliberately lives outside any "use server" file: such a file may only
// export async functions, so a constant like `idleState` declared there fails at
// runtime with "A 'use server' file can only export async functions".

export interface ActionState {
  ok: boolean;
  message: string;
}

export const idleState: ActionState = { ok: false, message: "" };

export function actionFailure(message: string): ActionState {
  return { ok: false, message };
}

export function actionSuccess(message: string): ActionState {
  return { ok: true, message };
}

export interface AttemptOutcome {
  /**
   * False in demo mode. Demo cannot grade — the answers deliberately never
   * reach the browser and there is no database — so the result screen must not
   * show a score that would read as a real 0.
   */
  graded: boolean;
  score: number;
  passed: boolean;
  needsParentReview: boolean;
  correctCount: number;
  gradedCount: number;
  attemptsRemaining: number;
}

export interface AttemptState extends ActionState {
  result?: AttemptOutcome;
}

export const idleAttemptState: AttemptState = { ok: false, message: "" };
