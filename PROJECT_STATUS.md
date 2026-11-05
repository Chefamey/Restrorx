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

## Review candidate

Local branch `codex/restrorx-core-repair` reuses the launch branch's Vercel/Supabase pattern and starts from the live branded baseline. Results are available before the enquiry form. The browser sends contact details only on an explicit enquiry. The server writes once per enquiry key, confirms CX updates against a matched row and requires authentication for lead retrieval. CSV export covers the current filtered view of up to 200 recent enquiries.

The diagnostic uses deterministic RestroRX rules, reports relevant missing data and presents a first check. Historical stored scores were calculated by the earlier engine. Comparisons across the cutover need to account for that change.

The automated handler tests, local Vercel production-target build, synthetic Chrome walkthrough and disposable PostgreSQL migration checks passed. Live Vercel environment configuration, Supabase grants and actual storage behavior remain release gates. The candidate is local.
