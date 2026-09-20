# Airline Official Data Batch 7

Verified on 2026-09-19 from exact-host first-party airline, careers, newsroom, investor-relations and booking pages. This batch adds no user activity, readiness data, database migration, authentication change or AI-context promotion.

| Airline | Sources | Requirements | Hiring stages | Guidance | Fleet | Korea routes | Official questions |
|---|---:|---:|---:|---:|---:|---:|---:|
| Delta Air Lines | 5 | 4 | 7 | 3 | 17 | 5 | 0 |
| United Airlines | 5 | 9 | 8 | 3 | 8 | 1 | 0 |
| American Airlines | 5 | 1 | 6 | 3 | 10 | 1 | 0 |
| Air Canada | 6 | 7 | 1 | 3 | 10 | 2 | 0 |

## Scope and provenance decisions

- All four canonical records remain `FULL_SERVICE`, `north_america`, and `BOTH` for domestic and international scope.
- Hubs come from current company or investor sources. Flight-attendant bases are retained only as recruitment guidance and are never copied into the hub field.
- Fleet rows preserve the granularity of the official source. Delta Connection, United Express, Air Canada Express and Air Canada Rouge aircraft are excluded. Quantities remain `null` to avoid copying volatile counts or forecasts.
- Korea routes require an official airport-to-airport reference and a direct-operation basis. Partner-only, merely connectable, seasonal-only or city-level candidates are not promoted.
- Delta: ICN-ATL, ICN-DTW, ICN-MSP, ICN-SEA and ICN-SLC.
- United: ICN-SFO.
- American: ICN-DFW.
- Air Canada: ICN-YYZ and ICN-YVR.
- Air Canada's two Korea pairs use the official Air Canada Vacations direct-destination list rather than generic connecting offers.
- American's cabin-crew page is official and current but blocks automated page access, so it is recorded as `AUTOMATED_ACCESS_RESTRICTED` rather than dead or accessible.
- No reusable cabin-specific application or interview question wording was directly published. Both official question arrays remain empty and the pattern state remains `INSUFFICIENT`.
- Every profile is verified and published for workspace display, while `aiContextEnabled` remains `false`; canonical airline coaching cannot consume this batch without a separate promotion.

## Honest gaps

- American's current public hiring surface exposes its process and appearance guidance but not reusable numeric minimum-age, education or reach criteria. Those fields remain absent.
- Air Canada's public page provides one confirmed application entry point but no complete current stage-by-stage selection sequence. Only the verified application stage is stored.
- Fleet quantities are intentionally not persisted.
- Current direct Korea service beyond the nine stored pairs was not asserted from connecting offers, codeshares or partner schedules.
- No archived or community-sourced question content is included.
