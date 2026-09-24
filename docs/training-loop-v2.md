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

Mock and application results are deliberately **not** connected yet.

## Tests

`lib/training-loop.test.ts` — 34 deterministic tests: fresh user, the four training types, strength/improvement caps and ordering, the no-improvement wording, retake lineage, airline/question/provenance preservation, the audio-only and text-practice boundaries, all six next-action rules, the repeat guard, comparison scoping (same question, same airline, different id), history cap and order, incomplete-attempt handling, favorite/queue reporting, the readiness/probability/trait guard, focused retake, summary counts and determinism.

`lib/self-intro-training-loop.test.ts` — 30 deterministic tests: the shared model for a self introduction, all three duration modes, both languages, same-mode/same-language comparison and the exclusions, generic versus airline context, retake lineage, the audio-only and text boundaries, strength/improvement caps, the trait and readiness guard, the factual duration pair, focused retake, the no-repeat rule, all four next-action rules, history cap, incomplete handling, cross-airline isolation, determinism and a Single Interview regression guard.
