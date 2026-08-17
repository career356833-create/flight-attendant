# 60개 항공사 데이터팩 및 한·영 언어팩 작업 보고서

- 작업일: 2026-07-22
- 대상 프로젝트: `D:\Projects\flight-attendant`
- 데이터 스키마: `cabin-airline-knowledge-v1` 저장 키 / schemaVersion 2
- 결과: 항공사 60개, 지식 프로필 60개, 공식 채용 진입 리소스 60개

## 1. 작업 원칙

현재 채용 여부, 지원 자격, 키·암리치·비자 조건처럼 공고마다 달라지는 정보는 추정하지 않았다. 모든 프로필의 현재 채용 상태는 `unknown`, 자료 상태는 `reviewing`, 유효성은 `unknown`으로 두었다. 각 항공사의 공식 채용 페이지 또는 공식 채용용 ATS 진입점을 1개씩 연결했으며, 실제 지원 전 개별 공고를 다시 확인하도록 안내 문구를 포함했다.

기존 7개 항공사 목업의 `example.invalid`, `MOCK DATA`, 출처 등급 E 연습용 예상 질문은 운영 데이터로 승격하지 않고 마이그레이션 과정에서 제거한다. 사용자가 직접 추가하거나 수정한 정상 데이터는 ID 기준으로 보존하며, 데이터팩에 없는 항목만 보충한다.

## 2. 수록 항공사 60개

### 아시아·태평양 (27)

Korean Air, Asiana Airlines, Singapore Airlines, Cathay Pacific, ANA, Japan Airlines, Qantas, Air New Zealand, AirAsia, Jetstar, Cebu Pacific, VietJet Air, Scoot, Peach Aviation, Jeju Air, T'way Air, Jin Air, Air Busan, Air Seoul, China Airlines, EVA Air, Thai Airways, Malaysia Airlines, Garuda Indonesia, Philippine Airlines, IndiGo, Air India

### 중동 (6)

Emirates, Qatar Airways, Etihad Airways, Saudia, flydubai, Air Arabia

### 유럽 (12)

Lufthansa, Air France, KLM, British Airways, Turkish Airlines, Iberia, Virgin Atlantic, Ryanair, easyJet, Wizz Air, SWISS, Finnair

### 북미 (7)

Delta Air Lines, United Airlines, American Airlines, Southwest Airlines, Air Canada, JetBlue, Alaska Airlines

### 중남미 (4)

LATAM Airlines, Avianca, Copa Airlines, Aeromexico

### 아프리카 (4)

Ethiopian Airlines, Kenya Airways, South African Airways, RwandAir

## 3. 데이터 구조

각 항공사에는 다음 항목이 생성된다.

- 고유 ID, 공식 표시명, 국가 코드, 권역, 비즈니스 모델
- 검색 별칭과 모집 과정에서 확인할 언어
- 운항 환경 태그
- 비즈니스 모델별 일반적인 채용 단계 템플릿
- 공식 채용 진입 URL
- 문서·언어·근무 자격을 개별 공고에서 재확인하라는 안전 안내
- 출처 등급 A의 공식 채용 리소스 1개
- 한국어·영어 지원 로케일
- 검수 상태와 완성도 메타데이터

일반적인 채용 단계는 학습 계획을 위한 분류값이며, 특정 항공사가 현재 해당 단계를 반드시 운영한다는 사실 주장으로 사용하지 않는다. 항공사별 실제 단계는 공식 공고 검수 후 업데이트해야 한다.

## 4. 기존 저장 데이터 마이그레이션

브라우저가 기존 `cabin-airline-knowledge-v1` 데이터를 읽을 때 다음 순서로 자동 병합한다.

1. schemaVersion 2의 60개 기본 프로필과 리소스를 준비한다.
2. 기존 저장 데이터의 정상 프로필·리소스·질문·검수 로그를 ID 기준으로 병합한다.
3. 기존 사용자 데이터가 같은 ID를 가지면 사용자 저장값을 우선한다.
4. `MOCK DATA` 게시자 또는 `example.invalid` URL의 리소스를 제거한다.
5. 기존 seed가 만든 출처 등급 E의 연습용 예상 질문을 제거한다.
6. `[MOCK]` 요약을 가진 기존 초안 프로필은 같은 항공사의 신규 데이터팩 프로필로 교체한다.
7. 병합 결과를 즉시 localStorage에 다시 저장해 새로고침 이후에도 유지한다.

## 5. 한·영 언어팩

기존 `ko.json`과 `en.json`에 동일한 경로로 다음 번역 묶음을 추가했다.

- 신규 국가: 대만, 태국, 인도네시아, 인도, 스위스, 핀란드
- 공식 채용 페이지 및 공고 재확인 안내
- 현재 채용 상태 5종
- 프로필 검수 상태 5종
- 출처 검수 상태 6종
- 채용 단계 13종

자동 검사 결과 두 파일은 총 496개 leaf key가 완전히 대칭이다. 값은 각 언어에 맞게 번역하되 내부 키는 동일하게 유지한다.

## 6. 변경 파일

- `lib/airline-data.ts`: 항공사 기본 목록을 50개에서 60개로 확장
- `lib/airline-knowledge-data.ts`: 60개 지식 프로필과 공식 채용 리소스 생성
- `lib/airline-knowledge-repository.ts`: schemaVersion 2 병합 및 레거시 목업 제거
- `lib/locales/ko.json`: 한국어 데이터팩 용어 및 신규 국가
- `lib/locales/en.json`: 영어 데이터팩 용어 및 신규 국가
- `scripts/validate-airline-data-pack.mjs`: 데이터·URL·번역 대칭 자동 검사
- `package.json`: `validate:airlines` 명령 추가
- `AIRLINE-DATA-LANGUAGE-PACK-REPORT.md`: 본 보고서

## 7. 검증 결과

| 검사 | 명령 | 결과 |
|---|---|---|
| 데이터팩 무결성 | `npm run validate:airlines` | 성공: 60 airlines / 60 official-career seeds / 496 mirrored locale keys |
| TypeScript | `node_modules\\.bin\\tsc.cmd --noEmit` | 성공, 오류 0 |
| 프로덕션 빌드 | `npm run build` | 성공, Next.js 정적 페이지 12개 생성 |

자동 검증기는 항공사 ID 중복, 공식 URL 누락, HTTPS 여부, 고아 URL, 목업 URL 잔존, 마이그레이션 존재, 국가 번역 누락, 한·영 leaf key 불일치를 검사한다.

## 8. 검수 상태와 후속 운영 절차

이번 데이터팩은 60개 항공사의 운영 가능한 골격과 공식 채용 진입점을 완성한 1차 팩이다. 웹 페이지는 지역 리디렉션, 봇 차단, ATS 교체, 채용 종료로 바뀔 수 있으므로 URL이 있다는 이유만으로 현재 채용 중이라고 표시하지 않는다.

관리자 검수 시에는 각 리소스별로 다음을 확인한다.

1. 공식 도메인 또는 항공사가 연결한 공식 ATS인지 확인
2. 링크 정상 응답 및 올바른 항공사 페이지인지 확인
3. 현재 객실승무원 공고 존재 여부를 별도로 기록
4. 공고 게시일, 근무지, 언어, 자격, 전형 단계를 해당 공고 출처와 연결
5. 확인 완료 후에만 `verified` 및 `current`로 승격
6. 공고 종료 시 프로필을 삭제하지 않고 리소스 유효성만 갱신

이 원칙으로 잘못된 상시채용 표기나 과거 자격 요건의 재사용을 방지한다.
