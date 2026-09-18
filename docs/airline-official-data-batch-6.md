# Airline Official Data Batch 6

Verified on 2026-09-18. This batch adds first-party, source-backed workspace data for Lufthansa, British Airways, Air France and KLM. It does not enable airline facts for AI coaching (`aiContextEnabled` remains `false`).

## Stored data

| Airline | Sources | Requirements | Hiring stages | Guidance | Fleet entries | Korea routes | Official questions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Lufthansa | 6 | 4 | 4 | 3 | 13 | 2 | 0 |
| British Airways | 6 | 6 | 6 | 3 | 12 | 0 | 0 |
| Air France | 7 | 5 | 5 | 3 | 6 | 1 | 0 |
| KLM | 6 | 6 | 6 | 3 | 10 | 1 | 0 |
| Total | 25 | 21 | 21 | 12 | 41 | 4 | 0 |

## Identity and operating scope

- `lufthansa`: Germany / Europe / full service / domestic and international. Frankfurt and Munich are stored as hubs.
- `british_airways`: United Kingdom / Europe / full service / domestic and international. London Heathrow is stored as the verified hub; cabin bases are not promoted to hubs.
- `air_france`: France / Europe / full service / domestic and international. Paris-Charles de Gaulle is stored as the current central hub.
- `klm`: Netherlands / Europe / full service / international. Amsterdam Schiphol is stored as the hub.

The existing canonical entities are reused. Korean search aliases were added without introducing new airline IDs.

## Provenance policy

- Only airline-owned careers, corporate, fleet, timetable or booking surfaces are stored.
- Every source uses HTTPS and an exact hostname allowlist entry.
- Requirement, recruitment, guidance, fleet and route rows retain their source and verification timestamp.
- Fleet quantities remain `null`; no quantity was inferred from third-party fleet trackers.
- Air France aircraft are stored at family granularity where the official source is family-level.
- BA CityFlyer, KLM Cityhopper and Air France HOP! aircraft are excluded from the mainline airline fleet records.

## Korea-route boundary

- Lufthansa: `ICN-FRA` and `ICN-MUC`, supported by the airline's 2026 Korea timetable.
- Air France: `ICN-CDG`, supported by its current Korean booking surface.
- KLM: `ICN-AMS`, supported by its current Korean booking surface.
- British Airways: zero stored routes. The accessible direct-service document is historical, while the current destination catalogue does not establish the operating carrier. It is not treated as current BA-operated service.

All stored route records use airport-to-airport codes, have `CONFIRMED` status, and inherit the current batch verification date. Seasonal or codeshare-only service is not inferred.

## Recruitment and questions

Requirements and hiring stages are taken only from current official cabin-careers, vacancy, FAQ or company recruitment pages. Generic company stages are labelled as guidance where a cabin vacancy may differ.

No current official page exposed cabin-specific application or interview question wording with sufficient direct provenance. Both official question arrays therefore remain empty, and pattern confidence remains `INSUFFICIENT`. General statements about motivation, video pitches or situational assessments are not converted into invented question text.

## Known gaps

- British Airways current Korea operating-carrier evidence was not established, so its Korea route count is zero rather than guessed.
- Lufthansa height, education and language requirements were not copied from an older PDF into the current dataset.
- Fleet quantities are unknown in this model even when group-level totals exist.
- Air France's company-wide recruitment process may vary by live cabin vacancy.
- KLM Cityhopper conditions and aircraft are intentionally outside the KLM mainline profile.

## Validation scope

The deterministic suite covers canonical identities, taxonomy, operation scope, hubs, careers links, requirement and stage provenance, fleet boundaries, current routes, question exclusion, AI gate closure, search/filter behavior, honest fresh-user state and Batch 1-5 regression.

This phase does not change Speech, Nonverbal, competency scoring, Supabase schema, authentication, Weekly, STT or user mock data.
