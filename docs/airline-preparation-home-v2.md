# Airline Preparation Home V2

- Base: `c1ecc59d` (production `https://flight-attendant-iota.vercel.app`)
- Scope: Home information hierarchy + one derived-state module. No new airline data, no questions, no schema, no auth, no AI-context change, no scoring engine.

## Why the Home changed

The previous Home was a dashboard pile: 14 sections in a single column, several of them answering the same question twice. The daily action cards, the "다가오는 지원 일정" card, three quick-action buttons and the "최근 모의면접" list all competed for the top of the page, and none of them said which airline the user was preparing for. Home V2 answers five questions in order instead.

## Information hierarchy

| Order | Block | Answers |
|---|---|---|
| 1 | Target context | 내가 준비 중인 항공사 |
| 2 | 오늘 할 일 | 지금 가장 먼저 할 일 |
| 3 | 이어서 하기 / 타겟 항공사 다음 준비 | 이어서 할 수 있는 작업 |
| 4 | 준비 기록 + 아직 준비 기록 없음 | 무엇이 쌓였고 무엇이 비었나 |
| 5 | 다가오는 지원 일정 | 언제까지인가 |
| 6 | 최근 활동 | 최근 한 준비 |
| 7 | 바로 가기 (+ 역량검사 secondary) | 어디로 가면 되나 |

그 아래로 기존 주간 진행 · 학습 활동 · 코치 시그널 · 오늘의 경험 준비 · 준비 현황 · 오늘의 준비 루틴 · 주간 리포트가 그대로 남습니다. Weekly는 "이번 주 준비 현황", Today는 "지금 할 것"으로 역할이 갈립니다.

제거된 중복: 기존 Daily action 3-카드 묶음, APPLICATIONS 마감 카드, 자기소개·역량검사·타겟항공사 3버튼, 최근 모의면접 섹션. 모두 V2 블록이 흡수했습니다.

## Derived state

`lib/airline-preparation-home.ts` — 순수 함수 `buildPreparationHomeModel(input)`.

Input은 전부 기존 저장소에서 온 파생값입니다: `primaryAirline`(온보딩 선택), `journey`(`buildAirlineJourneyState`), `dailyPlan`(`buildDailyActionPlan`), `upcomingApplications`(`sortUpcomingApplications`), `activities`(`buildLearningActivities`), `competencyCompleted`.

Output: `target`, `todayAction`, `airlineNextAction`, `continueAction`, `summary`, `applicationProgress`, `gaps`, `deadline`, `recentActivity`, `quickActions`, `competencyAction`.

UI는 렌더만 합니다. Home은 자체 progress를 저장하지 않고, completion source가 되지 않으며, 계산을 컴포넌트 안에서 하지 않습니다.

## Priority rules

`todayAction`은 **기존 Daily 엔진의 primary 그대로**입니다. 이 모듈은 새 추천 엔진을 만들지 않습니다. Daily 엔진이 이미 A(진행 중 작업 950~1000) → B(마감 850~900) → D(fallback 100)를 우선순위로 갖고 있기 때문입니다.

Daily 엔진이 다루지 않는 C(타겟 항공사 journey next action)는 **분리된 카드**로 보여 줍니다:

- `오늘 할 일` = `dailyPlan.primary`
- `타겟 항공사 다음 준비` = `journey.nextRecommendedAction`, 단 today/continue와 navigation target이 같으면 숨김
- `이어서 하기` = daily plan 안의 resume 후보 중 primary가 아닌 가장 최근 것

같은 입력이면 항상 같은 결과입니다. 랜덤도 LLM 추천도 없고, 우선순위는 테스트로 고정돼 있습니다.

## No readiness score policy

Home V2는 준비도 점수, 합격 확률, 항공사 적합도를 만들지 않습니다. 모델 직렬화 결과에 `readiness` / `score` / `probability` / `%` 문자열이 나타나지 않는 것을 테스트로 고정했습니다.

"부족한 준비"는 점수가 아니라 **실제로 비어 있는 활동**이며, 최대 3개, "저장한 지원서 답변 없음"처럼 기록 부재로만 표현합니다. 약점·미흡 같은 단정 표현을 쓰지 않는 것도 테스트로 막았습니다.

`지원서 답변` 표시는 Application Progress Display Consistency V1 계약을 그대로 재사용합니다 — 공식 질문 0이면 `1/0`이 아니라 `1개` + `확인된 공식 지원서 질문 없음`.

## Provenance / community evidence

Home은 question count를 직접 세지 않고 journey의 집계를 그대로 씁니다. 그 집계는 이미 `canPracticeCommunityQuestion`을 통과한 항목만 포함하므로 PENDING·REJECTED 사용자 제보는 준비 완료로 잡히지 않습니다. ACCEPTED 사용자 제보가 practice 후보가 되더라도 provenance가 OFFICIAL로 승격되지는 않습니다.

## Fresh / returning

**Fresh user**: 타겟 항공사 미설정 + 설정 CTA, today는 daily fallback, 이어하기·타겟 다음 준비 없음, 카운트 전부 0, gaps 3개, 최근 활동 빈 상태 문구. 샘플 항공사도 가짜 활동도 만들지 않습니다.

**Returning user**: 저장된 활동만으로 target / today / resume / recent / gaps가 채워집니다.

**Multi-airline**: 1순위 항공사 하나만 Home의 중심입니다. 관심 항공사의 진행 상황을 Home에 펼치지 않습니다.

## Navigation

모든 CTA는 기존 `DailyActionTarget` union으로 표현되고 기존 `startDailyAction` 하나를 통해 이동합니다. 새 navigation architecture를 만들지 않았고, 완료 후 복귀는 기존 origin/return context를 그대로 씁니다.

`journeyActionTarget()`이 journey action(9종)을 이 union으로 매핑합니다: application/resume_application → Application Coach, interview/retake → Interview Practice, self_intro → Self Intro, mock → Mock, resume_mock → 진행 중 세션, resume_interview → 단일 면접 재개, review_result → Airline Workspace.

최근 활동 중복 제거: journey와 learning log가 같은 저장을 양쪽에서 기록하므로, journey row id(`answer:<id>` 등)에서 엔티티 id를 뽑아 같은 엔티티를 가리키는 learning activity를 제외합니다.

## Mobile / desktop

390×844: Today 카드가 첫 블록, V2 CTA 전부 44px 이상, horizontal overflow 0, summary/gap chip은 wrap, 최근 활동은 최대 5개이며 잘리지 않습니다.

1280×900: target · today · 타겟 다음 준비 · 준비 기록이 모두 첫 화면 안에 들어옵니다(측정값 target top 184 / summary bottom 654).

접근성: 완료·없음·진행 중을 색으로만 표현하지 않고 항상 텍스트 라벨을 함께 둡니다. 모든 V2 CTA는 accessible name을 가집니다.

알려진 선행 이슈(이번 범위 밖): 기존 `DailyRoutineList`의 루틴 행 버튼 5개가 36px로 44px 미만입니다. Home V2가 만든 요소는 아니며 이번 diff에서 건드리지 않았습니다.

## Tests

`lib/airline-preparation-home.test.ts` — 33개 deterministic 테스트: fresh user, primary airline only, resume 4종, deadline 우선순위, journey next action 및 중복 숨김, daily fallback, 카운트 5종, readiness 부재, gap 규칙과 상한, 최근 활동 상한·항공사 우선·가짜 없음·중복 제거, application zero denominator, deadline 유무, multi-airline isolation, determinism, ko/en locale, navigation 매핑, competency secondary.
