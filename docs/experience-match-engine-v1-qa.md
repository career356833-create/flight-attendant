# Experience Match Engine V1 QA

Local validation covered deterministic recommendation behavior for interview, application, self introduction, and experience coverage. Browser click E2E remains pending.

## Manual checklist

- [ ] Experience 0개일 때 빈 상태 안내
- [ ] Experience 1개일 때 단일 추천
- [ ] 고객서비스 질문에 고객서비스 경험 추천
- [ ] Teamwork 질문에 teamwork 경험 추천
- [ ] Safety 경험이 없을 때 약한 경험 강제 추천 없음
- [ ] 면접 질문 추천에 이유 표시
- [ ] 지원서 추천에 이유 표시
- [ ] 자기소개 추천에 작은 추천 UI 표시
- [ ] 같은 경험 반복 사용 시 과사용 페널티 반영
- [ ] 390px에서 추천 카드 overflow 없음

## Privacy

Experience Match Engine 입력에는 경험 내용, STAR 구조, 태그, competency, 질문, 선택한 항공사만 사용한다. age, birthDate, gender, photo, email, phone, address는 사용하지 않는다.
