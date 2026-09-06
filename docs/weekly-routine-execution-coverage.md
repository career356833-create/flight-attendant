# Weekly routine execution coverage

Baseline: `9ea1466003d20ff33ff7f56fae5c00589754bfe9`  
Fixture: current week `2026-09-07` through `2026-09-13`, 30-minute plan

## Target-kind contract

| Weekly task type | Current count | Classification | Destination | Completion authority |
| --- | ---: | --- | --- | --- |
| `interview_question` | 2 | EXECUTABLE_AND_COMPLETABLE | Interview Practice | completed `InterviewAttempt` |
| `experience_work` | 1 | EXECUTABLE_AND_COMPLETABLE | Experience Library | persisted experience save event |
| `self_introduction` | 1 | EXECUTABLE_AND_COMPLETABLE | Self Introduction | completed `SelfIntroductionAttempt` |
| `application_work` | 1 | EXECUTABLE_AND_COMPLETABLE | Application Coach | persisted application answer save event |
| `review` | 9 | EXECUTABLE_AND_COMPLETABLE | queued retry when available, otherwise real balanced Interview Practice | practiced queue item or completed `InterviewAttempt` |
| `airline_research` | 0 | DISPLAY_ONLY / NO_REAL_DESTINATION | none | none; it is not generated in the current 14-task plan |

`review` is not completed by opening a page or pressing its CTA. The CTA starts a real interview exercise. If an open retry queue item exists it is used; otherwise the configured balanced interview question is used. Completion requires the resulting queue-practice event or completed attempt.

## Current-week inventory

| Day | Task ID | Type | Title | Destination |
| --- | --- | --- | --- | --- |
| 09-07 | `current-2026-09-07-0` | interview_question | 면접 답변 구조 훈련 | Interview Practice |
| 09-07 | `current-2026-09-07-1` | review | 면접 핵심 복습 | Interview Practice |
| 09-08 | `current-2026-09-08-0` | experience_work | 고객·팀워크 경험 정리 | Experience Library |
| 09-08 | `current-2026-09-08-1` | review | 안전 핵심 복습 | Interview Practice |
| 09-09 | `current-2026-09-09-0` | self_introduction | 채용 언어 자기소개 | Self Introduction |
| 09-09 | `current-2026-09-09-1` | review | 지원 핵심 복습 | Interview Practice |
| 09-10 | `current-2026-09-10-0` | interview_question | 안전 판단 질문 연습 | Interview Practice |
| 09-10 | `current-2026-09-10-1` | review | 면접 핵심 복습 | Interview Practice |
| 09-11 | `current-2026-09-11-0` | application_work | 항공사 지원동기 보완 | Application Coach |
| 09-11 | `current-2026-09-11-1` | review | 안전 핵심 복습 | Interview Practice |
| 09-12 | `current-2026-09-12-0` | review | 재도전 결과 비교 | Interview Practice |
| 09-12 | `current-2026-09-12-1` | review | 지원 핵심 복습 | Interview Practice |
| 09-13 | `current-2026-09-13-0` | review | 주간 복습과 리포트 | Interview Practice |
| 09-13 | `current-2026-09-13-1` | review | 면접 핵심 복습 | Interview Practice |

## Lineage and idempotency

The shared context contains `weeklyTaskId`, `weekStart`, task type, optional target kind, title, estimated minutes, capability and `source=weekly_plan`. A real feature completion supplies its stable entity ID as `sourceCompletionId`. The weekly repository remains the only progress authority and deduplicates by weekly task ID. Revisit, refresh or retry of the same weekly task therefore adds neither a second completion nor a second weekly activity.

Direct feature entry has no weekly context and cannot mutate weekly progress. Weekly completion activity remains separate from feature activity in analytics: `getActivitiesByDateRange` excludes `weekly:*` wrapper records, preventing double-counting.

## Product boundary

`airline_research` remains in the historical union but has no truthful completion authority. It is not emitted by the current bootstrap and must not be added to a completion denominator until a real research workflow and completion event exist.
