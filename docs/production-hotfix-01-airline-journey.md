# Production Hotfix 01 — Airline Journey Lineage & Mobile Return

- Base: Production HEAD `946003b0deb2a058468203172fa8febfe824b13a` (https://flight-attendant-iota.vercel.app)
- Trigger: PRODUCTION QA DEBT CLOSURE V1 → `PRODUCTION_RELEASE_SLICE_QA_ISSUE_FOUND`
- Scope: BUG-1, BUG-2, ISSUE-6, ISSUE-7 (required) + ISSUE-3, ISSUE-5 (optional, small). No new features, airline data, questions, migrations, auth or AI-gate changes.

## BUG-1 · Application → Experience link silently failed

**Cause.** When the Application Coach was opened from an airline workspace without a specific question (generic context), the work draft was saved under the legacy id `"active"` (`application-coach.tsx`), while `linkExperienceToWorkDraft()` only looked for `airline-journey:{airlineId}:{questionId|general}` (`application-answer-repository.ts`). The link returned `draft_not_found`, `home-dashboard.tsx` ignored the failure and `experience-library.tsx` `return`ed without changing view — the experience was saved but nothing happened. Coming back manually landed on the coach home and the template selection was lost.

**Fix.**
- Draft identity contract: every airline-workspace draft now uses the canonical id `airline-journey:{airlineId}:{questionId ?? "general"}`; the coach derives a draft journey context (`prompt.journeyContext ?? {...initialJourneyContext, airlineId}`) and saves `journeyContext` with it.
- Compatibility: `findJourneyWorkDraft()` looks up the canonical draft first, then a legacy `"active"` draft of the same airline; `linkExperienceToWorkDraft()` promotes a legacy draft to its canonical id on the first link. No migration.
- Link no longer requires `draft.airlineId === context.airlineId` (the id already encodes the airline); a missing `airlineId` is filled from the context.
- Return: `onSelectForJourney` always navigates back to the Application Coach — with `journeyContextWithExperience` when the link succeeded, otherwise with the same draft context (safe fallback instead of a silent no-op). The coach resumes the draft at the experience step with the linked experience pre-selected.
- Cancel/back from the library returns to the same draft context (experience step), not the coach home.

## BUG-2 · Application Coach could not be left (mobile: only a reload)

**Cause.** `ApplicationCoachHome` had no back/return affordance, and `featureShell` sidebar navigation only called `setActiveNav` without leaving `trainingView`, so the desktop sidebar was inert and the mobile layout (sidebar hidden, no bottom nav) had no escape.

**Fix.**
- `ApplicationCoachHome` now receives `onExit` (header back arrow, 44px) and `returnLabel`; when opened from an airline workspace it shows the full-width CTA **타겟 항공사 준비로 돌아가기** (`data-testid="application-coach-journey-return"`). Without a workspace origin the back arrow uses the existing safe home/back behaviour.
- The answer detail also offers the journey return when the coach was opened from a workspace.
- `home-dashboard.tsx` gains `leaveFeatureView(target)`: resets transient journey state, sets `trainingView` back to `dashboard` and switches the requested tab. It is wired to the Application Coach, Experience Library and Single-Interview result shells only (minimal safe scope; other feature shells unchanged).

## ISSUE-6 · Official question replaced by a generic prompt in Single Interview

**Cause.** `startAirlineWorkspacePractice()` mapped every workspace question to a catalog fallback (`sj1` / `cs1` / `be1` / `im2`) and only kept the workspace lineage in `sourceContext`.

**Fix.**
- `workspaceQuestionToInterviewQuestion()` mints a practice question with id `airline-question:{workspaceQuestionId}`, the original `questionText` as prompt, a category mapped from the workspace category, rubric/range inherited from the catalog template of that category and `airlineTags: [airlineId]`. Only INTERVIEW-kind, practicable (official / verified / accepted) questions qualify.
- Guidance under the prompt states the provenance; OFFICIAL_ARCHIVE reads **"과거 공식 질문입니다. 당시 채용 자료 기준이며 현재 채용 질문과 다를 수 있습니다. 채용 시기: …"** so archived questions are never presented as current.
- `resolveInterviewQuestion()` / `isAllowedInterviewQuestion()` resolve these ids (favorites, queue, history, resume, retake all work). History and result-revisit components use the resolver.
- The generic fallback remains only for legacy paths (no question / non-practicable question).

## ISSUE-7 · Retake dropped `targetAirlineId`

**Cause.** `retakeSingleInterview()` re-validated `attempt.targetAirlineId` with `airlineContextAllowed()` (the AI-context gate) and dropped it for airlines without AI context, so the retake was not attributed to the airline and the result return fell back to the airline list.

**Fix.** The retake carries `targetAirlineId ?? sourceContext.airlineId` forward as lineage (AI context stays gated downstream by `getApplicationAirlineContext`), resolves workspace question ids, and — for `airline_workspace` lineage — restores `workspaceAirlineId` plus a journey context (`journeyContextFromPracticeLineage`) so the result returns to the airline detail, Questions tab, with the question context. `previousAttemptId`, `attemptNumber` and `sourceContext` were already preserved.

Not changed (follow-up): `restoreSingleInterviewConfig()` for a *resumed* (interrupted) interview still downgrades `targetAirlineId` through the AI-context validator; its existing tests pin that behaviour.

## Optional issues

- **ISSUE-3 (fixed).** The experience picker now lists experiences that are already linked to the draft even with a 0 match score (reason: "이 문항에 직접 연결한 경험"), and distinguishes "저장된 경험이 아직 없어요" from "저장된 경험은 있지만 현재 문항과 연결된 경험이 없습니다".
- **ISSUE-5 (fixed).** PENDING / REJECTED user reports are excluded from `buildPreparationStatus()` question counts and from the journey's `recruitmentPeriods`; the workspace shows them separately ("내 제보 N건 검토 대기 · 공식 집계 제외", `countPendingUserReports`). The `buildPreparationStatus` return shape is unchanged.

## Tests

`lib/production-hotfix-01-airline-journey.test.ts` — 27 deterministic tests: draft identity (1–9), application return (10–14), official question practice (15–19), retake lineage (20–26), pending report counts (27). Suite: 1212 → 1239, all passing. `tsc --noEmit`, `validate:profile-privacy`, `next build`, `git diff --check` pass.

## Local QA (dev server, Jin Air)

- Flow A Jin Air → Application → 답변 작성·수정 → template → 새 경험 추가 → 6-step experience → 경험 저장 → returned to the same draft (experience step), experience pre-selected, draft `airline-journey:jin_air:general` `selectedExperienceIds=[…]`; cancel/back from the library also returned to the draft; answer saved with 1 experience; "타겟 항공사 준비로 돌아가기" → Jin Air workspace Application tab (연결 경험 1개).
- 390×844: Workspace → Application → back arrow chain → coach home shows the return CTA (44px, in viewport, sidebar hidden) → returns to the Jin Air workspace without reload.
- Official question card → 단일 면접: original Jin Air question text shown, category 고객 상황대처, archived guidance, resume `questionId=airline-question:9-jin-2025-video-presentation`, `targetAirlineId=jin_air`.
- Attempt 1 → result → return (Questions tab, question context) → 면접 훈련실 "같은 질문 다시 연습" → attempt 2 (`previousAttemptId`, `attemptNumber 2`, `targetAirlineId jin_air`, OFFICIAL_ARCHIVE) → return to Jin Air detail; workspace shows 면접 연습 2회.
- Desktop sidebar "홈" from the Application Coach now returns to Home.

Environment notes: the Browser pane was hidden during QA, so interactions were dispatched as DOM click events at the elements' hit-tested coordinates (pointer-level clicks time out while the pane is hidden). `node_modules` had to be rebuilt (hoisted layout; D: is exFAT and cannot hold pnpm's symlinked store) and `.next/dev` was cleared once after a stale Turbopack cache panic; neither affects tracked files.
