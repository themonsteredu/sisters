"use client";

import { useActionState, useState } from "react";
import { FileText, ImageIcon, Paperclip, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { attachMaterialAction, deleteMaterialAction } from "@/app/planning/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import type { PlanningTask } from "@/lib/data/planning";

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * Parent-side attachment panel for one task. The parent scans a paper
 * worksheet, attaches it here, and the student opens it from their task list.
 */
export function TaskMaterials({ task, studentName, onClose }: { task: PlanningTask; studentName: string; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);

  const [uploadState, upload, uploading] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      formData.delete("files");
      for (const file of files) formData.append("files", file);
      const result = await attachMaterialAction(previous, formData);
      if (result.ok) setFiles([]);
      return result;
    },
    idleState,
  );
  const [deleteState, remove, deleting] = useActionState(deleteMaterialAction, idleState);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="과제 자료" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black">{task.title}</h2>
            <p className="mt-1 text-xs text-slate-400">{studentName} · {task.scheduledDate}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black"><Paperclip size={16} /> 첨부된 자료 {task.materials.length}개</h3>
            <div className="mt-3 space-y-2">
              {task.materials.length ? task.materials.map((material) => (
                <div key={material.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${material.kind === "pdf" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                    {material.kind === "pdf" ? <FileText size={17} /> : <ImageIcon size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{material.title}</strong>
                    <span className="text-xs text-slate-400">{material.kind.toUpperCase()} · {sizeLabel(material.sizeBytes)}</span>
                  </div>
                  {material.url ? (
                    <a href={material.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                      열기
                    </a>
                  ) : null}
                  <form action={remove}>
                    <input type="hidden" name="materialId" value={material.id} />
                    <button type="submit" disabled={deleting} aria-label={`${material.title} 삭제`} className="grid size-9 place-items-center rounded-lg bg-rose-50 text-rose-600 disabled:opacity-50">
                      <Trash2 size={15} />
                    </button>
                  </form>
                </div>
              )) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">아직 첨부한 자료가 없습니다.</p>}
            </div>
            {deleteState.message ? (
              <p role="status" className={`mt-2 rounded-xl p-3 text-sm font-semibold ${deleteState.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                {deleteState.message}
              </p>
            ) : null}
          </div>

          <form action={upload} className="space-y-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="taskId" value={task.id} />
            <h3 className="text-sm font-black">학습지 올리기</h3>
            <label className="grid min-h-32 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-violet-300 hover:bg-violet-50">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><Upload size={20} /></span>
                <p className="mt-3 text-sm font-bold">PDF 또는 사진 선택</p>
                <p className="mt-1 text-xs text-slate-400">개당 최대 20MB · 스캔한 학습지도 그대로 올릴 수 있어요</p>
              </div>
            </label>

            {files.length ? (
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <Badge key={`${file.name}-${file.lastModified}`} className="bg-violet-50 text-violet-700">
                    {file.name} · {sizeLabel(file.size)}
                  </Badge>
                ))}
              </div>
            ) : null}

            {uploadState.message ? (
              <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${uploadState.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                {uploadState.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={uploading || !files.length}>
              {uploading ? "올리는 중…" : `자료 첨부 (${files.length}개)`}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
