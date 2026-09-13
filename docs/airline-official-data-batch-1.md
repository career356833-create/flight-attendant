# Airline Official Data Batch 1

검증일: 2026-09-14

## 범위

- 대상: 대한항공(`korean_air`), 아시아나항공(`asiana_airlines`)
- 저장 원칙: 항공사 공식 웹사이트·공식 채용 진입점·공식 발행 자료에서 확인된 사실만 저장
- 결과: 회사 프로필 2개, 공식 출처 9개, 대표 노선 8개, 기단 15개, 공식 지원서 질문 0개
- 외부 DB나 migration은 사용하지 않으며 기존 Airline Targeting Workspace의 읽기 모델에 병합한다.

## 공식 출처

### 대한항공

- 회사·본사: Korean Air 2025 ESG Report
- 기단: Korean Air Fleet
- 채용: Korean Air Recruitment
- 대표 노선: Korean Air Flight Deals, Seoul to Jeju Flights

### 아시아나항공

- 회사: Asiana Airlines Company Overview
- 본사·채용 진입: Asiana Airlines Official Website
- 기단: Asiana Airlines Aircraft
- 대표 노선: Asiana Airlines Routes

모든 저장 source URL은 HTTPS와 항공사 공식 도메인 allowlist를 통과해야 한다. 접근이 확인되지 않은 별도 아시아나 채용 URL은 저장하지 않았다.

## 사실 경계

- 두 항공사는 확인된 국내선·국제선 대표 노선 때문에 운항 범위를 `BOTH`로 표시한다.
- 노선 목록은 전체 네트워크가 아니라 검증 시점에 공식 페이지에서 확인한 대표 airport pair다.
- 대한항공 공식 기단 페이지는 현재 aircraft family를 제공하지만 현재 수량은 제공하지 않아 수량을 `null`로 유지한다.
- 아시아나 공식 aircraft 페이지에 표시된 6개 기종 수량만 저장한다.
- 주요 허브라는 명시적 근거를 이번 출처 세트에서 확보하지 못해 노선 출발지로 추론하지 않고 비워 둔다.
- 현재 공식 페이지에서 지원서 질문 원문을 확인하지 못해 공식 지원서 질문은 0개다. UI는 `확인된 공식 지원서 질문이 없습니다.`라고 표시한다.
- 공식 데이터는 `verified/published`로 표시하되 `aiContextEnabled`는 자동 활성화하지 않는다.

## 최신성·안전

- 각 fact, route, fleet record에 `verifiedAt`과 출처를 보존한다.
- 변동 가능성이 큰 노선·기단·채용 정보는 UI에서 최신성 상태와 원문 링크를 함께 표시한다.
- 비공식 요약 사이트, draft/review research pack, 접근 불가 URL, 추론한 허브·수량·질문은 승격하지 않는다.
- 지원서 질문이 없으므로 질문 패턴 분석을 생성하지 않는다.

## 남은 갭

- 대한항공의 현재 기종별 수량
- 아시아나의 안정적으로 접근 가능한 별도 공식 채용 URL
- 두 항공사가 공식적으로 명시한 허브 목록
- 현재 모집 공고에 포함된 공식 지원서 질문 원문
- 전체 노선 네트워크의 자동 최신화

이 갭은 확인 가능한 공식 근거가 생기기 전까지 빈 상태로 유지한다.
