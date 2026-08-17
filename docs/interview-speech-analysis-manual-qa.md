# Interview Speech Analysis manual QA

- 정상·작은·큰 음량으로 각각 녹음하고 dBFS, quiet, clipping 안내를 확인한다.
- 2초 이상 쉰 뒤 긴 쉼 횟수를 확인한다.
- 영어와 한국어에서 filler 표시 및 예상 발화 속도를 확인한다.
- 빠른·느린 답변에서 속도 라벨이 참고용으로 표시되는지 확인한다.
- STT 실패, 마이크 권한 거절, 녹음 중단 시 기존 텍스트 경로와 저장이 계속되는지 확인한다.
- confidence/segment가 없는 provider에서는 발음 명료도 참고와 다시 확인할 구간이 숨겨지는지 확인한다.
- 과거 attempt 및 audioMetrics/speechMetrics가 없는 attempt를 열어도 결과 화면이 정상인지 확인한다.
