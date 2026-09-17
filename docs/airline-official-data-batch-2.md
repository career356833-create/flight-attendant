# Airline Official Data Batch 2

Verified on 2026-09-17. This batch extends the existing airline master and targeting workspace; it does not create airline entities, question banks, AI context, or user preparation records.

## Source policy

- Sources are HTTPS airline-owned pages only. Their hosts are checked by the shared official-source allowlist.
- A route uses an airport code only where the official source exposed it. Otherwise the official city label is preserved.
- Fleet counts are `null` unless the relevant source shows a current, unambiguous total.
- A publication or archive is not converted into a current vacancy or a question unless its actual text/status is verified.
- `aiContextEnabled` remains `false` for every Batch 2 profile. Displaying a source-backed profile does not satisfy the canonical AI context gate.

## Jeju Air

| Field | Verified data |
| --- | --- |
| Official sources | 3 |
| Company / scope | Official company page and current booking page support domestic and international service. |
| Headquarters / hubs | No address or hub is added without a direct source; hubs are intentionally empty. |
| Fleet | Boeing 737-8; Boeing 737-800. Quantities are `null`. |
| Representative routes | 서울(인천) → 제주 (domestic); 서울(인천) → 고베 (international). City labels are retained because both codes were not exposed by the cited page. |
| Careers | Official homepage is the entry point. A separate current career deep link was not independently reachable. |
| Official questions | 0 |

Primary sources: [company profile](https://www.jejuair.net/en/about/corp/page.do), [booking home](https://www.jejuair.net/ko/main/base/index.do), [official website](https://www.jejuair.net/).

## Jin Air

| Field | Verified data |
| --- | --- |
| Official sources | 4 |
| Company / scope | Official agent notices provide domestic and international schedule evidence. |
| Headquarters | Seoul, Gangseo-gu, Gonghang-daero 453. |
| Hubs | Empty: no hub is inferred from departures. |
| Fleet | 0 entries. A current official aircraft-list source was not independently verified, so none is fabricated. |
| Representative routes | GMP → CJU (domestic); ICN → GUM (international). Codes appear in the cited official notices. |
| Careers | Official homepage is the entry point. A separate current career deep link was not independently reachable. |
| Official questions | 0 |

Primary sources: [agent portal](https://agent.jinair.com/main), [2026 domestic notice](https://agent.jinair.com/announce/getDetail?seq=486), [international notice updated in 2026](https://agent.jinair.com/announce/getDetail?seq=663), [official website](https://www.jinair.com/).

## T'way Air

| Field | Verified data |
| --- | --- |
| Official sources | 3 |
| Current identity note | The legacy T'way URL redirects to Trinity Airways. The existing `tway_air` master entity is retained; this batch does not rename or merge entities. |
| Current fleet page | The redirecting official aircraft page lists Boeing 737-8, 737-800, 777-300ER and Airbus A330-300, A330-200. Quantities are `null`. |
| Route / operation scope | No current standalone T'way route pair is added. A 2024 T'way release mentioning domestic/international operations is explicitly `STALE`, so the profile’s current operation scope stays unknown. |
| Careers | Current successor recruitment portal is linked by the official successor site. Vacancy status is not asserted. |
| Official archived posting | One 2024 official archive record: new cabin intern cabin crew recruitment. No recruitment period is invented. |
| Official questions | 0 |

Primary sources: [legacy/redirecting aircraft page](https://www.twayair.com/app/serviceInfo/contents/1322), [historical operations release](https://www.twayair.com/app/company/NEWS/retrieve/3886), [official archived cabin-intern release](https://www.twayair.com/app/company/NEWS/retrieve/3874), [successor recruitment portal](https://trinityairways.recruiter.co.kr/career/home).

## Air Busan

| Field | Verified data |
| --- | --- |
| Official sources | 4 |
| Company / scope | Official route and fare pages support domestic and international service. |
| Headquarters | 6, Yutongdanji 1-ro 57beon-gil, Gangseo-gu, Busan, Republic of Korea. |
| Hubs | Empty: no hub is inferred from departures. |
| Carrier type | `LOW_COST`, based on the airline’s own low-cost-carrier context. |
| Fleet | Airbus A321neo LR, A321neo, A321-200 and A320-200. Quantities are `null`. |
| Representative routes | 부산 → 제주 (domestic); 부산 → 후쿠오카 (international). City labels are retained because both codes were not exposed by the cited pages. |
| Careers | The current official homepage exposes the recruitment menu; no unverified deep link is generated. |
| Official questions | 0 |

Primary sources: [official website](https://en.airbusan.com/content/ko), [route information](https://www.airbusan.com/content/individual/booking/route), [domestic fares](https://www.airbusan.com/content/individual/booking/fareDomestic), [international fares](https://www.airbusan.com/content/individual/booking/fareInternational), [aircraft information](https://www.airbusan.com/content/individual/booking/bookingAircraft), [official low-cost-carrier context](https://www.airbusan.com/content/common/introduction/newsDetail?id=382).

## Totals and unresolved gaps

| Metric | Value |
| --- | --- |
| Profiles | 4 |
| Source-backed fleet entries | 11 |
| Representative routes | 6 (3 domestic, 3 international) |
| Official current questions | 0 |
| Official archived recruitment postings | 1 |

Unresolved items are intentionally visible rather than guessed:

- Jeju Air and Jin Air have no independently reachable current career deep link in this batch; their official homepages are retained as entry points.
- Jin Air has no verified current official fleet page in this batch, so it has no fleet record.
- T'way Air’s legacy domain redirects to Trinity Airways. Its old operation evidence is stale, no current T'way route pair is asserted, and its profile’s operation scope is unknown.
- No official application-question text met the `OFFICIAL_POSTING` or `VERIFIED_ARCHIVE` standard. The workspace therefore keeps the existing honest empty state, and no question-pattern signal is generated.
