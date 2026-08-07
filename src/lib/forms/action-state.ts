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
