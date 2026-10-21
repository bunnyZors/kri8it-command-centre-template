# Codex setup runbook

## 0. Establish scope and preflight

Use this runbook in the recipient's Codex, signed into their own ChatGPT account. Confirm private-repo access, available Sites tools/skill, Node >=22.13, Git/tar, and cloud scheduling availability. Read SECURITY.md. No entitlement or connector is guaranteed by cloning a repo. If Sites or unattended scheduling is unavailable, report the exact gate; don't substitute a new platform, local cron or shared personal Site without approval.

Make a private recipient copy using GitHub's template flow or a local clone. Prefer a copy without template history. Never attach another person's Site repository as the push remote. Keep local deployment source private. Do not publish or change this central template just to configure a colleague.

Ask, in a short intake:

1. Your preferred name and app title; verify the authenticated account, not only an entered email.
2. Which email/calendar/meeting accounts should this use? Which integrations are connected? Ask before selecting personal versus work accounts. Choose one calendar initially; `primary` is a provider-specific ID, not universal.
3. IANA timezone and normal working days/hours. Version 1 supports whole-hour, same-day work windows; flag split shifts or overnight schedules instead of pretending support.
4. When/how often should the briefing run: once each workday, twice daily, weekly, selected days, or manual-only? Confirm exact local times and weekend inclusion. A run starts at that time; completion before a meeting is not guaranteed.
5. First-scan window (suggest 24 hours), and any confirmed priority rules. Don't conduct an unnecessary client-ranking workshop; empty is valid.

Read connector identity/profile tools where available. When the tool cannot establish identity, ask the user to verify connection settings. Never infer ownership from a forwarded meeting note or colleague name.

Create ignored `.setup/answers.json` from the example, using explicit confirmed answers. It is non-secret; never place credentials there. Use `unavailable` for absent sources. Run `node scripts/configure-instance.mjs .setup/answers.json`. Keep `siteOrigin:null` until Sites returns the real one. This updates local instance/planning policy only. Keep ignored `.setup/installation.json` from the record example and fill each field only after verification.

## 1. Prepare source and clean local runtime

The source includes the exact UI/backend/migrations and Kri8it assets. Do not redesign or regenerate from a screenshot. Use the current installed Sites skill. If that skill requires a retained-template setup step, point it at this SANITISED source; omit old Site identity, Git metadata, runtime data and credentials. Preserve the complete application rather than overwriting it with a starter. Installed helper paths are environment-specific; discover them, do not copy a workstation path from a previous chat.

Install once using the skill's dependency helper or `npm ci`. Never overlap installers. Run TypeScript, branding tests and build. Follow TESTING.md for isolated local migrations and contract checks. `test-template` and distribution audit are for the neutral unconfigured master; after personalisation their identity-neutral assertions intentionally no longer apply. Do not change SQL migrations already applied; all three supplied migrations are schema-only, with no personal seed data.

## 2. Create the recipient's private Site

If hosting.project_id is absent, call the supported Sites create tool ONCE, with the recipient's agreed unique slug/title. New identity and storage must be fresh. Immediately persist the exact returned ID with the installed Sites helper, preserving `d1:"DB"`, `r2:null`, `capabilities:["mcp"]`. Retain the returned Site origin/expected URL; never derive IDs. Set `siteOrigin` in the ignored answers file, rerun configure-instance, and update the installation record.

If creation returns an uncertain outcome, recover/check the same operation; do not create a second Site. Credentials belong only in tool/session memory and hidden stdin. GitHub authentication is NOT a Sites source credential. Use source helpers for the new Site according to the current skill; do not embed credentials in a remote URL or commit them. The GitHub template and Sites-managed source are different repositories.

Before any service access, read current ownership/access. Require the recipient as sole allowed owner/viewer, no groups or external visitors. Stop on mismatch; never make the board public to fix a connection problem. Publish the exact pushed source and matching build archive through the owner-private operation; wait for terminal succeeded with URL. This operation provisions the new D1 and applies schema migrations. No database export/import from another installation.

## 3. Prove isolation and connections

Sign in as recipient; confirm an empty board. Verify an unauthenticated request to `/api/command-centre` is rejected, as is anonymous writing. Browser sign-in alone is insufficient: the source-account identity, Site owner and unattended updater must all be correct. The single-board constant is safe only because each installation has its OWN private Site/database and hosting-level access boundary.

Expose/connect this new Site's MCP tools using the supported Sites connection flow; fetch its current connection metadata, offer/connect the exact returned plugin, and complete user authentication. Do not reuse a plugin pointing to an old Site. Prefer `list_tasks` plus `record_command_update_json`; inspect the actual catalog. If it lags, use SECURITY.md's exact-origin private HTTP fallback. A local-only plugin/browser WebMCP is not proof of cloud-task access.

## 4. Controlled first hosted run

Obtain the user's approval of their source accounts, initial bounded window and first capture. Use the requested one-time scan; do not ingest synthetic fixtures into production. If a linked job already exists, use its Run now control; otherwise perform a controlled hosted-capable update and then set up scheduling. Apply the published playbook. Read enough relevant candidate messages/notes only, never bulk-export mail. Show missing sources as unavailable. Read back date/source cursors/calendar exact bounds/task evidence and confirm no spurious reopening or duplicates. Empty genuine results are valid, not an excuse to invent a task. Do not mark a source success if its search failed or was only partly paged.

## 5. Set up their chosen schedule

Follow SCHEDULING.md. Ask when/how often, don't assume the example. For an enabled preference, prepare proposal, confirm it, inspect linked tasks, reuse or create one, verify actual cadence/timezone/enabled state. Trigger one controlled hosted job test after publication if not already tested via the same job; verify persisted result. A connector available during setup may be unavailable to the scheduled runner; that is a failed gate, not full readiness.

Manual-only: create no job, keep disabled and badge Not scheduled, explain a new prompt to Codex is needed for a scan. The page's Refresh board button only reloads saved board data; it does not scan the mailbox.

## 6. Handoff

Report private Site URL, connected account identities, available/missing sources, chosen timing/timezone, exact job ID, latest verified run, limits and what remains untested. Store no source bodies/secrets in the record. One manual hosted success is not a natural scheduled occurrence; verify the next natural occurrence separately. Use docs/TESTING.md's colleague pilot checklist before rolling out to more staff.
