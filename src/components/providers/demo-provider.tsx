"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AIModelSelection, StudyTask, Submission } from "@/lib/domain/types";
import { defaultModelSelections } from "@/lib/ai/catalog";
import { demoSubmissions, demoTasks } from "@/lib/demo-data";

interface DemoContextValue {
  tasks: StudyTask[];
  submissions: Submission[];
  selections: AIModelSelection[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  updateTaskStatus: (taskId: string, status: StudyTask["status"]) => void;
  reviewSubmission: (submissionId: string, decision: "approved" | "rejected", feedback?: string) => void;
  updateSelection: (selection: AIModelSelection) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(demoTasks);
  const [submissions, setSubmissions] = useState(demoSubmissions);
  const [selections, setSelections] = useState(defaultModelSelections);
  const [selectedStudentId, setSelectedStudentId] = useState("student-minseo");

  const value = useMemo<DemoContextValue>(
    () => ({
      tasks,
      submissions,
      selections,
      selectedStudentId,
      setSelectedStudentId,
      updateTaskStatus(taskId, status) {
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
      },
      reviewSubmission(submissionId, decision, feedback) {
        setSubmissions((current) =>
          current.map((submission) =>
            submission.id === submissionId
              ? { ...submission, parentDecision: decision, parentFeedback: feedback }
              : submission,
          ),
        );
        const submission = submissions.find((item) => item.id === submissionId);
        if (submission) {
          setTasks((current) =>
            current.map((task) =>
              task.id === submission.taskId
                ? { ...task, status: decision === "approved" ? "approved" : "rejected" }
                : task,
            ),
          );
        }
      },
      updateSelection(selection) {
        setSelections((current) => current.map((item) => (item.capability === selection.capability ? selection : item)));
      },
      resetDemo() {
        setTasks(demoTasks);
        setSubmissions(demoSubmissions);
        setSelections(defaultModelSelections);
      },
    }),
    [selectedStudentId, selections, submissions, tasks],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
