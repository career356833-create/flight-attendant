# Airline Official Question Research V1

검증일: 2026-09-20
범위: Korean Air, Jeju Air, Japan Airlines(JAL) 공식 지원서·면접 질문 provenance 조사와 기존 24개 항공사 coverage 재계산

## 판정 원칙

- `OFFICIAL_CURRENT`: 현재 채용 회차와 직접 연결된 항공사 공식 지원 폼·채용 페이지·공고·PDF에 질문 원문이 실제로 존재하는 경우
- `OFFICIAL_ARCHIVE`: 과거 공식 페이지·공식 PDF에 질문 원문이 존재하고 연도 또는 채용 회차를 확인할 수 있는 경우
- `USER_REPORTED`: 사용자가 직접 저장한 개인 제보. 기본 `verified=false`이며 다른 사용자에게 공식 자료로 전파하지 않음
- `VERIFIED_SECONDARY`: 기사·학교 취업센터·공신력 있는 채용기관 등 보조 자료. 공식 질문으로 집계하지 않음
- `UNVERIFIED_COMMUNITY`: 카페·블로그·후기 사이트·영상·커뮤니티. 공식 데이터와 공식 패턴에서 제외

공식 질문 패턴에는 `OFFICIAL_CURRENT`와 `OFFICIAL_ARCHIVE`만 들어간다. 질문 수가 1~2개면 `INSUFFICIENT`, 3~5개면 `LIMITED`, 6개 이상이면 `OBSERVED_PATTERN`이다. 여러 채용 회차에서 같은 분류가 반복된 경우에만 `REPEATED_THEME`를 만들며 미래 질문을 예측하지 않는다.

## Pilot 조사 결과

| 항공사 | 확인한 공식 자료 | Current application | Current interview | Official archive | 판정 |
| --- | --- | ---: | ---: | ---: | --- |
| Korean Air | 2026 공개채용 공식 뉴스룸과 공식 채용 안내 연결 | 0 | 0 | 0 | 지원 자격·전형은 확인됐지만 공개 페이지에 질문 원문 없음 |
| Jeju Air | 2026 하반기 객실승무원 공식 Recruiter 공고 | 0 | 0 | 0 | 공고는 확인됐지만 공개 화면에서 질문 원문 없음 |
| Japan Airlines | 객실승무직 공식 모집요강·공식 FAQ | 0 | 0 | 0 | WEB ES·AI 면접 단계는 확인됐지만 질문 원문 없음 |

확인한 공식 URL:

- Korean Air: https://news.koreanair.com/%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-2026%EB%85%84-%EA%B3%B5%EA%B0%9C-%EC%B1%84%EC%9A%A9-%EC%8B%9C%EC%9E%91-%ED%86%B5%ED%95%A9-%ED%95%AD%EA%B3%B5%EC%82%AC-%EB%8C%80%EB%B9%84-%EC%9A%B0%EC%88%98/
- Jeju Air: https://jejuair.recruiter.co.kr/career/jobs/123458
- JAL 모집요강: https://www.job-jal.com/recruit/requirement/career07.html
- JAL FAQ: https://www.job-jal.com/recruit/faq/

지원자 전용 로그인 화면 안에만 있을 수 있는 문항은 공개 공식 원문을 확인하지 못했으므로 저장하지 않았다. 검색 결과의 요약, 후기, 블로그 문구도 질문 데이터로 전환하지 않았다.

## 기존 Jin Air 회귀

기존 2025 상반기 공식 온라인 프레젠테이션 질문 1개는 `OFFICIAL_ARCHIVE`로 명시했다. 원문과 표시 문구를 동일하게 보존하고, `year=2025`, `recruitmentPeriod`, 한국어 locale, 공식 PDF 출처, 검증 시각을 유지한다. 단일 과거 질문이므로 패턴 상태는 `INSUFFICIENT`이고 recurrence는 없다.

## 24개 항공사 coverage

| 지표 | 항공사 수 | Coverage |
| --- | ---: | ---: |
| 공식 지원서 질문 보유 | 0/24 | 0% |
| 공식 면접 질문 보유 | 1/24 | 4.17% |
| 공식 과거 질문 보유 | 1/24 | 4.17% |

Pilot 3개 항공사는 모두 공식 질문 0개라서 honest empty state를 유지한다. Jin Air를 포함해 24개 전 항공사의 pattern confidence는 계속 `INSUFFICIENT`다.

## 구현 경계

- 원문은 `rawSourceText`, 화면용 문구는 `questionText`, 번역은 `translatedText`로 분리할 수 있다.
- locale은 `ko`, `en`, `ja`를 지원한다. 번역문을 공식 원문으로 취급하지 않는다.
- 중복 키는 airline, 정규화한 질문 문구, 연도/채용 회차, provenance로 구성한다. 같은 문구라도 다른 회차면 별도 증거로 남긴다.
- Questions 탭은 provenance 필터와 텍스트 배지를 제공하며 색상에만 의존하지 않는다.
- 질문에서 지원서 답변, 단일 면접, 모의면접, 자기소개로 이동할 수 있다. 단일 면접 lineage에는 airline, workspace question, 기존 source type, provenance를 보존한다.
- 질문 데이터만으로 사용자 답변·연습·readiness를 만들지 않으며 `aiContextEnabled`도 자동 변경하지 않는다.
- 공식 안내문 전체가 아니라 필요한 짧은 질문 원문과 metadata만 저장한다.

## 미해결 gap

- Pilot 3개사의 공개 공식 페이지에서는 지원자 전용 폼의 실제 문항 원문을 확인할 수 없었다.
- 삭제된 공식 페이지를 외부 Web Archive에서만 찾는 경우 `VERIFIED_SECONDARY` 검토 대상이며 공식 archive로 승격하지 않는다.
- 공식 자료가 새로 공개되기 전까지 application coverage 0/24, interview coverage 1/24를 유지한다.
