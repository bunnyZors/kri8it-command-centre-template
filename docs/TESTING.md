# Verification and single-colleague pilot

## Neutral distribution checks

Run in a clean unconfigured template checkout:

```
npm ci
node scripts/audit-template.mjs
node scripts/test-template.mjs
node scripts/test-setup-flow.mjs
node scripts/test-branding.mjs
node scripts/test-work-plan.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Review diff and tracked files as well as the pattern audit. The audit is a bounded guardrail, not a claim of comprehensive secret detection. Tests cover neutral owner/site identity, empty client context, validated cadence, weekend/DST scan headroom, manual-only/weekly choices, timezone helpers, brand assets, planner freshness/busy intervals and privacy constraints.

## Isolated local API tests

Only run synthetic tests on loopback, never the deployed Site. From the template root build first, then on a NEW local DB apply the three pending files in order with:

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dapper_network.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_cynical_mantis.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_bent_shiver_man.sql
```

Do not replay applied migrations. Sites applies hosted migrations during publishing; do not run these local commands against remote DBs. Start `npm run dev`, use the printed loopback URL and local sign-in. `node scripts/test-command-centre.mjs` checks ingestion idempotency, cross-source evidence, manual edit/completion preservation, Review/Mine/Not mine, malformed JSON, cursor retention and local CRUD. It is pinned to localhost:5173 and uses synthetic data only. `node scripts/seed-responsive-preview.mjs` is an optional LOCAL fixture. Both assume neutral Dublin/primary configuration for deterministic fixture dates; run before personalisation or in a disposable neutral test copy, not by resetting a recipient's real settings.

Inspect desktop and 390px phone: logo/type/accent, source freshness, priorities, separate notes disclosure, all status tabs/counts, search, full descriptions/evidence and reachable editor actions. Check card bounds as well as whole-page overflow, including long unbroken text. Viewport simulation is not physical soft-keyboard/screen-reader testing.

## Configuration test

In a disposable copy, apply confirmed synthetic preferences in another timezone and two same-minute daily times. Check generated badge/playbook/working hours and the exact updater timezone/calendar schema agree. Test invalid timezone, wrong Site origin, mixed-minute times and insufficient lookback are rejected before writes. Check manual-only creates no proposal/job. Don't deploy a synthetic test Site just to check configuration.

## Colleague acceptance — must be a second account

- [ ] Colleague can access the private GitHub template and understands personal-source scope.
- [ ] Their Codex follows docs without prior chat context or maintainer filesystem paths.
- [ ] Intake confirms their account(s), timezone, working hours, initial scan and cadence/weekends/manual-only.
- [ ] New owner-private Site ID and origin; separate empty D1; no existing template-owner tasks/client rules.
- [ ] Anonymous service GET/POST rejected; no extra allowed viewers/groups.
- [ ] Correct Site MCP connected; sources identified correctly in interactive AND actual hosted run.
- [ ] Bounded first scan handles a genuine action or honestly no actions; source links/cursors/bounds valid.
- [ ] Completed/dismissed/manual edits preserved on replay; no duplicate cross-source tasks.
- [ ] Unavailable connector/notes visibly reported; no assumed calendar availability.
- [ ] Chosen schedule is saved once, with correct timezone/weekends and no overlap.
- [ ] Manual hosted Run now persisted readback verified; then first natural occurrence separately verified.
- [ ] No email/calendar mutation or raw-body/credential leakage; privacy and priority feedback explained.
- [ ] Colleague approves usability and knows how to pause/change cadence or request a manual scan.

Keep minimal non-secret installation evidence in ignored `.setup/installation.json`. Record sanitized pass/fail findings in the maintainer project, never their mailbox content. Do not claim rollout-ready from build checks alone.
