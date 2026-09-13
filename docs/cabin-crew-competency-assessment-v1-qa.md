# Cabin Crew Competency Assessment V1 QA

## Product boundary

- Practice-only cabin crew competency profile; it does not predict hiring, pass probability, airline fit, or percentile rank.
- The eight V1 axes include the seven core competencies plus problem solving as an optional practice axis.
- Prototype module weights are SJT 40, video 25, priority task 20, and self-report 15. They are not validated selection-test weights.
- Vision metrics are coaching-only and never enter competency evidence or bands.

## Question bank

- Self-report: 21 Korean-first Likert items (three per core competency).
- SJT: 14 scenarios with four trade-off options each.
- Priority task: 5 sets; only selected order is evaluated, never click speed.
- Video: 3 prompts using the existing recording, actual STT, Speech Understanding V2, and optional Nonverbal Signal Coach flow.
- Total: 43 active questions. The schema carries a locale field so reviewed English copies can be added without changing scoring rules.

## Integrity and privacy checks

- [ ] A module is incomplete before every required response is submitted.
- [ ] Overall completion is unavailable before all four modules are submitted.
- [ ] Starting or opening a module does not mark it complete.
- [ ] Video without an actual transcript creates no competency evidence.
- [ ] Camera denial or camera skip does not block a video response.
- [ ] Nonverbal coaching cannot alter a competency band.
- [ ] Assessment video does not create Self Introduction history, weekly completion, queue completion, or remote training sync.
- [ ] No raw video, raw audio, vision frame, or sensitive profile attribute is stored by the assessment repository.
- [ ] Self-report inconsistency is shown only as a response review signal, never as dishonesty.
- [ ] Results contain no overall score, hiring probability, pass prediction, or face-based judgment.

## Manual responsive QA

- [ ] 390 x 844: all answer controls are reachable, no horizontal overflow, minimum action height 44px.
- [ ] Desktop: module cards use two columns and result evidence remains readable.
- [ ] Complete all four modules and revisit the saved result from History.
- [ ] Start a retest and confirm the previous result remains in History.
- [ ] If the question-bank version differs, confirm the UI warns against direct comparison.
- [ ] Use each practice recommendation and confirm it opens an existing Interview, Self Introduction, or Weekly Report flow.

## Automated coverage

- Question counts, safety-first SJT, unsafe service-only option, teamwork escalation, communication clarity, cross-cultural respect.
- Self-report non-dominance, actual-transcript gate, vision exclusion, module/assessment completion, retest/version separation.
- No hiring score, no sensitive input, response-time exclusion, maximum three strengths/improvements, evidence-only Adaptive handoff.

## Real media E2E result (2026-09-13)

### Environment

- Local app: `http://localhost:3000`
- Real-media browser: Codex in-app Chromium, 1280 x 720
- Responsive browser: system Chrome headless, 390 x 844
- Final verdict: `CABIN_CREW_COMPETENCY_V1_BLOCKED_STT`

### Real media

- `navigator.mediaDevices`, microphone enumeration, microphone permission, live input detection, camera permission, camera preview, and `MediaRecorder` flow were available.
- The microphone selector exposed multiple real input devices. The selected webcam microphone produced a usable input-level signal.
- Camera preview started after explicit consent. No face-based competency inference or scoring was performed.
- VID-01 produced a 16-second recording and reached the existing STT consent and analysis flow.
- VID-01 returned `STT_EMPTY`; server diagnostics identified the configured OpenAI transcription provider as `not_configured`, and `/api/ai/transcribe` returned HTTP 503. The application correctly created no speech competency evidence.
- VID-02 and VID-03 were not submitted after the first response established the environment-level STT blocker. No mock transcript or completion flag was used.
- Exact track counts and post-stop `readyState` were not exposed by the browser automation surface. Preview removal and the existing cleanup path were observed, but track-level cleanup remains not directly observable.

### Completion integrity

- Self-report: 21/21 submitted through the UI.
- SJT: 14/14 submitted through the UI; all four choices were present per question.
- Priority: 5/5 submitted through the UI; ordering controls worked.
- Saved module state after the persistence fix: 3/4.
- Video: 0/3 valid submitted responses because a non-empty actual transcript is required.
- The final result remained locked at 3/4. The 8-axis result, result history, reload restore of a completed result, and retest ID isolation could not be completed without three real spoken video responses.

### Product blocker found and fixed

- The competency repository passed an already stringified value to `safeLocalStorageWrite`, which serialized it a second time. Reloading or returning from the video flow therefore discarded the draft as unreadable and showed 0/4.
- `saveDraft` and `complete` now pass structured objects to the shared storage writer.
- A repository round-trip regression test was added. Actual UI retest confirmed module persistence and 3/4 restoration.

### Responsive and runtime checks

- 390 x 844 Home and assessment entry: horizontal overflow 0; assessment action heights were 44, 48, or 128 px; no primary-control clipping was observed.
- Full 390 px video, result, history, and retest completion remains blocked by the missing three real spoken responses.
- Desktop real-media flow was exercised at 1280 x 720. A separate 1440 x 900 result smoke was not available because the result remained correctly locked.
- Network smoke at 390 px reported no 404 or 5xx responses. The separate real-media STT request returned one expected HTTP 503 because the transcription provider was not configured.
- The real camera run logged MediaPipe timestamp-mismatch errors during frame analysis. Recording continued, but this is a remaining nonverbal-camera runtime issue.

### Regression

- Full test suite: 697/697 passed.
- Competency assessment tests: 29/29 passed.
- TypeScript: passed.
- Profile privacy validation: passed.
- Production build: passed.
- `git diff --check`: passed (existing line-ending warnings only).
- ESLint: not configured; no lint configuration was added.

## R2 STT and real video closure (2026-09-13)

### STT blocker and configuration contract

- Runtime path: competency video recording -> `aiService.transcribeAudio` -> `serverSttProvider` -> `POST /api/ai/transcribe` -> `transcribeWithOpenAi` -> OpenAI audio transcription endpoint.
- Root-cause classification: `STT_API_KEY_MISSING`.
- Required server-only variable: `OPENAI_API_KEY`. Optional model override: `OPENAI_STT_MODEL`; the route defaults to `gpt-transcribe` when it is absent.
- `OPENAI_API_KEY` was absent from the current process and ignored `.env.local`. No remote secret was read or copied, and no value was invented.
- A direct real-microphone STT smoke was not sent because the route fails closed before the provider call without the required key.
- R2 verdict: `CABIN_CREW_COMPETENCY_V1_R2_BLOCKED_STT_SECRET_REQUIRED`.

### MediaPipe timestamp closure

- Root cause: the interval-based analyzer could invoke MediaPipe again for the same `video.currentTime` frame during the camera-check to recording transition. Concurrent inference was already guarded, but duplicate/stale decoded frames were not.
- MediaPipe inference timestamps continue to use one monotonic `performance.now()` timebase. `video.currentTime` is used only as a decoded-frame freshness guard.
- Face and pose analyzers now skip duplicate or stale video frames independently. Camera stop resets both frame markers and disposes both analyzers.
- A local `performance` metrics variable that shadowed the browser Performance API was renamed; TypeScript now passes.
- Real camera verification: 32 seconds in camera check plus 32 seconds after transition to recording. Timestamp mismatch: 0. New uncaught runtime errors: 0.
- The TensorFlow Lite XNNPACK delegate message is an informational WASM message surfaced at console error level, not a failed inference.
- After recording exit, the assessment view contained zero video elements. Exact track `readyState` remained unavailable through the automation surface.

### Persistence and completion

- The existing structured-object persistence fix remains in place for draft save, completed history, and draft clearing.
- Repository save/complete/clear round-trip test passed.
- Final assessment approach: `RESUME_BLOCKED_DRAFT`; the UI restored self-report 21/21, SJT 14/14, and priority 5/5 as 3/4 modules.
- The assessment ID is not exposed by the UI and was not extracted by modifying storage.
- Video Q1-Q3 valid submissions, STT 3/3, final result, evidence details, history reopen, and retest ID separation remain blocked by the missing STT secret.
- The result correctly remains locked at 3/4. No completion flag, transcript, or localStorage value was injected.

### R2 responsive, privacy, and regression

- Actual media viewport: 1280 x 720. Prior 390 x 844 assessment smoke remains overflow-free, but a complete 390 px result flow cannot be claimed before STT closure.
- Vision remains coaching-only with zero competency-band contribution. No sensitive profiling or raw camera frame persistence was introduced.
- Full test suite: 730/730 passed.
- Focused STT, competency, and vision tests: 73/73 passed.
- TypeScript, profile privacy validation, production build, and `git diff --check`: passed.
- New R2 test: duplicate/stale video-frame rejection before MediaPipe inference.
- Tracked OpenAI-style secret patterns: 0. `.env.local` remains ignored.
- Stage, commit, push, and deploy: none.

## E2E closure resume after concurrent writer (2026-09-13)

- Pre-resume observation: 11 scoped files were stable for 15 seconds and the pre-resume manifest was captured.
- Existing timestamp monotonicity, initial-draft persistence, and regression-test fixes remained present.
- Automated fake-media at 390 x 844 completed Video Q1, Q2, and Q3 as distinct UI recordings. Q1 exercised fake camera plus microphone; Q2 and Q3 exercised separate microphone recordings. Playback and analysis-result transitions succeeded.
- STT remained unavailable and failed closed. No fake transcript was created. MediaPipe timestamp-backwards errors were zero; the XNNPACK console message was informational.
- All four modules reached completed state, the result gate enabled, and the result rendered eight competency axes with three strengths and three improvement items.
- Horizontal overflow was zero on assessment, result, and reopened-history result views. History survived reload, assessment `competency-1789306347459` reopened, and retake created `competency-1789307873831` without overwriting history.
- Vision remained coaching-only with zero competency weighting. No raw QA media was persisted to the repository.
- Focused tests: 178/178 passed. Full tests: 730/730 passed. TypeScript and production build passed. ESLint remains not configured. `git diff --check` passed with existing line-ending warnings.
- Actual physical camera/microphone E2E was not executed and is not represented by the fake-media result.
- Final ownership audit: the final 15-second observation window was stable, but five scoped Self Introduction/Nonverbal files had changed between the pre- and post-resume manifests without this QA run editing them. This is `UNEXPECTED_CONCURRENT_MUTATION`; therefore final PASS is prohibited.
- Final decision: `CABIN_CREW_COMPETENCY_V1_BLOCKED_CONCURRENT_MUTATION`.
