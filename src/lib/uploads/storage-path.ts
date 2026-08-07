/**
 * Builds the object key for a submission asset.
 *
 * The first path segment MUST be the family UUID: the storage policies in
 * 202608060001_initial_schema.sql authorize on
 * `sisters_is_family_member((storage.foldername(name))[1]::uuid)`. If this
 * prefix is ever wrong, one family's uploads become readable by another.
 */
export function buildSubmissionStoragePath(input: {
  familyId: string;
  studentId: string;
  taskId: string;
  fileName: string;
  uuid: string;
}) {
  return `${input.familyId}/${input.studentId}/${input.taskId}/${input.uuid}.${safeExtension(input.fileName)}`;
}

/** Strips anything that is not alphanumeric so a crafted name cannot alter the key. */
export function safeExtension(fileName: string) {
  const raw = fileName.split(".").pop();
  if (!raw || raw === fileName) return "bin";
  const cleaned = raw.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return cleaned || "bin";
}
