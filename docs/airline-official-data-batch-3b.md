# Airline Official Data Batch 3B

Verified: 2026-09-18

Batch 3B connects Emirates, Qatar Airways and Etihad Airways to the existing Airline Targeting Workspace using current official airline and careers sources. Existing canonical identities are reused; no duplicate airline entities are created.

## Coverage

| Airline | Official sources | Country | Hub | Fleet entries | Routes | Requirements | Process steps | Official application/interview questions |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Emirates | 5 | United Arab Emirates | Dubai International Airport (DXB) | 3 | 2 | 8 | 3 | 0 / 0 |
| Qatar Airways | 5 | Qatar | Hamad International Airport (DOH) | 10 | 2 | 6 | 1 | 0 / 0 |
| Etihad Airways | 6 | United Arab Emirates | Zayed International Airport (AUH) | 8 | 2 | 12 | 3 | 0 / 0 |

All three airlines are represented as `FULL_SERVICE`, `INTERNATIONAL`, `verified`, `published`, and `aiContextEnabled = false`.

## Emirates

- Company: `https://www.emirates.com/media-centre/`
- Cabin crew careers, requirements, recruitment day and guidance: `https://www.emiratesgroupcareers.com/cabin-crew/`
- Current fleet: `https://www.emirates.com/english/experience/our-fleet/`
- Current destination evidence, including Seoul-Dubai: `https://www.emirates.com/kr/english/destinations/flights-from-seoul/`
- Current Dubai-London schedule: `https://www.emirates.com/uk/english/destinations/dxb/lhr/flights-from-dubai-to-london-heathrow/`

Stored fleet families are A350, A380 and Boeing 777. No aircraft quantity is inferred. Eight current cabin crew requirements are stored, together with the three recruitment-day stages directly described by the official page.

## Qatar Airways

- Company and Doha hub: `https://www.qatarairways.com/press-releases/en-WW/about/`
- Cabin crew qualifications and application entry: `https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html`
- Careers portal: `https://careers.qatarairways.com/global/en/c/cabin-crew-cabin-services-jobs`
- Current fleet: `https://www.qatarairways.com/en-tz/fleet.html`
- April 2026 network schedule: `https://dmassets.qatarairways.com/adobe/assets/urn:aaid:aem:46c43466-defb-44be-92cc-15668586a966/original/as/Q60-Network-map-07APR26.pdf`

The current cabin crew page does not state a minimum age, so no Qatar minimum-age requirement is stored. Six directly stated requirements are retained. The public page exposes an application entry but does not assert a detailed public selection sequence; Batch 3B therefore stores only the online-application step.

## Etihad Airways

- Cabin crew careers, current requirements and process: `https://careers.etihad.com/teams/cabin-crew`
- Style and image guidance: `https://careers.etihad.com/legal/cabin-crew-requirements`
- Current fleet: `https://www.etihad.com/en/plan/fly-with-etihad/our-fleet`
- Current destinations: `https://www.etihad.com/en/destinations`
- Seoul-Abu Dhabi booking surface: `https://www.etihad.com/en-kr/flights/flights-from-seoul-to-abu-dhabi`
- Abu Dhabi-London booking surface: `https://www.etihad.com/en-ae/flights/flights-from-abu-dhabi-to-london`

Twelve current cabin crew requirements and the three published process stages are stored. Event dates are intentionally not persisted because they expire quickly; the live official event page remains the authority.

## Requirements and guidance policy

- Requirement text is a concise paraphrase of the current official page, not a copied third-party checklist.
- Missing requirements mean **not confirmed in the current official material**, not that an applicant is exempt.
- Official application questions: 0.
- Official interview questions: 0.
- Community, blog, Glassdoor, Reddit and YouTube question lists are excluded.
- FAQ and guidance records cover only directly stated training, assessment, accommodation or application information.

## Fleet and route policy

- Fleet entries use current official passenger-fleet pages.
- Quantities remain `null`; seating layouts and old annual-report counts are not treated as current fleet quantities.
- Cargo-only aircraft are excluded from the applicant-facing passenger fleet list.
- Routes are representative rather than exhaustive.
- Each airline includes one current Korea-related route and one additional international network sample.
- Historical launch announcements are not used to label a route current.

## Source and freshness policy

- Stored URLs use HTTPS and exact official-domain allowlisting.
- Every fact includes a source title and `verifiedAt` value.
- The browser-readable official pages were accessible during verification. If a provider later blocks automated clients, that state must be recorded as `AUTOMATED_ACCESS_RESTRICTED` rather than treating the source as dead.
- Volatile careers, requirements, fleet, process and route facts are marked current at the verification date and require periodic revalidation.

## Safety gates

- Canonical AI eligibility remains `verified && published && source-backed && aiContextEnabled`.
- Batch 3B does not opt any airline into AI context.
- No hiring score, salary ranking, pass probability or airline-preference ranking is introduced.
- Existing Airline Targeting, Application, Interview, Self Introduction, Mock, Speech, Nonverbal, Competency and Privacy behavior remains unchanged.

## Unresolved gaps

- No official application-form question wording was directly verifiable.
- No official interview-question wording was published.
- Fleet quantities are intentionally unknown.
- Qatar Airways publishes only an application entry on the current public cabin crew page; subsequent selection steps are not asserted.
- Rapidly changing recruitment-event dates are not stored as durable product facts.

## Commit validation

- Automated validation rerun: 888/888 tests passed; 0 failed, skipped or todo.
- TypeScript, profile privacy validation, production build and Git whitespace check passed.
- Prior UI QA record: desktop PASS, 390px PASS, horizontal overflow 0, console errors 0. Browser QA was not rerun for this commit audit; this is not a claim of exhaustive tab-by-tab E2E coverage.
- Existing `work/` generated artifacts are preserved and excluded from the commit.
- No push or deployment is part of this commit step.
