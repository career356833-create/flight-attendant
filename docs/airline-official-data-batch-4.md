# Airline Official Data Batch 4

Verified on **2026-09-18** from first-party airline sites only. This batch adds Singapore Airlines, Cathay Pacific, ANA and Japan Airlines to the existing Airline Targeting Workspace. It records source-backed facts, not exhaustive networks or inferred hiring rules.

| Airline | Country / group | Hub(s) | Scope | Fleet models | Stored routes | Requirements | Documented selection steps |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| Singapore Airlines | Singapore / Southeast Asia | SIN | International | 5 | 1 | 6 | 3 |
| Cathay Pacific | Hong Kong / East Asia | HKG | International | 4 | 1 | 3 | 1 |
| ANA | Japan / East Asia | HND, NRT | Domestic + international | 7 | 1 | 5 | 1 |
| Japan Airlines | Japan / East Asia | HND, NRT | Domestic + international | 7 | 1 | 0 | 0 |

## Official source coverage

- Singapore Airlines: [cabin crew careers](https://www.singaporeair.com/en_UK/hr/careers/cabin-crew-career/), [vacancies](https://careers.singaporeair.com/sia/go/Cabin-Crew/689244/), [fleet](https://www.singaporeair.com/en_UK/sg/flying-withus/our-story/our-fleet/), and [SIN–ICN](https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-seoul/).
- Cathay Pacific: [Hong Kong cabin crew vacancy](https://careers.cathaypacific.com/en/careers/jobs/hong-kong/flight-attendant-based-in-hong-kong-hong-kong-recruitment-29373), [careers](https://careers.cathaypacific.com/), [fleet](https://www.cathaypacific.com/cx/en_US/flying-with-us/aircraft-and-fleet.html), and [HKG–ICN](https://flights.cathaypacific.com/destinations/en_HK//flights-from-hong-kong-to-seoul).
- ANA: [cabin attendant recruitment](https://www.ana.co.jp/group/recruit/ana-recruit/career/ca/), [entry requirements](https://www.ana.co.jp/group/recruit/ana-recruit/occupation/entry/), [fleet statistics](https://www.ana.co.jp/group/en/company/ana/scale/), and [Japan/Korea route guidance](https://www.ana.co.jp/en/kr/plan-book/promotions/domestic-add-on-free-flights/).
- JAL: [corporate and recruitment entry](https://www.jal.com/ja-jp/), [current route scope](https://www.jal.com/en-jp/about/air/route.html), [fleet table](https://www.jal.com/en/investor/library/finance/pdf/fy2025q4_en0430.pdf), and [cabin safety responsibilities](https://www.jal.com/en-jp/safety/staff/).

## Data boundaries

- Requirement text is limited to the current, named official recruitment exercise or vacancy. It is not a universal or permanent rule.
- JAL had no current role-specific cabin-crew requirements or recruitment process directly verifiable on a first-party vacancy page during this check, so the product stores **zero** rather than inventing conditions.
- No official application-form or interview-question wording was verified for any of the four airlines; both collections remain empty.
- Fleet quantities are intentionally `null`; models only are recorded, including only the fact surface supported by the cited official page.
- Routes are representative current, source-backed samples. They are not an exhaustive timetable.
- Where the JAL route source is Group-level, it is described as such and is not used to infer a detailed JAL-only schedule.

## Safety and freshness

- Every stored URL is HTTPS and subject to the project official-host allowlist.
- Volatile requirements, routes, fleets and process details carry the Batch 4 verification timestamp and are `CURRENT` at collection time.
- The canonical AI gate remains `verified && published && source-backed && aiContextEnabled`; all four profiles retain `aiContextEnabled: false`.
- No hiring probability, ranking, score, unofficial question, blog, community post or third-party recruiting rule is included.

## UI and validation scope

- The existing Overview, Application, Questions, Routes, Fleet, My Experience and Practice views consume the shared workspace profile structure. Cabin-crew requirements and documented process/guidance appear through the existing detail sections.
- Existing filters support Singapore, Hong Kong, Japan, Southeast Asia, country grouping, full-service and operation scope; comparison is capped at three airlines and preserves missing requirements as unavailable information.
- This phase has no database, authentication, AI-provider, STT, Speech, Nonverbal, Competency, Weekly or mock-data changes.
