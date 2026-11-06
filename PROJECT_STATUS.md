# RestroRX project status

Baseline checked 5 November 2026.

## Verified production baseline

| Area | Evidence and status |
| --- | --- |
| Source and hosting | `Chefamey/Restrorx` default branch `main` at `4825fd5`. Public homepage and dashboard bodies matched that commit byte for byte. Both domains returned Vercel headers and GitHub reports a successful Vercel deployment for the commit. |
| Diagnostic | `GET /api/diagnose` returned the health response. Production source uses a Gemini-or-rules path, accepts unvalidated inputs, includes contact details in the provider prompt and can show a monthly loss estimate based on overlapping assumptions. Production POST was outside this public probe. |
| Lead access | `GET /dashboard.html` returned public HTML with a client-side password gate. `/admin`, `/api/admin-leads` and `/api/leads` returned 404. The published baseline SQL grants anonymous lead access if applied. Production grants, policy state and data exposure are unverified. |
| Lead flow | Source sends details from the browser to Supabase. The CX flow reports success without checking for a successful update. Live capture, retrieval and historical lead counts are unverified. |
| Existing launch work | `origin/codex/restrorx-market-launch` at `a16242b` already contains server-side lead capture, admin auth, validation and privacy/SEO drafts. Its public HTML differs from production. The latest brand and lead schema changes are on `main`. |
| Growth and content | The live build and repository have no verified analytics setup. No scheduling or publishing platform was accessed. Historical campaign and publishing state remains unverified. |

Public sources include the [RestroRX homepage](https://www.restrorx.com/), the [production baseline commit](https://github.com/Chefamey/Restrorx/commit/4825fd573a0288df4daa89a08a6a10642f31d80f) and its [Vercel deployment record](https://vercel.com/chef-amey-s-projects/restrorx/29zWSGEEQB8sAwVaZopanZTL5tUZ).

## Cutover check · 6 November 2026

The owner authorised the cutover. The public production check showed both homepages at `4825fd5`. The diagnostic health route responded and the legacy dashboard was still reachable.

The original Supabase project was paused, which made the website's database address unreachable. The owner approved resuming it. An early SQL check during recovery returned the intended grants, but a later check on the healthy primary found the old grants had returned. The tested migration was reapplied after the primary reported healthy. A separate SQL query confirmed forced RLS, zero lead policies and no read, insert or update privileges for the browser roles. The live REST API then returned HTTP 401 with the old public key. The server role retained access. The SQL checks inspected permissions without querying customer records.

GitHub's production branch ruleset is active. It requires a pull request and blocks branch deletion and force pushes. GitHub secret scanning and push protection were already enabled. CodeQL default setup was enabled. GitHub flagged a historical Google API key, which matched a misnamed Vercel variable. The owner reported resetting it. GitHub's validity indicator was Unknown during the check.

Vercel Standard Protection is active for deployment URLs. The production Supabase URL and admin username were saved. The remaining production credentials require direct owner entry. Until the secure application is promoted, the legacy site cannot save through the anonymous database path.

## Review candidate

Review branch `codex/restrorx-core-repair` reuses the launch branch's Vercel/Supabase pattern and starts from the live branded baseline. Results are available before the enquiry form. The browser sends contact details only on an explicit enquiry. The server writes once per enquiry key, confirms CX updates against a matched row and requires authentication for lead retrieval. CSV export covers the current filtered view of up to 200 recent enquiries.

The diagnostic uses deterministic RestroRX rules, reports relevant missing data and presents a first check. Historical stored scores were calculated by the earlier engine. Comparisons across the cutover need to account for that change.

The automated handler tests, local Vercel production-target build, synthetic Chrome walkthrough and disposable PostgreSQL migration checks passed. Live Vercel environment configuration, Supabase grants and actual storage behavior remain release gates. Production promotion and live lead capture checks are pending.

The release candidate adds same-origin scripts, an HTTPS-only response policy, cross-site write rejection, bounded app-level request limits and a read-only test-and-build workflow. App request limits apply per running instance.
