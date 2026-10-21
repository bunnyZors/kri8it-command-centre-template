# Kri8it Command Centre — private staff template

A personal command centre for email actions, meeting commitments and a read-only calendar. Same Kri8it dark/turquoise interface, Inter, mobile status tabs, Today priorities, agenda, briefing notes, review queue, suggested time blocks, source evidence and durable priority feedback.

**This is source and setup instructions, not a connected installation.** Each colleague creates a separate owner-private Site, empty database, account connections and linked cloud briefing job. No production identity, personal tasks, source content, credentials or Git history is included. Connector availability and account entitlements must be checked in the recipient's Codex.

## Give Codex this instruction

> Set up my own private command centre from this repository. Read AGENTS.md and docs/CODEX_SETUP.md first. Keep the existing design and behaviour. Ask me which accounts/sources to use, my timezone and working hours, and when/how often I want the scheduled briefing (including weekdays/weekends or manual-only). Create a new private Site and empty database under my account, never reuse another person's Site. Verify connectors and a controlled first hosted run, preserve read-only email/calendar boundaries, and report anything unavailable. Do not claim scheduling works just because a task was created.

## Start here

- [Codex installation guide](docs/CODEX_SETUP.md) — step-by-step gates and handoff.
- [Scheduling](docs/SCHEDULING.md) — ask the user, generate proposal, create one linked job, verify.
- [Connectors](docs/CONNECTORS.md) — identity checks, fallback sources, unattended access.
- [Security](docs/SECURITY.md) — mandatory owner-only hosting and isolation.
- [Architecture and payloads](docs/ARCHITECTURE.md).
- [Testing and colleague pilot](docs/TESTING.md).
- [Troubleshooting](docs/TROUBLESHOOTING.md), [updates](docs/UPGRADES.md), [prioritisation](docs/PRIORITISATION.md).
- [Example setup answers](setup/answers.example.json), [installation record](setup/installation-record.example.json).

## Local developer commands

Node >=22.13, Git and tar; use the current installed Sites skill for environment-specific helpers. From this directory: `npm ci`, `npm run build`, `npm run dev`. Dependencies and all three schema migrations are included; see [testing](docs/TESTING.md) before applying local migrations. No external AI API key is required by the application code; the hosted agent's capability is a separate account entitlement.

Before distribution: `node scripts/audit-template.mjs`, `node scripts/test-template.mjs`, `node scripts/test-setup-flow.mjs`, `node scripts/test-branding.mjs`, `node scripts/test-work-plan.mjs`, `node node_modules/typescript/bin/tsc --noEmit`, `npm run build`. API tests require an isolated local preview database. No tests should target a live Site.

The default template says **Not scheduled** and has no Site ID. Configure only in a recipient copy. `node scripts/configure-instance.mjs .setup/answers.json` applies validated non-secret preferences; it does not connect accounts or create jobs. `node scripts/prepare-schedule.mjs` proposes a task after a recipient Site exists; it does not submit it.

## Boundaries

Never send/modify email, create/change calendar events, execute underlying tasks, expose raw source bodies, or share a personal board from a scheduled run. Missing sources must show unavailable, not pretend freshness. Client rankings start empty. There is no staff-wide shared database or central surveillance view.

This v1 is prepared for a **single-colleague pilot**, not a claim that a second account installation has already succeeded. See the pilot checklist before wider rollout. Internal-use distribution only; vendor/font licenses are retained. See [distribution terms](LICENSE.md).
