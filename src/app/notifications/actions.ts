"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { markAllRead } from "@/lib/data/notification-feed";
import { actionFailure as fail, type ActionState } from "@/lib/forms/action-state";

const schema = z.object({ role: z.enum(["parent", "student"]) });

export async function markAllReadAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return fail("요청을 확인해 주세요.");

  if (isDemoMode) return { ok: true, message: "데모 모드입니다. 읽음 상태가 저장되지는 않습니다." };

  const count = await markAllRead(parsed.data.role);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { ok: true, message: count ? `${count}건을 읽음으로 표시했습니다.` : "읽지 않은 알림이 없습니다." };
}
