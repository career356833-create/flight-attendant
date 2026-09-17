# Airline Official Data Batch 3A

Verified: 2026-09-17

## Scope

Batch 3A connects Air Seoul and Eastar Jet to the existing Airline Targeting Workspace. It reuses the existing `air_seoul` identity and adds one canonical `eastar_jet` master identity because no Eastar Jet entity existed.

Only airline-operated HTTPS pages were accepted. No blog, community, candidate review, Wikipedia, or SEO airline database content is stored as a production fact.

## Coverage

| Airline | Official sources | Carrier type | Operation scope | Hubs | Fleet entries | Route examples | Careers | Official questions |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- | ---: |
| Air Seoul | 5 | LOW_COST | BOTH | 0 | 1 | 2 international | Official portal | 0 |
| Eastar Jet | 6 | LOW_COST | BOTH | 0 | 2 | 1 domestic + 1 international | Official portal | 0 |

The route set is representative rather than exhaustive. Operation scope is based on current official booking or timetable surfaces. Departure airports are not promoted to hubs.

## Air Seoul sources

- Company and headquarters: `https://flyairseoul.com/CW/en/company.do`
- Current domestic/international booking surface: `https://flyairseoul.com/CW/KO/main.do`
- Aircraft: `https://flyairseoul.com/CW/en/aircraft.do`
- Official LCC category evidence: `https://flyairseoul.com/CW/ko/card_ko.do`
- Recruitment: `https://recruit.flyairseoul.com/`

The official aircraft page identifies the Airbus A321-200. Configuration cards are not counted as separate aircraft and quantity remains `null`.

## Eastar Jet sources

- Company and LCC statement: `https://main.eastarjet.com/company/greetings`
- Headquarters: `https://www.eastarjet.com/newstar/PGWKC00001`
- Domestic timetable: `https://www.eastarjet.com/newstar/PGWIA00001`
- Japan timetable: `https://www.eastarjet.com/newstar/PGWIA00002`
- Aircraft: `https://main.eastarjet.com/company/our-aircraft`
- Recruitment: `https://recruit.eastarjet.com/`

The official aircraft page lists B737-8 and B737-800. No quantity is inferred.

## Freshness and provenance

- All stored facts use airline-official authority.
- All stored URLs are HTTPS, live at verification time, and restricted by the exact-host allowlist.
- Fleet and representative routes use a 2026-09-17 verification date and evaluate as `CURRENT` under the existing freshness rule.
- Route scope is deterministic: KR to KR is `DOMESTIC`; KR to a foreign country or territory is `INTERNATIONAL`.

## Recruitment and questions

Both official recruitment home pages were reachable. No stable, directly verifiable official cabin-crew posting text was retained, so recruitment postings are `0`.

No official application-question wording met the `OFFICIAL_POSTING` or `VERIFIED_ARCHIVE` standard. Official questions are therefore `0`, and question-pattern confidence remains `INSUFFICIENT`. Unofficial question copies were explicitly excluded.

## Safety gates

- `verified = true`
- `published = true`
- every fact is source-backed
- `aiContextEnabled = false`

Official data does not automatically activate AI context. The canonical eligibility gate remains unchanged.

## Honest gaps

- No hub/base is stored because the reviewed official pages did not explicitly designate one.
- Fleet quantities remain unknown.
- The representative route list is not an exhaustive timetable mirror.
- Air Seoul's exact domestic city pair is not stored because a stable current official page did not expose both endpoints.
- No official application questions or stable cabin-crew posting archive were available for production storage.

## Scope guard

No STT, Speech, Nonverbal, Competency, Supabase, Weekly, Auth, AI-provider, or mock-purge code is changed by Batch 3A.
