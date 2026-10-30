# Orchestrator progress (M6–M8)

User is away (gym). Run unattended; user approved everything below on 2026-10-30.

## Done

- M6 committed 07ff966, M7 committed b107ddc, Prettier ignore fix a7988f9.
- New GitHub branch `milestones/m6-m8` on iampaviic/tournament (pushed up to a7988f9). Local branch `milestones/m6-m8` tracks it.
- Checkout stays on `claude/cool-archimedes-iqm428`; push with `git push origin HEAD:milestones/m6-m8`, then `git branch -f milestones/m6-m8 HEAD`.
- CSRF finding (M7): user chose "leave it as is". Do not change.

## Running

- M8 workflow wf_cf400e0957ed28e5 (profiles, Steam picker, polish). Commits locally, no push.

## Standing policy from the user

- A. If M8's `converge` loop pauses after 2 passes without APPROVED: `extend_repeat` by 1. If still not approved after that, leave it paused for the user and commit nothing.
- B. After M8 commits: push it to `milestones/m6-m8`. Then launch `agent://wf-coder` (no creator approval needed) to fix CI so `pnpm test:unit --run` and `pnpm test:e2e` pass without a `.env` file, the way GitHub CI runs (CI failed with "DATABASE_URL is not set" in db specs: vite.config.ts db project sets test.env DATABASE_URL but `$app/env/private` doesn't see it; local runs likely use .env's dev DB instead of tournament_test). Separate commit, push to `milestones/m6-m8`, watch CI (`gh run list --repo iampaviic/tournament --branch milestones/m6-m8`) until green; fix further CI failures the same way.
