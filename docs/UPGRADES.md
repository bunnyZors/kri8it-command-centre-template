# Template maintenance and upgrades

The central private template and each recipient's Site source have independent history. Template version 1.0.0 is a sanitised baseline. Do not overwrite recipient instance/planning policy, Site ID/origin, schema migration history, source cursors, database or job configuration when pulling fixes.

For maintainers: develop in the neutral distribution copy, run audits/tests/build and inspect the full staged diff. No personal installation should be merged back wholesale. Ship versioned code/doc fixes and note changed contracts. Keep third-party licenses and Kri8it assets. Never push runtime data or credentials, even to a private repository. Keep the repo private and template-enabled; granting new people access is a separate owner action.

For a recipient: back up/review their source changes, compare upstream code updates, preserve local config and returned hosting identity. Use their current Sites source workflow to publish only their instance after explicit update approval. Never republish to the template maintainer's Site. Append migrations only; do not replay old migrations. After publication test readback and owner-only access; changing source alone does not prove deployment. New connector/scheduler behavior needs hosted verification again.

Schedule updates change two things: instance preferences (badge/playbook) AND actual linked task. Verify both. A code update must not reset cadence to the example. Unknown/disabled model controls remain unverified; do not reset model choices as part of a cosmetic update.

Pilot findings should be minimal, sanitized issues: environment, template version, failing step, expected/actual behavior. Never include a colleague's messages, task titles, calendar contents, tokens or screenshots of private data without specific approval. Keep per-user operational evidence in their private ignored installation record.
