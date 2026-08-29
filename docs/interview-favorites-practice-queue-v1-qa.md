# 질문 즐겨찾기 · 재연습 큐 V1 QA

## 자동 검증

- [x] TypeScript
- [x] 관련 unit tests (16/16, 기존 면접 회귀 포함)
- [x] Production build
- [x] Profile privacy validation
- [x] `git diff --check`

## 수동 QA

- [ ] 질문 준비 화면에서 즐겨찾기 추가/해제
- [ ] 즐겨찾기만 눌렀을 때 재연습 큐에 자동 추가되지 않음
- [ ] 결과 화면에서 재연습 추가 및 중복 방지
- [ ] 면접 탭에서 재연습 큐 우선순위와 즐겨찾기 최근 5개 표시
- [ ] Home에서 첫 재연습 질문 CTA 표시
- [ ] 큐 질문 진입만으로 `practiced` 처리되지 않음
- [ ] 답변 분석과 Attempt 저장 완료 후 `practiced` 처리
- [ ] published 항공사 질문만 복원되며 draft/unpublished 질문은 제외
- [ ] 일반 단일 면접, Mock Interview, AI Interviewer 기존 흐름 유지
- [ ] 390px에서 버튼/카드 overflow 없음

Browser click E2E는 실제 브라우저 제어 및 마이크 환경에서 별도 확인한다.

## Blocker 재감사

- [x] Legacy favorite/queue record 정규화 및 손상 레코드 제외
- [x] 잘못된 날짜는 현재 시각으로 대체하지 않고 정렬 마지막 처리
- [x] localStorage write 실패를 `false`/`null`로 격리하고 기존 값 보존
- [x] Home CTA가 canonical open queue 실제 개수를 표시
- [x] `manual`과 `favorite`를 동일 priority tier로 처리
