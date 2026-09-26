# Training Loop V2

- Base: `9c28621` (production `https://flight-attendant-iota.vercel.app`)
- Scope: one derived module plus a compact result panel. No new airline or question data, no microphone/STT change, no schema, no auth, no AI-context promotion, no scoring engine.

## Loop model

```
START → PRACTICE → RESULT → REVIEW → RETAKE or NEXT → COMPLETE → DAILY / WEEKLY / JOURNEY
```

Every state is **derived**, never stored. `lib/training-loop.ts` reads the records the feature repositories already own — attempts, self-introductions, mock sessions, saved answers, the retake queue, favorites and the airline journey — and returns what the result screen needs. The loop owns no completion state, writes nothing, and adds no counter of its own.

## Supported training types

`single_interview`, `mock_interview`, `self_introduction`, `application_answer` share one `TrainingLoopContext`
(trainingType, origin, airlineId, questionId, questionProvenance, previousAttemptId, attemptId, attemptNumber, returnTarget). The single-interview result is wired first; the others reuse the same contract. Competency is referenced only as a separate coaching result and its scoring is untouched.

## Evidence rules

`trainingEvidenceMode()` decides what a saved practice can honestly support:

| mode | when | allowed evidence |
|---|---|---|
| `actual_audio` | transcript really came from the recording | content analysis + speech + audio |
| `audio_only` | a recording exists but was never transcribed | audio/timing only |
| `text_analysis` | typed practice with saved text | content analysis only |
| `text_practice` | neither transcript nor audio | none |

So an **AUDIO ONLY** result never shows transcript-based points, and a **text practice** never shows speech or audio metrics. Strengths and improvement points are quotes of what the saved analysis already produced — the loop invents none.

Caps: **strengths ≤ 3**, **improvement points ≤ 3** (ordered by the saved priority). With nothing found the screen says exactly *"이번 결과에서 추가로 확인된 보완 포인트가 없습니다."* — never "완벽합니다" or a pass verdict.

No trait inference. The model is asserted to contain none of 자신감이 부족 / 성격이 / 소극적 / 서비스 마인드 / 승무원 적합, and no readiness, hiring probability, fit score, 향상도 or `%`.

## Retake

The result's primary CTA is **같은 질문 다시 연습**, shown only for a completed attempt. It restarts the same question **inside the practice engine**, carrying the finished attempt as the parent, so `previousAttemptId`, `attemptNumber`, `targetAirlineId`, `questionId`, provenance and origin all survive. Measured in the browser: attempt 1 → attempt 2 with `attemptNumber 2` and `previousAttemptId` pointing at attempt 1.

**이 항목에 집중해서 다시 연습** is the same question again, with the first real improvement point quoted as the reason. It never mints a new question.

## Next action

Deterministic ladder — no randomness, no model call:

| rule | condition | next |
|---|---|---|
| A | an open retake-queue item for another question | that queue item |
| B | no completed self-introduction | 60초 자기소개 |
| C | self-introduction exists, no completed mock | 모의면접 |
| D | no saved application answer | 지원서 답변 |
| E | the target airline journey has a next step | that journey action |
| F | otherwise | the existing daily plan target |

**Infinite-retake guard**: after `REPEATED_QUESTION_LIMIT` (3) consecutive completed attempts on one question, rule A takes priority and says so ("같은 질문을 연속으로 연습했습니다"). The ladder never proposes the question just practised.

## Comparison

Only the previous attempt of the **same questionId and same airlineId** is compared. Deltas are real measured values, never a synthetic improvement score:

```
답변 시간 8초 → 10초
추임새 5회 → 2회            (actual_audio on both sides only)
말하기 속도 170 WPM → 145 WPM
긴 쉼 3회 → 1회             (audio evidence on both sides only)
구조 누락 2개 → 없음
```

Measurement contracts are never mixed: a speech metric is compared only when both attempts were `actual_audio`, an audio metric only when both had audio. History shows at most 3 previous attempts of the same question.

## Daily / Weekly / Journey integration

Unchanged and reused. Completion still flows through the existing engines when a practice actually finishes — opening a result never completes anything, and the loop adds no second counter, so one attempt is never counted twice. Airline lineage keeps a Jin Air attempt out of a Korean Air journey; `previousAttemptsFor()` filters on airlineId as well as questionId.

## Home V2 integration

Home reads the same repositories, so finishing a practice updates recent activity, the snapshot, the gaps and the next action with no Home-specific storage. Verified in the browser: two completed attempts appeared in Home recent activity immediately after the loop's next hand-off.

## Resume vs retake

An incomplete practice is **이어서 하기** (the daily resume path). A completed attempt gets **retake / next** and is never presented as resumable — `buildTrainingLoopModel` returns no retake, no next and no history for an attempt whose `completed` is false.

## Queue, favorite, provenance

Queue and favorite state are reported, never mutated. An airline question keeps its provenance everywhere in the loop, and `OFFICIAL_ARCHIVE` is never relabelled as current.

## Nonverbal

Nonverbal results stay a separate coaching area. They are not summed into any competency or hiring score and do not enter the loop's strengths or improvement points.

## Self introduction (phase 2)

The self-introduction result uses the **same contract and the same `TrainingLoopPanel`** — no parallel loop engine and no duplicated component. `buildSelfIntroTrainingLoopModel()` sits beside the interview builder in `lib/training-loop.ts` and returns the identical `TrainingLoopModel`.

**Exercise identity.** A self introduction has no question, so `questionId` stays `undefined` — none is invented. The exercise is identified by its **30/60/90 target** and **practice language**, carried on the context as `selfIntroMode` and `language`. Previous attempts are matched on target seconds **and** language **and** airline, so a 30-second attempt is never compared with a 90-second one and a Korean attempt never with an English one.

**Evidence.** Strengths come from `analysis.challenge.strengths` plus `analysis.bestPoint`; improvements from `analysis.challenge.improvements` plus `analysis.firstImprovement` — all gated by the same evidence modes. Timing comes from `analysis.challenge.timing` and is stated factually: *목표 60초 · 실제 41초입니다.* It appears only when the analyzer itself marked the attempt short or long, and never as a score.

**Retake.** *같은 자기소개 다시 연습* routes through the flow's existing `sameConditionRetake`, so `previousAttemptId`, the 30/60/90 target, the language and the airline all survive. Measured in the browser: attempt 1 → attempt 2 with `previousAttemptId` set, same language, comparison `답변 시간 11초 → 13초`.

**Next ladder** (the just-practised self introduction is never proposed):

| rule | condition | next |
|---|---|---|
| A | no completed mock | 모의면접 |
| B | no saved application answer | 지원서 답변 |
| C | the target airline journey has a next step | that journey action |
| D | otherwise | the existing daily plan target |

**Integration.** Completion still flows through the existing engines; the loop adds no counter. Verified in production-like local QA: a Jin Air self introduction moved Home from `자기소개 0회` to `1회`, added *Jin Air · 자기소개 완료* to recent activity, dropped the self-introduction gap and advanced the airline next action.

## Mock interview (phase 3)

Same contract, same `TrainingLoopPanel`. `buildMockTrainingLoopModel()` joins the interview and self-introduction builders in `lib/training-loop.ts`.

**The session is the unit.** A mock is one session, never one of its questions: `questionId` stays `undefined` and one question can never stand in for the whole exercise. `mockConfigId()` identifies the exercise as `mode:airline:questionCount` (e.g. `airline_specific:jin_air:5`), and only sessions with the same configuration are compared — a different mode, airline or question count makes comparison unavailable.

**Completion integrity.** `isMockSessionComplete()` requires `session.status === "completed"`. Answering the first question does not finish a mock, and an unfinished session gets no retake, no next and no history. Follow-up attempts are excluded from the session's question count.

**Evidence.** Strengths come from `session.sessionAnalysis.strengths` (the existing session analyzer already caps them at 3); improvements from `sessionAnalysis.improvements` plus cross-question aggregation. `repeatedMockIssues()` reports an issue seen in **two or more** questions once, with its count — *"Result이(가) 2개 문항에서 반복됐습니다."* An unanswered remainder is stated factually: *"5문항 중 3문항을 기록했습니다."* Per-question feedback is never duplicated wholesale into the summary.

The session's evidence mode is the strongest any of its answers actually carries, so an **audio-only** mock shows no transcript-based strengths or improvements, and a text mock shows no audio metrics. Nonverbal data never enters the loop's points and is not summed into any score.

**Retake.** *같은 모의면접 다시 연습* reopens the existing mock launcher so the same configuration is chosen again; `previousSessionId`, the airline and the config live on the context. No new mock store and no new retake engine.

**Comparison** — measured facts only:

```
기록한 문항 2/3 → 3/3
총 답변 시간 270초 → 180초
추임새 5회 → 2회        (actual_audio on both sides only)
긴 쉼 3회 → 1회         (audio evidence on both sides only)
반복된 보완점 2개 → 없음
```

**Next ladder** (the mock just completed is never proposed again):

| rule | condition | next |
|---|---|---|
| A | no saved application answer | 지원서 답변 |
| B | the target airline journey has a next step | that journey action |
| C | an open retake-queue item | that question |
| D | no completed self-introduction | 60초 자기소개 |
| E | otherwise | the existing daily plan target |

**Integration.** Counting stays session-based. Verified in local QA against a Jin Air `airline_specific:jin_air:5` mock: Home moved to `모의면접 1회` while the same five answers counted as `면접 연습 5회`, and the Jin Air journey showed `Mock 1회 / 면접 연습 5회`. A generic mock (no airline) is correctly excluded from that airline's journey, because the journey filters sessions on `airlineId`.

Application results are deliberately **not** connected yet; the loop only offers Application as a next action.

## Tests

`lib/training-loop.test.ts` — 34 deterministic tests: fresh user, the four training types, strength/improvement caps and ordering, the no-improvement wording, retake lineage, airline/question/provenance preservation, the audio-only and text-practice boundaries, all six next-action rules, the repeat guard, comparison scoping (same question, same airline, different id), history cap and order, incomplete-attempt handling, favorite/queue reporting, the readiness/probability/trait guard, focused retake, summary counts and determinism.

`lib/self-intro-training-loop.test.ts` — 30 deterministic tests: the shared model for a self introduction, all three duration modes, both languages, same-mode/same-language comparison and the exclusions, generic versus airline context, retake lineage, the audio-only and text boundaries, strength/improvement caps, the trait and readiness guard, the factual duration pair, focused retake, the no-repeat rule, all four next-action rules, history cap, incomplete handling, cross-airline isolation, determinism and a Single Interview regression guard.

`lib/mock-training-loop.test.ts` — 33 deterministic tests: the shared model for a mock, completion integrity (unfinished and first-question-only), generic versus airline context, configuration identity and the comparison exclusions, strength/improvement caps, cross-question repeated issues, the audio-only and text boundaries, nonverbal separation, retake lineage, focused retake, the score/trait guard, completion and duration deltas, history cap, all five next-action rules, the no-repeat rule, session-not-question counting, follow-up exclusion, cross-airline isolation, resume boundary, provenance, determinism, and Single Interview / Self Introduction regression guards.

## Mock session guard (phase 4)

Inside a running mock session the **session owns the next step**, so a per-question result must not offer the single-question loop. `components/interview-practice/interview-practice-engine.tsx` renders `TrainingLoopPanel` only when `buildTrainingLoop && !sessionAction`; `sessionAction` is present exactly while a mock session is in progress, so the same result screen is a standalone practice when it is absent. No new flag, no new prop and no change to mock session logic.

What each screen shows:

| screen | loop panel | session controls |
|---|---|---|
| standalone single interview result | `이번 연습` with `같은 질문 다시 연습` / `다음 연습 · …` | — |
| mock question result (session running) | none | `다음 질문` + `이 질문 다시 답하기` |
| completed mock report | `이번 연습` with `같은 모의면접 다시 연습` / `다음 연습 · …` | `이 세션 다시 연습` |

The guard is a render condition only: session progress, the per-question retry, attempt persistence, counting, Self Introduction and the mock report are untouched. Measured in local QA at 390px — standalone result panel present with 44px CTAs and attempt-2 comparison `답변 시간 16초 → 7초`; question 1–5 of a Quick 5 general mock showed `다음 질문` (48px) and `이 질문 다시 답하기` (44px) with zero `training-loop` nodes in the DOM; the finished session's report showed the mock panel with `같은 모의면접 다시 연습` and `다음 연습 · 지원서 답변 작성`. Horizontal overflow 0, console errors 0.

`lib/mock-session-loop-guard.test.ts` — 8 deterministic tests: the render condition, the guard keying off the existing `sessionAction` prop instead of a new flag, the mock question keeping its session action and in-place retry, the mock report keeping its panel, the standalone retake and next ladder, the in-place standalone retake, session progress and mock counting untouched, and a Self Introduction regression guard covering both of its result branches.

## Application answer (phase 5)

Same contract, same `TrainingLoopPanel`. `buildApplicationTrainingLoopModel()` joins the three other builders in `lib/training-loop.ts`, and the application result needs no new screen: the **saved answer detail** (`ApplicationAnswerDetail`) is the review point, which is where the create flow already lands after a save and where an answer opened from the coach home already appears.

**Completion integrity.** `isApplicationAnswerSaved()` requires both the answer row and the version it points at. Opening the editor finishes nothing, the analysis screen carries no loop panel, and a work draft — which is what the coach autosaves while the user is still assembling an answer — never produces a completed loop. A draft stays the **resume** item; a saved answer is **review and rewrite**.

**Exercise identity.** The answer is identified by the question it answers, never by its text: `promptId` plus, for a workspace question, `questionId`, `questionProvenance`, `recruitmentPeriod` and `recruitmentYear` from the answer's journey context. The same wording saved for another question or another airline is a different exercise and is never compared. A practice template keeps `questionId` undefined and is never promoted to an official application question; the rewrite path rebuilds a missing prompt as the user's own input rather than as an official one. `OFFICIAL_ARCHIVE` stays archived and the detail screen says so next to the answer.

**Evidence.** Strengths are the stored analysis's `strong` evaluations (highest score first) plus its rubric strengths; improvement points are its `needs_improvement` evaluations (lowest score first), its generic-expression warning, its rubric findings and its missing competencies. Caps: **strengths ≤ 3**, **improvements ≤ 3**, with the same *"이번 결과에서 추가로 확인된 보완 포인트가 없습니다."* wording when nothing was found. An answer's evidence mode is `text_analysis`, so speech and audio evidence never apply, and no trait, readiness or hiring value is produced.

**Rewrite.** *같은 답변 다시 다듬기* reopens the saved answer in the **existing** `ApplicationDraftEditor` inside the coach, seeded with the current version's own text — nothing is generated or rewritten for the user. *이 항목에 집중해서 다시 다듬기* passes the first real improvement point as a reference line only. `airlineId`, `promptId`, `questionId`, provenance, recruitment context and the linked experiences all survive, and saving goes through `createAnswerVersion()`, so the version number increments and the previous version is kept. A focused rewrite whose point maps to a known change reason is stored with that reason (e.g. `airline_connection`).

Version rows do not store sentence evidence, so a rewrite is re-analysed with evidence rebuilt from what is still true: the experiences the answer is linked to, plus the saved text as the user's own answer. The original draft's airline or coaching evidence is never re-asserted.

**Comparison** — measured facts only, against the previous version of the same answer:

```
답변 길이 254자 → 354자
문장 수 6개 → 7개
연결 경험 0개 → 1개
보완 항목 2개 → 3개          (only when both versions stored an analysis)
누락 요소 없음 → 없음         (only when both versions stored an analysis)
```

A row can move in the unhelpful direction and is shown that way; there is no 향상도, no percentage and no verdict. No text diff is produced: the repo has no diff utility and this phase did not add a semantic one, so the change is reported as length and sentence counts. History keeps at most 3 previous versions.

**Next ladder** (the answer just saved is never proposed again, and the ladder never sends the user back to the coach):

| rule | condition | next |
|---|---|---|
| A | no completed interview attempt **and** this answer produced an interview drill | that question |
| B | no completed self introduction | 60초 자기소개 |
| C | no completed mock | 모의면접 |
| D | the airline journey has a next step (airline answers only) | that journey action |
| E | otherwise | the existing daily plan target |

Only `next` leaves the coach; a rewrite stays inside it, so the answer context is never rebuilt from scratch.

**Integration.** Counting stays with the repositories. Verified in local QA: saving a generic answer moved the coach home to `저장한 답변 1`, added *객실승무원을 지원한 이유를 작성해 주세요.* to Home recent activity and `이번 주 실제 활동 1회` to the learning log, and left every airline journey at 0 because a generic answer belongs to no airline. A second answer saved from the Jin Air workspace moved that journey to `지원서 답변 1개`, marked `지원서 답변 작성 · 1개 저장` complete and left the generic answer out of the count; Home then showed `지원서 답변 1개 · 확인된 공식 지원서 질문 없음`. **Zero denominator:** with no confirmed official application question the count is rendered as `1개`, never `1/0` — `applicationAnswerProgress()` is unchanged and still owns that rule. Daily and weekly completion keep flowing through the existing engines on a real save; the loop adds no counter and writes nothing.

Jin Air has no confirmed official application question in the shipped data, so the official-question review path was verified by deterministic tests rather than by production data.

### Tests

`lib/application-training-loop.test.ts` — 42 deterministic tests: the shared model for a saved answer, the unsaved-draft and missing-version boundaries, generic versus airline context, official and archived question identity, provenance survival, strength/improvement caps and ordering, the trait guard, rewrite context preservation, focused rewrite, version increment, previous-version preservation, same-answer comparison and the different-answer / different-airline / same-text-different-question exclusions, experience links and the experience/length/missing-element deltas, the fake-improvement guard, history cap, all five next rules, the no-infinite-rewrite rule, Home counting and gap updates, the zero-denominator rule, journey counting and generic isolation, the resume boundary, and Single Interview / Self Introduction / Mock / mock-mid-session-guard regressions.
