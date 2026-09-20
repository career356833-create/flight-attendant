# Airline Official Data Batch 9 — Gap Fill

검증일: 2026-09-20
대상: Jeju Air, Jin Air, Air Busan, British Airways

## 원칙

- 항공사 공식 사이트·공식 recruiter·공식 문서에 직접 나타난 사실만 저장했다.
- 2025/2026 종료 공고는 모두 `ARCHIVED`로 구분했으며 현재 요건으로 일반화하지 않았다.
- 기단 수량과 현재 노선을 추정하지 않았다.
- British Airways의 Seoul 노출은 운항사 증거가 아니므로 BA 직접 운항 노선으로 저장하지 않았다.
- 네 항공사 모두 `aiContextEnabled=false`를 유지한다.

## 공식 출처와 개선 필드

### Jeju Air

- [Official recruitment portal](https://jejuair.recruiter.co.kr/career/home)
- [Archived August 2026 cabin-crew notice](https://jejuair.recruiter.co.kr/career/jobs/123458)
- 추가: 공식 careers deep link, archived education/language/travel/fitness requirements, document+competency screening, interview boundaries, application/training guidance.
- 공식 질문 원문: 0.

### Jin Air

- [Official recruitment portal](https://jinair.recruiter.co.kr/)
- [Archived cabin-crew online presentation guide](https://jinair.recruiter.co.kr/com/attachFile/downloadFile?fileUid=7ed8f5bf-b79a-4dc8-a60d-1284e5408c37.pdf)
- [Official video-assessment precautions](https://jinair.recruiter.co.kr/com/attachFile/downloadFile?fileUid=b080ea0f-7272-4ed4-bf9a-833cd578bff0.pdf)
- [Official 2026 business guide](https://files.jinair.com/documents/%EC%A7%84%EC%97%90%EC%96%B4%20%EC%83%81%EC%9A%A9%EC%9A%B0%EB%8C%80%20%EC%9D%B4%EC%9A%A9%EC%95%88%EB%82%B4%EC%84%9C%282026%29.pdf)
- 추가: official careers deep link, archived online-presentation step/guidance, official B737-800 record with `quantity=null`.
- 공식 영상 PT 질문 원문: 1. 그 외 지원서·면접 질문은 추가하지 않았다.
- 보류: 접근 가능한 공식 공고 본문에서 직접 검증할 수 없었던 일반 지원요건, 완전한 기단 목록.

### Air Busan

- [Official recruitment portal](https://airbusan.recruiter.co.kr/)
- [Archived August 2026 cabin-crew notice](https://airbusan.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=263073&systemKindCode=MRS2)
- [Official company introduction](https://www.airbusan.com/content/common/introduction/greeting)
- 추가: official careers deep link, archived education/vision/language/travel requirements, six published selection stages, application/assessment/training guidance.
- `Busan, Republic of Korea`만 저장했다. 공식 문구가 도시 기반을 뒷받침하지만 특정 공항 허브는 추정하지 않았다.
- 공식 질문 원문: 0.

### British Airways

- [Current official route-network surface](https://www.britishairways.com/content/information/flight-information/our-route-network)
- [Official timetable](https://www.britishairways.com/travel/schedules/public/en_gb)
- Korea route result: `UNKNOWN`.
- Seoul 목적지 노출만으로 BA 직접 운항을 확정하지 않았다. partner/codeshare/connecting itinerary와 과거 운항 자료는 current BA-operated route에서 제외했다.
- 기존 recruitment/fleet은 유지했고 새 route record는 0.
- 공식 질문 원문: 0.

## Coverage 재감사

| Airline | Before | After numeric | 확인 가능한 변화 |
| --- | ---: | ---: | --- |
| Jeju Air | 33 | 보류 | requirements/stages/guidance/careers 보강 |
| Jin Air | 30 | 보류 | partial official fleet, online PT stage/guidance, official question 1건 |
| Air Busan | 38 | 보류 | requirements/stages/guidance/careers/city-base provenance 보강 |
| British Airways | 73 | 73 | Korea operator status는 정직하게 UNKNOWN 유지 |

기존 audit의 숫자 산식이 저장소에 포함돼 있지 않아 Jeju/Jin/Air Busan의 새로운 숫자를 임의로 만들지 않았다. 대신 재현 가능한 필드 단위 delta를 기록했다. BA는 gap이 미해결이므로 기존 점수를 유지한다.

## 데이터 안전성

- 동일 `type + sourceUrl`은 중복 제거한다.
- profile 값 충돌은 자동 덮어쓰지 않고 conflict로 반환한다.
- allowlist에는 `jejuair.recruiter.co.kr`, `jinair.recruiter.co.kr`, `airbusan.recruiter.co.kr`만 정확한 host로 추가했다.
- 공식 질문: Jeju 0, Jin 1, Air Busan 0, British Airways 0. 1건 표본의 pattern confidence는 `INSUFFICIENT`다.
- 공식 데이터 로드는 사용자 활동·답변·연습·readiness를 생성하지 않는다.

## 남은 Gap

- P1: Jin Air 일반 객실승무원 지원요건과 완전한 current fleet을 직접 명시하는 접근 가능한 공식 자료.
- P1: British Airways current Korea sector의 operating-carrier 근거. 확인 전까지 `UNKNOWN`.
- P2: Jeju Air와 Air Busan의 현재 공개 중인 공고, 네 항공사의 추가 공식 질문 원문.
