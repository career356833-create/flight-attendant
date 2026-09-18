# Airline Official Data Batch 5

Verified on **2026-09-18** from first-party airline and careers sites. Batch 5 rolls forward the still-current Emirates, Qatar Airways and Etihad Airways records from Batch 3B, then adds Turkish Airlines without creating duplicate airline entities.

| Airline | Official sources | Country / region | Hub | Scope | Fleet | Korea routes | Requirements | Stages | Guidance | Questions |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Emirates | 5 | UAE / Middle East | DXB | International | 3 | 1 | 8 | 3 | 2 | 0 |
| Qatar Airways | 5 | Qatar / Middle East | DOH | International | 10 | 1 | 6 | 1 | 2 | 0 |
| Etihad Airways | 6 | UAE / Middle East | AUH | International | 8 | 1 | 12 | 3 | 2 | 0 |
| Turkish Airlines | 5 | Türkiye / Europe | IST | Domestic + international | 13 | 1 | 3 | 5 | 3 | 0 |

## Official sources

### Emirates

- [Company and official news](https://www.emirates.com/media-centre/)
- [Cabin crew careers, requirements, process and FAQ](https://www.emiratesgroupcareers.com/cabin-crew/)
- [Passenger fleet](https://www.emirates.com/english/experience/our-fleet/)
- [Seoul network surface](https://www.emirates.com/kr/english/destinations/flights-from-seoul/)
- [DXB–LHR schedule](https://www.emirates.com/uk/english/destinations/dxb/lhr/flights-from-dubai-to-london-heathrow/)

### Qatar Airways

- [Company and Doha hub](https://www.qatarairways.com/press-releases/en-WW/about/)
- [Cabin crew qualifications and application](https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html)
- [Cabin crew careers portal](https://careers.qatarairways.com/global/en/c/cabin-crew-cabin-services-jobs)
- [Passenger fleet](https://www.qatarairways.com/en-tz/fleet.html)
- [Official network schedule](https://dmassets.qatarairways.com/adobe/assets/urn:aaid:aem:46c43466-defb-44be-92cc-15668586a966/original/as/Q60-Network-map-07APR26.pdf)

### Etihad Airways

- [Cabin crew careers, requirements and assessment day](https://careers.etihad.com/teams/cabin-crew)
- [Cabin crew style and image guidance](https://careers.etihad.com/legal/cabin-crew-requirements)
- [Passenger fleet](https://www.etihad.com/en/plan/fly-with-etihad/our-fleet)
- [Destinations](https://www.etihad.com/en/destinations)
- [ICN–AUH booking surface](https://www.etihad.com/en-kr/flights/flights-from-seoul-to-abu-dhabi)
- [AUH–LHR booking surface](https://www.etihad.com/en-ae/flights/flights-from-abu-dhabi-to-london)

### Turkish Airlines

- [Corporate profile and Istanbul hub](https://www.turkishairlines.com/uk-ua/press-room/about-us/index-alfa.html)
- [Official careers portal](https://careers.turkishairlines.com/en-US/)
- [Cabin crew role, selection process and FAQ](https://careers.turkishairlines.com/en-us/cabin-crew)
- [Passenger fleet](https://www.turkishairlines.com/en-cl/flights/fly-different/fleet/)
- [IST–ICN booking surface](https://www.turkishairlines.com/en/flights-from-istanbul-to-seoul)

## Data boundaries

- Batch 3B facts are reused rather than copied into duplicate Emirates, Qatar Airways or Etihad entities. Batch 5 is the Workspace roll-forward aggregation for these airlines plus Turkish Airlines.
- Requirements are concise paraphrases of facts directly visible on the official cabin crew pages. Missing items mean **not confirmed in the current public source**, not that a condition does not exist.
- Turkish Airlines states that vacancy-specific age, education and language criteria vary. Batch 5 does not convert that statement into fixed requirements; applicants must check the live vacancy.
- All passenger-fleet quantities remain `null`. Aircraft models are included only at the granularity shown on the official fleet pages. Cargo-only aircraft are excluded.
- The four stored Korea routes are current official airport-pair evidence: DXB–ICN, DOH–ICN, AUH–ICN and IST–ICN. Other route records inherited from Batch 3B are representative international samples, not exhaustive networks.
- No current official application-form question or interview-question wording was directly published. Application, interview and archived official question collections therefore remain empty, with pattern status `INSUFFICIENT`.
- Recruitment FAQ and applicant guidance are stored as guidance, never as application or interview questions.

## Safety, freshness and product integrity

- Every stored source uses HTTPS and an exact official-domain allowlist. No community, blog, Glassdoor, Reddit, YouTube or recruitment-coaching source enters the dataset.
- `verified`, `published` and source-backed facts do not automatically become coaching context. All four profiles retain `aiContextEnabled: false` and remain ineligible for canonical AI context until separately promoted.
- Official facts do not create user answers, saved questions, practice attempts, readiness, rankings or hiring probabilities.
- Existing Overview, Application, Questions, Routes, Fleet, My Experience and Practice views consume the shared Workspace data. No Batch-specific UI is added.
- This phase changes no Supabase schema, authentication, Speech, STT, Nonverbal, Competency, Weekly or user mock-data behavior.

## Unresolved gaps

- Qatar Airways exposes the application entry but not a detailed public selection sequence; only the online-application step remains stored.
- Turkish Airlines vacancy-specific eligibility can change by posting, so fixed age, education and language rules are intentionally not inferred from generic guidance.
- Fleet quantities are unknown by policy because the official model pages do not provide a single current quantity table suitable for this dataset.
- Official application and interview questions remain unverified for all four airlines.
