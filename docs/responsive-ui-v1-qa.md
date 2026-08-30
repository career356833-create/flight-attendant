# Responsive UI V1 QA

기능 로직은 변경하지 않고 레이아웃, navigation, overflow와 입력 접근성만 확인한다.

## Viewports

| Viewport | Home | Interview | Mock | Self intro | Experience | Applications |
| --- | --- | --- | --- | --- | --- | --- |
| 390×844 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |
| 768×1024 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |
| 1024×768 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |
| 1366×768 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |
| 1440×900 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |
| 1920×1080 | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS | STATIC PASS |

## Shared checks

- 390px에서 기존 bottom navigation과 safe-area가 유지된다.
- 900px 이상에서 동일 navigation state를 사용하는 sidebar가 표시되고 bottom navigation은 숨겨진다.
- 키보드 Tab 이동과 focus ring이 보인다.
- 가로 overflow, 잘린 CTA, bottom navigation 충돌이 없다.
- 녹음·저장·추천·동기화 로직과 데이터는 변경되지 않는다.
- Desktop에서 콘텐츠가 420px 모바일 프레임으로 고정되지 않으며 1600px 안에서 제한된다.

## Browser status

TypeScript, 관련 unit test, privacy validation과 production build는 통과했다. 브라우저 연결이 local navigation 중 timeout되어 실제 viewport별 click/overflow E2E와 마이크 녹음 E2E는 **SKIPPED** 상태로 남긴다.
