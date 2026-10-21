export const taskStatuses = ["inbox", "in_progress", "waiting", "review", "done", "dismissed"] as const;
export const taskPriorities = ["high", "medium", "low"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: number | null;
  sourceType: "manual" | "email" | "meeting";
  sourceLabel: string | null;
  sourceSubject: string | null;
  sourceMessageId: string | null;
  sourceThreadId: string | null;
  position: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  commitmentKey: string | null;
  extra: TaskExtra;
};

export type Evidence = { type: "email" | "meeting" | "calendar"; id: string; label: string; url?: string; excerpt?: string; sender?: string; subject?: string; threadId?: string };
export type TaskExtra = {
  kind?: "action" | "decision" | "waiting";
  project?: string;
  confidence?: "confirmed" | "needs_confirmation";
  reviewReason?: string;
  durationMinutes?: number | null;
  suggestedDate?: string | null;
  waitingOn?: string;
  focusDate?: string | null;
  sources?: Evidence[];
};
export type SourceHealth = { status: "success" | "error" | "unavailable"; checkedAt: number; through?: number; note: string; windowStart?: string; windowEnd?: string };
export type AgendaEvent = { id: string; title: string; start: string; end: string; url?: string; preparation?: string; notesStatus?: "available" | "missing" | "not_expected"; busy: boolean; allDay: boolean };
export type CommandState = {
  date: string;
  timezone: string;
  calendarId: string;
  highlights: string[];
  events: AgendaEvent[];
  sources: Partial<Record<"email" | "meetings" | "calendar", SourceHealth>>;
  updatedAt: number;
};

export type TriageRun = {
  scannedAt: number;
  scannedCount: number;
  createdCount: number;
  summary: string;
  status: string;
};

export type BoardData = {
  tasks: Task[];
  lastTriageRun: TriageRun | null;
  command: CommandState | null;
  planning: PlanningContext;
};

export type PriorityFeedback = { id: string; taskId: string; project: string; title: string; fromPriority: string; toPriority: string; reason: string; createdAt: number };
export type PlanningContext = {
  policy: Omit<typeof import("@/config/planning-policy.json"), "clientRules"> & { clientRules: Array<{ client: string; aliases?: string[]; rank: number; confidence: string; scope: string; sourceRef: string; reason?: string }> };
  playbook: string;
  priorityFeedback: PriorityFeedback[];
  plan: ReturnType<typeof import("@/lib/work-plan.mjs").buildWorkPlan>;
};
