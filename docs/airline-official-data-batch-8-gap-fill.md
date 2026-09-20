# Airline Official Data Batch 8 — Gap Fill

검증일: 2026-09-20
대상: Korean Air, Asiana Airlines, Japan Airlines, T'way Air (`tway_air` canonical identity 유지)

## 원칙

- 항공사 공식 사이트와 공식 채용 공고에 직접 나타난 사실만 저장했다.
- 과거 채용 공고는 `ARCHIVED`로, 현재 공개 중인 JAL 2027 신입 요건은 `CURRENT`로 구분했다.
- 신입·경력·인턴 요건과 절차를 서로 일반화하지 않았다.
- 공식 지원서/면접 질문 원문은 확인되지 않아 4개 항공사 모두 질문 수를 0으로 유지했다.
- 신규 공식 사실은 사용자 답변·연습·readiness를 생성하지 않으며 `aiContextEnabled=false`를 유지한다.

## 공식 출처 및 개선 범위

### Korean Air

- Korean Air Newsroom 2026 recruitment notice
  - https://news.koreanair.com/%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-2026%EB%85%84-%EA%B3%B5%EA%B0%9C-%EC%B1%84%EC%9A%A9-%EC%8B%9C%EC%9E%91-%ED%86%B5%ED%95%A9-%ED%95%AD%EA%B3%B5%EC%82%AC-%EB%8C%80%EB%B9%84-%EC%9A%B0%EC%88%98/
- Korean Air official newsroom hub reference
  - https://www.koreanair.com/contents/footer/about-us/newsroom/list/250509-Korean-Air-and-Delta-Air-Lines-to-strengthen-partnerships
- 추가: archived 2026 학력·언어시험·교정시력 요건, 서류→면접→검진 절차, 개별 일정 안내, ICN global hub.
- 보류: 공식 질문 원문.

### Asiana Airlines

- 이번 검증에서 접근 가능하고 직접 인용 가능한 1차 객실승무원 채용 요건/전형 원문을 확보하지 못했다.
- 기존 Batch 1 자료를 유지했고 requirement/stage/guidance/hub를 추정해서 추가하지 않았다.
- 보류: 채용 요건, 전형 절차, guidance, hub, 공식 질문 원문.

### Japan Airlines

- Current 2027 new-graduate cabin-attendant requirements
  - https://www.job-jal.com/recruit/requirement/new-graduate06.html
- Archived 2025 career cabin-attendant requirements
  - https://www.job-jal.com/recruit/requirement/career07.html
- 추가: current 신입 학력·건강/시력·변동 스케줄·여권·권장 영어 요건, 지원 term/training guidance.
- 추가: archived 경력 Web entry sheet→aptitude assessment→AI interview 절차. AI interview만으로 합격 여부를 정하지 않는다는 경계도 보존했다.
- 보류: 공식 질문 원문.

### T'way Air / Trinity Airways

- Official archived cabin-crew intern notice
  - https://www.trinityairways.com/app/company/NEWS/retrieve/4072
- Current official company/network page
  - https://www.trinityairways.com/app/serviceInfo/contents/455
- Current official timetable
  - https://www.trinityairways.com/app/serviceInfo/flightSchedule?showWholeSchedule=Y
- 추가: archived 2026 학력·언어·해외여행 요건, 서류/역량/영상→1차→2차→검진 절차, 우대·전환 guidance.
- 현재 공식 국내·국제 네트워크 근거로 `operationScope=BOTH`를 설정했다.
- 대표 current route로 GMP–CJU와 ICN–KIX만 저장했다. 전체 시간표를 추출하지 않았다.
- 기존 `tway_air` identity를 유지했으며 신규 항공사를 만들지 않았다.
- 보류: 공식 질문 원문.

## Coverage 재감사

| Airline | Before | After | 핵심 변화 |
| --- | ---: | ---: | --- |
| Korean Air | 38 | 80.5 | requirements 확대, stages/guidance/hub 연결 |
| Asiana Airlines | 40 | 40 | 검증 가능한 신규 1차 자료 없음; 정직하게 유지 |
| Japan Airlines | 55.5 | 80.5 | 일본어 공식 신입 requirements와 archived 경력 stages 연결 |
| T'way Air | 23 | 78 | BOTH scope, 대표 국내/국제 route, recruitment 구조 연결 |

점수는 기존 Coverage Audit rubric을 그대로 적용한 재감사 결과이며 점수를 높이기 위해 미확인 데이터를 생성하지 않았다.

## 데이터 안전성

- 기존 Batch 1–7 profile에 patch를 적용하며 동일 `type + sourceUrl`은 중복 제거한다.
- 기존 값과 신규 patch 값이 충돌하면 기존 값을 유지하고 conflict를 반환한다.
- source allowlist는 `news.koreanair.com`, `www.job-jal.com`만 최소 추가했다. wildcard는 사용하지 않는다.
- 원문을 대량 복제하지 않고 검증 가능한 사실만 짧게 요약했다.
- 공식 application/interview question: Korean Air 0, Asiana 0, JAL 0, T'way 0.
- question pattern: `INSUFFICIENT`.

## 남은 Gap

- P1: Asiana 공식 객실승무원 채용 요건·전형·guidance의 접근 가능한 1차 출처.
- P1: 4개 항공사의 공식 지원서/면접 질문 원문.
- P2: Asiana hub를 명시하는 공식 source, 그리고 시점별 채용 기록 갱신 절차.
