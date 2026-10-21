"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  GripVertical,
  Inbox,
  LogOut,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { localInstant } from "@/lib/work-plan.mjs";
import { toast, Toaster } from "sonner";
import { TodayPanel, dublinDate } from "@/components/today-panel";
import { instance, scheduleLabel } from "@/lib/instance.mjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BoardData,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/task-types";

const columns: Array<{
  key: TaskStatus;
  title: string;
  tone: string;
  emptyTitle: string;
  emptyText: string;
}> = [
  {
    key: "inbox",
    title: "Inbox",
    tone: "violet",
    emptyTitle: "Inbox clear",
    emptyText: "New email actions will land here.",
  },
  {
    key: "in_progress",
    title: "In progress",
    tone: "amber",
    emptyTitle: "Nothing active",
    emptyText: "Move one important task here and finish it.",
  },
  {
    key: "waiting",
    title: "Waiting for",
    tone: "amber",
    emptyTitle: "No loose ends",
    emptyText: "Track a response or dependency here.",
  },
  {
    key: "done",
    title: "Done",
    tone: "lime",
    emptyTitle: "No wins yet",
    emptyText: "Completed work will stay visible here.",
  },
];

const priorityRank: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type BoardProps = {
  initialData: BoardData;
  displayName: string;
  email: string;
  signOutPath: string;
};

type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  project: string;
  durationMinutes: string;
  priorityReason: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "inbox",
  priority: "medium",
  dueDate: "",
  project: "", durationMinutes: "", priorityReason: "",
};

function dateToInput(timestamp: number | null) {
  return timestamp ? dublinDate(timestamp) : "";
}

function inputToTimestamp(value: string) {
  if (!value) return null;
  return localInstant(value, 17 * 60);
}

function dueLabel(timestamp: number | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (dublinDate(timestamp) === dublinDate()) return "Today";
  return new Intl.DateTimeFormat("en-GB", { timeZone: instance.timezone, day:"numeric", month:"short" }).format(date);
}

function taskSource(task: Task) {
  if (task.sourceType === "meeting") return task.sourceLabel || "From meeting notes";
  if (task.sourceType === "email") {
    return task.sourceLabel ? `From ${task.sourceLabel}` : "From email";
  }
  return "Added manually";
}

async function readJson(response: Response): Promise<any> {
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }
  return payload;
}

export function Board({ initialData, displayName, email, signOutPath }: BoardProps) {
  const [tasks, setTasks] = useState(initialData.tasks);
  const [lastTriageRun, setLastTriageRun] = useState(initialData.lastTriageRun);
  const [command, setCommand] = useState(initialData.command);
  const [planning, setPlanning] = useState(initialData.planning);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>("inbox");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#task-search")?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const registrations = [
      context.registerTool(
        {
          name: "list_tasks",
          title: "List tasks",
          description: "Read the tasks currently visible on the owner's private board.",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["all", "inbox", "in_progress", "done"],
              },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            const status =
              typeof input === "object" && input && "status" in input
                ? String((input as { status?: string }).status || "all")
                : "all";
            const result =
              status === "all"
                ? tasksRef.current
                : tasksRef.current.filter((task) => task.status === status);
            return result.map(({ id, title, description, status: taskStatus, priority, dueAt, sourceLabel }) => ({
              id,
              title,
              description,
              status: taskStatus,
              priority,
              dueAt,
              sourceLabel,
            }));
          },
        },
        { signal: lifecycle.signal },
      ),
      context.registerTool(
        {
          name: "record_email_triage",
          title: "Record email triage",
          description:
            "Add actionable Gmail items to the owner's inbox and record the completed scan. Duplicate message-and-task pairs are ignored.",
          inputSchema: {
            type: "object",
            properties: {
              scannedCount: { type: "integer", minimum: 0 },
              summary: { type: "string" },
              tasks: {
                type: "array",
                maxItems: 50,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    dueAt: { type: ["integer", "null"] },
                    sender: { type: "string" },
                    subject: { type: "string" },
                    messageId: { type: "string" },
                    threadId: { type: ["string", "null"] },
                  },
                  required: ["title", "sender", "subject", "messageId"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks", "scannedCount"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input: unknown) {
            if (!input || typeof input !== "object") {
              throw new Error("A triage payload is required.");
            }
            const response = await fetch("/api/triage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const result = await readJson(response);
            const state = await readJson(await fetch("/api/tasks"));
            setTasks(state.tasks);
            setLastTriageRun(state.lastTriageRun);
            return result;
          },
        },
        { signal: lifecycle.signal },
      ),
      context.registerTool(
        {
          name: "create_task",
          title: "Create task",
          description: "Create one task on the owner's board.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string", enum: ["inbox", "in_progress", "done"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              dueAt: { type: ["integer", "null"] },
            },
            required: ["title"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input: unknown) {
            const response = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const result = await readJson(response);
            setTasks((current) => [...current, result.task]);
            return result.task;
          },
        },
        { signal: lifecycle.signal },
      ),
    ];

    void Promise.all(registrations.map((value) => Promise.resolve(value))).catch(() => {
      // The visible interface remains fully functional when WebMCP is unavailable.
    });
    return () => lifecycle.abort();
  }, []);

  const filteredTasks = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return tasks;
    return tasks.filter((task) =>
      [task.title, task.description, task.sourceLabel, task.sourceSubject]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(value)),
    );
  }, [query, tasks]);

  const dueTodayCount = tasks.filter(
    (task) => ["inbox", "in_progress", "waiting"].includes(task.status) && task.dueAt && dublinDate(task.dueAt) === dublinDate(),
  ).length;
  const activeCount = tasks.filter((task) => ["inbox", "in_progress", "waiting"].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const nextTask = [...tasks]
    .filter((task) => ["inbox", "in_progress"].includes(task.status))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))[0];

  function openCreate(status: TaskStatus = "inbox") {
    setEditingTask(null);
    setDraft({ ...emptyDraft, status });
    setDialogOpen(true);
  }

  async function refreshBoard() {
    setRefreshing(true);
    try {
      const state = await readJson(await fetch("/api/tasks", { cache: "no-store" }));
      setTasks(state.tasks); setLastTriageRun(state.lastTriageRun); setCommand(state.command); setPlanning(state.planning);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Refresh failed"); }
    finally { setRefreshing(false); }
  }

  async function updateFromToday(task: Task, changes: object) {
    const date = (changes as { extra?: { focusDate?: string | null } }).extra?.focusDate;
    if (date && tasks.filter(t => t.id !== task.id && t.extra.focusDate === date && ["inbox", "in_progress"].includes(t.status)).length >= 3) {
      toast.error("Keep today to three priorities. Unpin one first."); return;
    }
    try {
      const result = await readJson(await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) }));
      setTasks(items => items.map(item => item.id === task.id ? result.task : item));
      toast.success("Board updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update task"); }
  }

  useEffect(() => {
    const timer = window.setInterval(() => { void refreshBoard(); }, 60000);
    const onFocus = () => { void refreshBoard(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  function openEdit(task: Task) {
    setEditingTask(task);
    setDraft({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: dateToInput(task.dueAt),
      project: task.extra.project ?? "", durationMinutes: task.extra.durationMinutes?.toString() ?? "", priorityReason: "",
    });
    setDialogOpen(true);
  }

  async function submitTask(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const payload = {
      title: draft.title,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      dueAt: inputToTimestamp(draft.dueDate),
      extra: { project: draft.project, durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null },
      ...(editingTask ? { priorityReason: draft.priorityReason } : {}),
    };

    try {
      if (editingTask) {
        const result = await readJson(
          await fetch(`/api/tasks/${editingTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        );
        setTasks((current) =>
          current.map((task) => (task.id === editingTask.id ? result.task : task)),
        );
        toast.success("Task updated");
      } else {
        const result = await readJson(
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        );
        setTasks((current) => [...current, result.task]);
        toast.success("Task added");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the task.");
    } finally {
      setSaving(false);
    }
  }

  async function moveTask(id: string, status: TaskStatus) {
    const current = tasks.find((task) => task.id === id);
    if (!current || current.status === status) return;
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, status } : task)));
    try {
      const result = await readJson(
        await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      setTasks((items) => items.map((task) => (task.id === id ? result.task : task)));
      toast.success(status === "done" ? "Nice. One less thing." : "Task moved");
    } catch (error) {
      setTasks((items) => items.map((task) => (task.id === id ? current : task)));
      toast.error(error instanceof Error ? error.message : "Could not move the task.");
    }
  }

  async function deleteTask(task: Task) {
    const previous = tasks;
    setTasks((items) => items.filter((item) => item.id !== task.id));
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete the task.");
      toast.success("Task deleted");
    } catch (error) {
      setTasks(previous);
      toast.error(error instanceof Error ? error.message : "Could not delete the task.");
    }
  }

  async function smartSort() {
    const sorted = [...tasks].sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) ||
        b.updatedAt - a.updatedAt,
    );
    const positions = new Map<TaskStatus, number>([
      ["inbox", 0],
      ["in_progress", 0],
      ["waiting", 0],
      ["review", 0],
      ["dismissed", 0],
      ["done", 0],
    ]);
    const next = sorted.map((task) => ({
      ...task,
      position: positions.set(task.status, (positions.get(task.status) ?? 0) + 1).get(task.status)! - 1,
    }));
    setTasks(next);
    toast.success("Highest-impact work is at the top");
    await Promise.all(
      next.map((task) =>
        fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: task.position }),
        }),
      ),
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/brand/kri8it-logomark.png" alt="Kri8it" width={42} height={42} /></div>
          <div>
            <p className="eyebrow">{instance.appName}</p>
            <h1>Today</h1>
          </div>
        </div>

        <div className="header-actions">
          <label className="search-field" htmlFor="task-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search tasks</span>
            <input
              id="task-search"
              placeholder="Search tasks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>/</kbd>
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="account-button" aria-label="Open account menu">
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
                <span className="account-copy"><strong>{displayName}</strong><small>{email}</small></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="account-menu">
              <DropdownMenuLabel>{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={signOutPath} target="_top"><LogOut /> Sign out</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="primary-button" onClick={() => openCreate()}>
            <Plus aria-hidden="true" /> Add task
          </button>
        </div>
      </header>

      <nav className="mobile-jump-nav" aria-label="Page sections"><a href="#daily-focus">Your day</a><a href="#priority-board">Task board <span>{activeCount}</span></a></nav>

      <section className="status-strip" aria-label="Board summary">
        <div className="sync-state">
          <span className="sync-icon"><Mail aria-hidden="true" /></span>
          <div>
            <span className="status-label">Daily briefing</span>
            <strong>
              {command || lastTriageRun
                ? `Last update ${formatDistanceToNow(command?.updatedAt ?? lastTriageRun!.scannedAt, { addSuffix: true })}`
                : "Ready for first scan"}
            </strong>
          </div>
          <span className="live-pill" title={`Briefing preference: ${scheduleLabel()} (${instance.timezone}); actual job status is verified during setup`}><span /> {scheduleLabel()}</span>
        </div>

        <div className="metric"><Inbox aria-hidden="true" /><span><strong>{activeCount}</strong> active</span></div>
        <div className="metric"><Clock3 aria-hidden="true" /><span><strong>{dueTodayCount}</strong> due today</span></div>
        <div className="metric"><CheckCircle2 aria-hidden="true" /><span><strong>{completedCount}</strong> completed</span></div>
      </section>

      <TodayPanel tasks={tasks} command={command} planning={planning} onEdit={openEdit} onUpdate={updateFromToday} onRefresh={refreshBoard} refreshing={refreshing} />

      <section className="board-shell" id="priority-board">
        <div className="board-toolbar">
          <div>
            <p className="eyebrow">Your work, distilled</p>
            <h2>Priority board</h2>
          </div>
          <button className="quiet-button" onClick={smartSort} disabled={!tasks.length}>
            <Sparkles aria-hidden="true" /> Smart sort
          </button>
        </div>

        <div className="mobile-board-tabs" role="tablist" aria-label="Task status">
          {columns.map((column, index) => <button key={column.key} type="button" role="tab" id={`status-tab-${column.key}`} aria-selected={mobileColumn === column.key} aria-controls={`status-panel-${column.key}`} tabIndex={mobileColumn === column.key ? 0 : -1} onClick={() => setMobileColumn(column.key)} onKeyDown={(event) => {
            const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            const next = event.key === "Home" ? 0 : event.key === "End" ? columns.length - 1 : step ? (index + step + columns.length) % columns.length : null;
            if (next !== null) { event.preventDefault(); setMobileColumn(columns[next].key); document.getElementById(`status-tab-${columns[next].key}`)?.focus(); }
          }}><span>{column.title}</span><b>{filteredTasks.filter(task => task.status === column.key).length}</b></button>)}
        </div>

        <div className="kanban-board">
          {columns.map((column) => {
            const columnTasks = filteredTasks
              .filter((task) => task.status === column.key)
              .sort((a, b) => a.position - b.position || b.updatedAt - a.updatedAt);
            return (
              <section
                className={`kanban-column ${mobileColumn === column.key ? "mobile-selected" : ""}`}
                id={`status-panel-${column.key}`}
                role="tabpanel"
                aria-label={column.title}
                key={column.key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) void moveTask(draggedId, column.key);
                  setDraggedId(null);
                }}
              >
                <header className="column-header">
                  <div>
                    <span className={`tone-dot ${column.tone}`} />
                    <h3>{column.title}</h3>
                    <span className="count">{columnTasks.length}</span>
                  </div>
                  <button aria-label={`Add task to ${column.title}`} onClick={() => openCreate(column.key)}><Plus /></button>
                </header>

                <div className="task-stack">
                  {columnTasks.map((task) => (
                    <article
                      className={`task-card ${task.status === "done" ? "is-done" : ""}`}
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onDoubleClick={() => openEdit(task)}
                    >
                      <div className="card-topline">
                        <span className={`priority ${task.status === "done" ? "done" : task.priority}`}>
                          {task.status === "done" ? "Done" : task.priority}
                        </span>
                        <div className="card-actions">
                          <GripVertical aria-hidden="true" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button aria-label={`Open actions for ${task.title}`}><MoreHorizontal /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Move to</DropdownMenuLabel>
                              {columns
                                .filter((item) => item.key !== task.status)
                                .map((item) => (
                                  <DropdownMenuItem key={item.key} onClick={() => void moveTask(task.id, item.key)}>
                                    {item.title}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              {["inbox", "in_progress"].includes(task.status) && <DropdownMenuItem onClick={() => void updateFromToday(task, { extra: { focusDate: task.extra.focusDate === dublinDate() ? null : dublinDate() } })}>{task.extra.focusDate === dublinDate() ? "Unpin from today" : "Pin for today"}</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => openEdit(task)}>Edit task</DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => void deleteTask(task)}>
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <button className="card-body" onClick={() => openEdit(task)}>
                        {task.extra.kind === "decision" && <span className="task-kind">Decision needed</span>}
                        <h4>{task.title}</h4>
                        {task.description && <p>{task.description}</p>}
                        {task.extra.waitingOn && <p>Waiting on {task.extra.waitingOn}</p>}
                      </button>
                      <footer>
                        <span className="source" title={task.sourceSubject ?? undefined}>
                          {task.sourceType === "email" ? <Mail aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                          {taskSource(task)}
                        </span>
                        {task.dueAt && (
                          <span className={`due ${dublinDate(task.dueAt) === dublinDate() && task.status !== "done" ? "urgent" : ""}`}>
                            <CalendarDays aria-hidden="true" /> {dueLabel(task.dueAt)}
                          </span>
                        )}
                      </footer>
                    </article>
                  ))}
                  {!columnTasks.length && (
                    <div className="empty-column">
                      <span><Check aria-hidden="true" /></span>
                      <strong>{query ? "No matching tasks" : column.emptyTitle}</strong>
                      <p>{query ? "Try a different search." : column.emptyText}</p>
                    </div>
                  )}
                  <button className="column-add" onClick={() => openCreate(column.key)}>
                    <Plus aria-hidden="true" /> Add a task
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {nextTask && (
        <button className="floating-focus" onClick={() => openEdit(nextTask)}>
          <span><ArrowUpRight aria-hidden="true" /></span>
          <span><small>Up next</small>{nextTask.title}</span>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="task-dialog">
          <form onSubmit={submitTask}>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit task" : "Add task"}</DialogTitle>
              <DialogDescription>
                Keep it concrete. One clear outcome per task.
              </DialogDescription>
            </DialogHeader>
            <div className="task-form">
              {editingTask?.extra.sources?.length ? <div className="evidence-list"><span>Evidence & context</span>{editingTask.extra.sources.map(source => <div key={`${source.type}:${source.id}`}>
                {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a> : <strong>{source.label}</strong>}
                {source.excerpt && <p>{source.excerpt}</p>}
              </div>)}{editingTask.extra.durationMinutes && <small>~{editingTask.extra.durationMinutes} minutes · estimate</small>}{editingTask.extra.suggestedDate && <small>Suggested work date: {editingTask.extra.suggestedDate} · not a committed deadline</small>}</div> : null}
              <label>
                <span>Task</span>
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="What needs to happen?"
                  maxLength={180}
                  required
                />
              </label>
              <label>
                <span>Notes</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Add the useful context, not the whole novel."
                  maxLength={2000}
                  rows={4}
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Status</span>
                  <Select
                    value={draft.status}
                    onValueChange={(value) => setDraft((current) => ({ ...current, status: value as TaskStatus }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox">Inbox</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="waiting">Waiting for</SelectItem>
                      <SelectItem value="review">Needs confirmation</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  <span>Priority</span>
                  <Select
                    value={draft.priority}
                    onValueChange={(value) => setDraft((current) => ({ ...current, priority: value as TaskPriority }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label><span>Client / project</span><input value={draft.project} maxLength={120} onChange={event => setDraft(current => ({ ...current, project: event.target.value }))} placeholder="Leave blank if unknown" /></label>
                <label><span>Effort estimate (minutes)</span><input type="number" min={5} max={480} step={5} value={draft.durationMinutes} onChange={event => setDraft(current => ({ ...current, durationMinutes: event.target.value }))} placeholder="30-minute planning default" /></label>
              </div>
              {editingTask && <label><span>Why this priority? (optional)</span><textarea rows={2} maxLength={500} value={draft.priorityReason} onChange={event => setDraft(current => ({ ...current, priorityReason: event.target.value }))} placeholder="E.g. deadline tomorrow; or a standing client preference. Be explicit about the scope." /><small>Your correction is retained for future briefings, not treated as a blanket client ranking.</small></label>}
            </div>
            <DialogFooter className="dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving || !draft.title.trim()}>
                {saving ? "Saving…" : editingTask ? "Save changes" : "Add task"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster theme="dark" position="bottom-center" richColors />
    </main>
  );
}
