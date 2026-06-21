# 작업 repo 안내 — 단일화 (2026-06-21)

★ **이 repo(`ltc_audit`)가 유일한 작업 repo다.** 여기서 작업·커밋·`git push origin main` → Vercel(`ieum-ltc.vercel.app`) **자동 배포**.

- ⛔ `../ltc-audit2`는 **폐기**(과거 작업 repo, 원격 없음). 더는 쓰지 않는다 — 백업으로만 보존. 다시 거기서 작업하지 말 것.
- 다음 세션: **이 repo에서 시작.** 의사결정 최상위 기준 = `기준문서_SSOT_작성가이드개편.md` + `진행기준_현재상태.md`(plan-of-record, 매 턴 위치 핀 갱신).

## 배포 구조 (정적, 빌드 없음)
- `index.html` = 랜딩, `ltc_app.html` = 앱(연쇄 추적), `vercel.json`(`framework:null`·빌드 끔).
- 루트 + `vercel/` **양쪽에 동일 사본** 둠(Vercel Root Directory가 어디든 동작). 앱/랜딩 수정 시 **두 위치 같이 갱신** 후 commit·push.
- `index.html`·`vercel.json`은 검증된 상태 — 함부로 바꾸지 말 것.

## 문서·자산
- 전략/엔진/디자인/진행 = 이 repo 루트 .md: SSOT · 진행기준 · 엔진스펙_이어서할일 · 빌드루프_지시서 · 디자인방향_v3 · 네이버카페 자료조사1/2.
- 엔진 자산: `reference/rules.js`(14규칙 판정 로직 — 참조 스펙, 그대로 돌리지 말 것) · `reference/장기요양.md`.
- 공식 평가 PDF 원본(근거 검증용, 용량 커서 미포함): 백업 repo `../ltc-audit2/reference/`.

## 엔진 원칙
- 앱 = 연쇄 누락 교정 도구. `computeOpenChains`·판정·정렬·날짜는 **동결**(근거 없이 변경 금지). 색·표현·카피는 자유(디자인 v3).
- 근거(공식 평가지표 등)는 **반드시 공식 문서에서**(추측 0). 막히면 멈추고 보고.
