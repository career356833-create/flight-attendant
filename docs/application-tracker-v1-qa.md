# Application Tracker V1 QA

Static/build validation passed; click-based browser E2E remains pending because the browser automation CLI is unavailable in this environment.

## Manual scenarios

- [ ] 지원 항공사 추가 및 상태 저장
- [ ] 사용자 입력 마감일의 D-day 표시
- [ ] D-Day 및 지난 일정 D+ 표시
- [ ] 제출 완료 상태 변경과 제출일 제안/저장 확인
- [ ] 면접 일정 입력 및 면접 CTA
- [ ] 기존 Interview Practice로 airlineId 전달
- [ ] 기존 Application Coach로 airlineId 전달
- [ ] 상태 필터 및 상태 변경
- [ ] 확인 dialog 후 Tracker record만 삭제
- [ ] 로그아웃 상태 local 저장/재방문 복원
- [ ] 로그인 상태 remote merge 및 다른 기기 복원
- [ ] remote 실패 시 local 목록/편집 유지
- [ ] 390px에서 날짜 필드, 카드, CTA overflow 없음
- [ ] Home upcoming 최대 3개 및 7일 요약

## Safety checks

- 날짜는 사용자 입력만 저장하며 추정하지 않는다.
- 삭제는 지원서 답변·면접 기록을 cascade 삭제하지 않는다.
- age, birthDate, gender, photo, phone, email을 저장·우선순위 판단에 사용하지 않는다.
