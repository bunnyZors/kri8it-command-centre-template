# Architecture and data contract

`connected accounts -> scheduled agent -> Site MCP/private update -> D1 -> browser board`

Vinext/React runs as a Cloudflare Worker through Sites. SQLite-compatible D1 stores tasks, triage history, briefing and priority feedback. Hosting declares logical DB and MCP; Sites provisions actual resources. All three `drizzle/` SQL files and metadata are schema-only. No external LLM calls occur inside the web application. The scheduled agent supplies intelligence using its own available connections.

## Code map

- `components/board.tsx`: task CRUD, search, smart sort, mobile status tabs, editor, evidence, keyboard flows and bounded WebMCP.
- `components/today-panel.tsx`: three priorities/pins, read-only agenda, independent briefing notes, uncertainty review and suggestion-only blocks.
- `lib/work-plan.mjs`: pure time-gap planner; no booking APIs. Uses configured timezone, whole-hour same-day working windows, calendar coverage/buffers and confirmed client rules.
- `config/instance.json` / `config/planning-policy.json`: personalisation, cadence preference, selected source descriptions, scan bounds and policy. Neutral master is unconfigured, no Site ID and no client context.
- `lib/briefing-playbook.ts`: current run policy generated from configuration, exposed by list_tasks.
- `lib/command-update.ts`: strict validation, source reconciliation, cross-source commitment matching and atomic database batch. Preserves manual fields/status.
- `app/mcp/route.ts`: list_tasks, serialized record_command_update_json, nested updater and legacy email writer. Prefer serialized envelope to avoid cached nested-schema loss.
- `app/api/command-centre`: private GET/POST fallback. `app/api/tasks`: manual CRUD. Legacy email routes retained for compatibility, not the preferred combined briefing path.
- `app/chatgpt-auth.ts` and vendored Sites Vite plugin: browser identity/preview support. SECURITY.md explains the hosting access dependency.

## Stable updater envelope

Read actual tool schema first. Core fields: `date` (local YYYY-MM-DD), configured `timezone` and `calendarId`, `highlights` (max six), `events` (max 100), independent `sources`, `tasks` (max 100). Each source has status success/error/unavailable, checkedAt Unix ms, note, optional successful through. Successful calendar requires exact RFC3339 windowStart/windowEnd; events need id/title/start/end/busy/allDay and optional safe source URL/preparation/notesStatus. All-day dates stay date-only and end-exclusive.

Task input: stable commitmentKey, concise title, description, priority high/medium/low, dueAt Unix ms or null, state inbox/review/waiting, optional existingTaskId, extra. Extra carries project/kind/estimated duration, confidence, reviewReason, waitingOn and sources. Evidence has type email/meeting/calendar, stable id, label, optional HTTPS URL and safe excerpt <=400 chars; email includes sender,subject,threadId. Confirmed state requires confirmed confidence; review requires a reason. The server enforces limits, not arbitrary model prose.

Do not truncate excess events/tasks and mark success. Split the queried scope or reconcile in bounded batches with explicit coverage, preserving cursors until the full scan is actually handled; if unsupported, report a partial/error rather than silently dropping candidates. Empty sources are not all-success.

The badge is configured preference only. Creating/editing an actual schedule is an external control-plane action with a separate verification gate. Refresh board reloads saved data, not sources. No distributed run lease exists in v1; use conservative cadence and avoid overlapping manual retries.
