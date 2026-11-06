# RestroRX project instructions

RestroRX helps restaurant owners decide what to investigate and fix first. Chef Amey Marathe owns product and commercial decisions. The customer journey is visitor → understand the offer → run the diagnostic → see results → request help → confirmed enquiry.

## Working rules

- Use the latest explicit founder instructions, then the current brief, repository docs, existing behavior and older context. Surface material conflicts.
- Use the existing `Chefamey/Restrorx` repository and its Vercel/Supabase architecture. Inspect Git status and preserve local work. Confirm the live deployment before editing and keep the existing brand, domain, data and integrations.
- Prioritise core reliability, useful results, secure lead capture and retrieval, then measurement and conversion. Keep the scope narrow and reversible. Obtain approval before major architecture decisions, production changes, paid services or destructive operations.
- Keep screening and money calculations deterministic. Use supplied inputs, label assumptions and missing data, and avoid presenting internal cut-offs as benchmarks or inventing projected savings.
- Keep contact collection separate from diagnosis. Confirm persistent storage before displaying success. Keep credentials and lead data out of client code, docs, test data, logs and analytics. Use synthetic fixtures for QA.
- Access connected services only when authorised for the specific integration. Use approved commercial terms. Publishing or sending messages requires explicit authorisation. Track content as drafted, approved, scheduled or published with evidence.
- Run `node --test`, `node scripts/build.js` and `git diff --check`. For changes to the Vercel config, run a local Vercel production build and inspect the generated routes and function bundles.
- Maintain `PROJECT_STATUS.md`, `BACKLOG.md` and `HANDOVER.md`. End each session with the changes, verification, blockers and next priority.
