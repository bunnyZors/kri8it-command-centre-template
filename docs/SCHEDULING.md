# Recipient-owned scheduling

## Ask first

Ask “When and how often should your briefing run, in which timezone, and should it include weekends?” Offer once before work, twice daily, weekly/selected days, or manual-only. Confirm exact times and source scope. `schedule.enabled` expresses an approved preference, not a verified live task. Never create a job from unconfirmed example defaults.

Configuration supports one weekly recurrence with selected weekdays and up to four daily times sharing the same minute (e.g. 08:00 and 13:00). Mixed-minute, monthly or complex holiday schedules require additional supported-scheduler work; stop and discuss rather than introduce extra unintended occurrences. Overnight/split working hours are also not implemented in v1.

`scan.maxLookbackHours` must cover the longest gap between occurrences plus overlap/DST headroom. Validator enforces 70 minutes of headroom; 96 hours covers ordinary weekday mornings, 192 covers weekly. Maximum is 336 hours. The first scan uses the separately approved initialLookbackHours (default 24), not automatically the whole cap. Missed/over-cap intervals are surfaced; never silently skip them or claim full coverage. Meeting revisit window can be 1–31 days and forward calendar 1–14 days; pagination/payload limits still apply.

## Generate, inspect, submit

1. After recipient configuration, new Site ID and origin are saved, run `node scripts/prepare-schedule.mjs`. It prints a non-secret `{task:{title,prompt,schedule,timezone}}` proposal using current preferences and the next future local occurrence. It does not create a job. Keep raw recurrence syntax out of the user-facing explanation; describe local days/times instead.
2. Confirm the proposed cadence in plain language. Read fresh Sites `get_site` for THIS recipient Site. Inspect linked automations, including paused ones. Missing/null metadata means duplicate checking is unavailable: do not create. If a job covers this work, edit/reuse it; preserve paused state unless user asked to enable. No parallel duplicate monitor.
3. For no matching job and explicit scheduling consent, use the supported Sites create-schedule tool. Copy the fresh response's schedule request ID; pass the proposal's task and exact Site ID. Retain request ID and arguments after an uncertain result; re-read before retries. Never create a replacement with a fresh key just because a response timed out.
4. If editing is available only in the scheduled-task UI, computer use is a fallback. Keep the task attached to its Site; preserve prompt, notification intent and paused/enabled state. If UI authentication is needed, let the user complete it. Do not invent unsupported API routes.
5. Verify saved timezone, cadence, enabled state and Site link via native readback, not the preference badge. Compare the saved prompt. Record the job ID and status in ignored installation evidence.

## Test the actual runner

Trigger Run now once via the supported job control; do not create a second task for a test. It must fetch the current planning.playbook and recipient's accounts, write one atomic update and read it back. Verify changed briefing timestamp/date, independent source freshness/cursors, exact calendar bounds, task evidence and a valid planning warning state. Missing integrations may yield a deliberately partial briefing; list those limitations clearly.

If it fails: preserve successful cursors, notify the owner and repair the identified connection/transport issue. Do not repeatedly trigger overlapping scans. The playbook instructs no overlap, but there is no distributed lease in this v1 backend: avoid short intervals and confirm the current run has ended before a manual retry. The next natural occurrence remains a separate acceptance item.

## Notifications and changes

No routine chat summaries: the board is the briefing. Notify only new urgent work, source/update failure or a real user decision. Preserve this intent if the scheduler offers extra notification settings. Ask before changing cadence; update preferences/badge/playbook and the actual saved job together, then verify both. Choosing manual-only means pause the known existing job and verify it; changing the badge alone does not stop a job.

Model configuration is product-dependent. Use light reliable effort for routine work if configurable; no high-effort retrieval defaults. Disabled/unavailable controls mean routing is unverified. Do not claim per-step model switching just because the prompt recommends it.
