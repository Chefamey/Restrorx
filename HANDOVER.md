# RestroRX handover

6 November 2026 · Review branch `codex/restrorx-core-repair` based on `main` at `4825fd5`.

## What changed

- The homepage preserves the existing brand and runs the screening without contact details or a provider call. It validates inputs and gives a first operational check without converting screening signals into monetary loss estimates.
- Enquiry and CX writes go through Vercel functions. The server recomputes the diagnosis, protects CX updates with a signed receipt and confirms database matches. Retrying the same enquiry key returns the existing record.
- The dashboard and data endpoint require server-side auth. Only the homepage is in the static build. The legacy dashboard path redirects to the admin route. The dashboard still handles historical lead rows and exports up to 200 recent results.
- The SQL is transactional and additive for existing lead columns. It revokes browser-role access and grants service-role read, insert and update access. It preserves lead rows.

## Build and verification

Use Node.js 24 to match the local Vercel build. The application has no package install step.

```sh
node --test
node scripts/build.js
git diff --check
```

The Vercel production-target build passed with synthetic local project settings. Its output had the public homepage and four function bundles, with the dashboard bundled only into the admin function. A temporary Chrome harness exercised the mobile diagnostic, enquiry and CX failure/retry states, and the desktop dashboard, email link and CSV with simulated storage. The SQL was applied twice in a disposable PostgreSQL instance against two starting schemas. In both cases it preserved the legacy row, denied anonymous and authenticated browser-role access, and allowed service-role reads, inserts and updates. The public production probe was read-only.

## Release gates and recovery

1. The owner approved cutover on 6 November. Confirm authenticated access to the existing Vercel project and Supabase database. Inspect role grants/policies and deployment settings with the owner. Confirm current backup and how to restore it.
2. Configure server-only `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (a Supabase secret key or the existing legacy service-role JWT), `LEAD_UPDATE_SECRET`, `ADMIN_USER` and `ADMIN_PASSWORD_HASH` in Vercel's Production environment. Use a new high-entropy admin password and SHA-256 hash. Keep the signing secret stable across instances and releases because it also derives enquiry IDs.
3. Rehearse `supabase-setup.sql` and a synthetic end-to-end lead against an authorised isolated database or staging environment. Confirm anonymous roles are denied, service-role storage works, and historical records remain readable to the operator. Recheck the actual Vercel project settings.
4. Coordinate the policy lock-down and secure app promotion in an approved release window. Revoking anonymous grants while the legacy app is live will stop legacy lead writes. Verify both production domain variants and the legacy dashboard redirect after promotion.
5. If the release fails, keep lead access closed and use a verified secure deployment or temporary enquiry fallback while repairing it. Re-enabling anonymous reads or writes would reintroduce the baseline exposure. Review the legacy embedded admin credential for reuse and replace it anywhere it was used.

## Latest release checkpoint · 6 November 2026

- The original paused Supabase project was restored. After the primary was healthy, the migration was applied and rechecked. Forced row security is enabled, browser roles have no lead privileges, the server role retains access and the legacy anonymous REST request receives HTTP 401.
- The GitHub default branch now requires a pull request and blocks force pushes and deletion. CodeQL default setup was enabled and secret push protection was verified. The owner reported resetting the historical Google credential. Verify the old key's revocation before resolving the GitHub alert.
- Vercel Standard Protection was already enabled. The Supabase URL and admin username are set for Production. The owner supplies the remaining secrets directly in Vercel. A fresh production-target deployment is required after the secrets are saved.
- The hardening change moves scripts to separate same-origin assets, blocks cross-site browser writes, limits admin requests, supports Supabase secret keys and adds GitHub test-and-build checks with pinned actions. The rate limiter is per application instance.
- Stage the reviewed commit in the existing Vercel project. Verify the staged application against the restored database with a clearly labelled synthetic enquiry and then promote the verified deployment. Use the release gate and recovery steps above.
