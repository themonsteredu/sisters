"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface FamilySetupState {
  ok: boolean;
  message: string;
}

const studentSchema = z.object({
  name: z.string().trim().min(1, "학생 이름을 입력해 주세요.").max(30),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,29}$/, "학생 아이디는 영문 소문자와 숫자로 3자 이상 입력해 주세요."),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일을 확인해 주세요."),
  grade: z.number().int().min(1).max(12),
  pin: z.string().regex(/^\d{6}$/, "학생 PIN은 숫자 6자리여야 합니다."),
});

const setupSchema = z.object({
  familyName: z.string().trim().min(2, "가족 이름은 2자 이상 입력해 주세요.").max(50),
  students: z.array(studentSchema).min(1, "학생을 한 명 이상 등록해 주세요.").max(6),
}).superRefine((value, context) => {
  const handles = value.students.map((student) => student.handle);
  if (new Set(handles).size !== handles.length) {
    context.addIssue({ code: "custom", path: ["students"], message: "학생 아이디는 서로 달라야 합니다." });
  }
  const today = new Date().toISOString().slice(0, 10);
  value.students.forEach((student, index) => {
    if (student.birthDate > today) {
      context.addIssue({ code: "custom", path: ["students", index, "birthDate"], message: "생년월일은 오늘 이후일 수 없습니다." });
    }
  });
});

const defaultSubjects = [
  { name: "영어", color: "#6b59cc", icon: "book", sort_order: 1 },
  { name: "수학", color: "#3b82f6", icon: "calculator", sort_order: 2 },
  { name: "국어", color: "#e8798f", icon: "language", sort_order: 3 },
  { name: "과학", color: "#22a06b", icon: "flask", sort_order: 4 },
  { name: "역사", color: "#d97706", icon: "landmark", sort_order: 5 },
];

export async function createFamilySetup(
  _previousState: FamilySetupState,
  formData: FormData,
): Promise<FamilySetupState> {
  const actor = await getParentActor();
  if (!actor) return { ok: false, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };

  let rawStudents: unknown;
  try {
    rawStudents = JSON.parse(String(formData.get("studentsJson") ?? "[]"));
  } catch {
    return { ok: false, message: "학생 정보를 다시 확인해 주세요." };
  }

  const parsed = setupSchema.safeParse({
    familyName: formData.get("familyName"),
    students: rawStudents,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Supabase 서버 설정이 필요합니다." };

  const handles = parsed.data.students.map((student) => student.handle);
  const { data: duplicatedHandles, error: duplicateError } = await admin
    .from("sisters_students")
    .select("handle")
    .in("handle", handles);
  if (duplicateError) return { ok: false, message: duplicateError.message };
  if (duplicatedHandles?.length) {
    return { ok: false, message: `이미 사용 중인 학생 아이디입니다: ${duplicatedHandles.map((item) => item.handle).join(", ")}` };
  }

  let familyId: string | null = null;
  let createdFamily = false;
  let createdStudentIds: string[] = [];

  try {
    const { data: membership, error: membershipError } = await admin
      .from("sisters_family_members")
      .select("family_id")
      .eq("user_id", actor.id)
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;

    if (membership?.family_id) {
      familyId = membership.family_id;
      const { error } = await admin
        .from("sisters_families")
        .update({ name: parsed.data.familyName })
        .eq("id", familyId);
      if (error) throw error;
    } else {
      const { data: family, error } = await admin
        .from("sisters_families")
        .insert({ name: parsed.data.familyName, timezone: "Asia/Seoul", plan: "beta" })
        .select("id")
        .single();
      if (error || !family) throw error ?? new Error("가족 공간을 만들지 못했습니다.");
      familyId = family.id;
      createdFamily = true;

      const { error: memberError } = await admin.from("sisters_family_members").insert({
        family_id: familyId,
        user_id: actor.id,
        role: "parent",
      });
      if (memberError) throw memberError;
    }

    const { error: subjectError } = await admin.from("sisters_subjects").upsert(
      defaultSubjects.map((subject) => ({ ...subject, family_id: familyId })),
      { onConflict: "family_id,name", ignoreDuplicates: true },
    );
    if (subjectError) throw subjectError;

    const pinHashes = await Promise.all(
      parsed.data.students.map(async (student) => [student.handle, await hash(student.pin, 12)] as const),
    );
    const pinHashByHandle = new Map(pinHashes);

    const { data: students, error: studentError } = await admin
      .from("sisters_students")
      .insert(parsed.data.students.map((student) => ({
        family_id: familyId,
        name: student.name,
        handle: student.handle,
        birth_date: student.birthDate,
        grade: student.grade,
        avatar: student.name.slice(0, 1),
        color: "#6b59cc",
      })))
      .select("id,handle");
    if (studentError || !students?.length) throw studentError ?? new Error("학생을 등록하지 못했습니다.");
    createdStudentIds = students.map((student) => student.id);

    const { error: credentialError } = await admin.from("sisters_student_credentials").insert(
      students.map((student) => ({
        student_id: student.id,
        family_id: familyId,
        pin_hash: pinHashByHandle.get(student.handle),
      })),
    );
    if (credentialError) throw credentialError;

    await admin.from("sisters_audit_logs").insert({
      family_id: familyId,
      actor_user_id: actor.id,
      action: "family_onboarding_created",
      entity_type: "family",
      entity_id: familyId,
      metadata: { studentCount: students.length },
    });
  } catch (error) {
    if (familyId && createdFamily) {
      await admin.from("sisters_families").delete().eq("id", familyId);
    } else if (createdStudentIds.length) {
      await admin.from("sisters_students").delete().in("id", createdStudentIds);
    }
    return { ok: false, message: error instanceof Error ? error.message : "가족 정보를 저장하지 못했습니다." };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect("/onboarding?step=consent");
}
