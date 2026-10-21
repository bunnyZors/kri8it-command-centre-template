# Security boundary — mandatory

This is a **single-person owner-private Site**, not a tenant-isolated shared SaaS. Each installation gets a new Site ID, own D1 database, Site MCP endpoint and job. `private-owner-board` joins service/browser records within that one database; it is not a cross-user tenant key. Request handlers rely on Sites dispatch authorization. ChatGPT sign-in supplies identity, but does not independently enforce an owner-only allowlist for every service route.

Never deploy public, workspace-wide or with extra viewers/groups. Before deployment/service access, verify the recipient is sole allowed owner/viewer, no groups or external grants. Stop on any mismatch; do not use a private deployment call as an access probe. Sharing changes need a separate authorization and a security redesign. Do not bypass auth, trust user-supplied identity headers from a public direct Worker URL, or disable certificate checks. The vendored local-auth mock is for loopback preview only, never proof of production authentication.

## Repository hygiene

Only source, schema migrations, synthetic fixtures, neutral policy and licensed brand/font assets belong in this template. No runtime database, source evidence, personal client rules, logs/screenshots, tokens, OAuth state, `.env`, `.dev.vars`, `.wrangler`, build output, original `.git`, machine config or installation records. `.gitignore` is a convenience, not a secret scanner. Audit the files AND the staged diff before the first commit/push; start fresh history. Never copy an old Site identity to the recipient. No credentials in Git remote URLs.

## Private HTTP fallback

Prefer the new Site's authenticated MCP. If schemas lag, read the exact recipient Site's metadata using supported Sites tools, verify owner-private access, and obtain its existing service credential in memory. Only send to the exact configured origin from that verified Site response, at `/api/command-centre`. The included triage-client pins the configured origin, requires the new project ID and rejects cross-origin redirects. It does not itself prove Site ownership: that check remains a prerequisite.

Accept credentials only via non-TTY stdin/pipe or raw hidden stdin. Never command arguments, files, environment dumps, console output or documentation. For a pipe, send complete UTF-8 JSON then EOF. The fallback returns the board payload; project only needed fields before model context and do not persist raw results. Store no complete source bodies or credentials. On uncertain POST outcome, read persisted state before retrying; do not blindly repeat.

## Application limits

Mail/calendar remain read-only. Capturing a task never authorizes its execution. Automated sources may be wrong or malicious; ownership ambiguity belongs in Review. A source success is not a completeness guarantee when pages/windows are missing. Calendar suggestions are estimates, not bookings. Preserve completed/dismissed/user-edited decisions. Always test anonymous read/write rejection on the deployed owner-private Site, without exposing the private service credential to the test.
