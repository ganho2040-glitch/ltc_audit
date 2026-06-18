# 클로드 코드 설계 — 프레임 교체 (엔진 유지, 표현 교체)

> 원칙: **엔진(rules.js 판정 로직, 점수 계산, CSV, 상태관리)은 절대 손대지 않는다.**
> 바꾸는 건 센터장이 보는 *모든 표면* — 제목, 대시보드 구조, 문구, 카테고리.
> 현재 샘플 기준선: 77점 (🔴5 / 🟡9). 각 단계 후 이 기준선 확인.

> **디자인 방향: premium-frontend-design Section D — Minimalist Editorial**
> 50~60대 1인 센터장 타겟. 신뢰·안전·구조가 핵심. 화려함 금지.

---

## 디자인 토큰 (Section D 기반, 전 Step 공통)

```css
/* 타이포그래피 */
--font-display: 'Noto Serif KR', serif;     /* 제목·헤드라인 */
--font-body: 'Pretendard', -apple-system, sans-serif;  /* 본문·UI */
--h1: 28px / line-height 1.15 / weight 700 / tracking -0.02em  (mobile: 24px)
--h2: 20px / line-height 1.25 / weight 700                      (mobile: 18px)
--body: 15px / line-height 1.6 / weight 400                     (mobile: 14px)
--caption: 13px / color #9CA3AF
--pill: 12px / uppercase / tracking 0.05em

/* 색상 (warm monochrome + spot pastels) */
--canvas: #FFFFFF;
--surface: #F7F6F3;          /* 카드·구역 배경 */
--card: #F9F9F8;
--border: #EAEAEA;           /* 모든 border는 1px solid 이것 */
--text-primary: #1F2A37;     /* 순수 검정(#000) 금지 */
--text-secondary: #6B7280;
--text-muted: #9CA3AF;

/* 의미 색 (spot pastels) */
--risk-bad-bg: #FDEBEC;  --risk-bad-text: #9F2F2D;    /* 위험 */
--risk-warn-bg: #FBF3DB;  --risk-warn-text: #956400;   /* 주의 */
--risk-ok-bg: #EDF3EC;  --risk-ok-text: #346538;       /* 양호 */
--accent-bg: #E1F3FE;  --accent-text: #1F6C9F;         /* 정보 */

/* CTA */
--cta-bg: #111111;  --cta-text: #FFFFFF;  --cta-hover: #333333;
--cta-radius: 4px;  /* 둥글지 않게 */

/* 간격 */
--section-gap: 32px;  (mobile: 24px)
--card-padding: 24px;  (mobile: 16px)
--card-radius: 10px;
--max-content: 720px;  /* 텍스트 폭 제한 */

/* 모션 (invisible, quiet) */
scroll-entry: translateY(12px) + opacity 0 → 600ms cubic-bezier(0.16,1,0.3,1)
hover: scale(0.98) on active
전환: transform + opacity만. 그 외 애니메이션 금지.

/* 터치 타겟 (50대 손가락) */
--button-min-height: 52px;  (mobile: 56px)
--input-min-height: 48px;
--tap-zone: 44px × 44px minimum;
```

**절대 금지 (Section D Banned):**
이모지 아이콘, Inter/Roboto, 그라디언트, 네온, 3D 글래스, heavy shadow,
primary-colored hero 배경, 둥근(rounded-full) 큰 컨테이너, 3열 동일 카드 레이아웃,
generic placeholder names, AI clichés

---

## 전체 작업 순서

```
Step 0: 현재 코드 전체 읽기 + 구조 파악 → 보고만
Step 1: 제목 + 보조문구 + 차별점 + 안전문구 교체 (문자열만)
Step 2: 대시보드 카테고리 재구성 (청구/평가/현지조사/긴급TOP3)
Step 3: 위험 표현 일괄 교체 (RULE_LABELS + 위반문구)
Step 4: Y06 라벨 명확화 + Y18 신규 규칙
Step 5: 가격(99,000원) + 사전신청(페이크도어)
```

각 Step은 독립적으로 커밋·검증 가능. 한 번에 하나씩, 멈추고 확인.

---

## Step 0: 코드 구조 파악 (읽기만, 수정 금지)

```
프로젝트 전체 코드를 읽고 다음을 보고해:
1. App.jsx의 전체 컴포넌트 구조 (어떤 섹션이 어떤 순서로 렌더링되는지)
2. 현재 제목 문자열이 어디에 있는지
3. 상단 요약 바(수급자 수/위험/주의/점수)가 어떤 데이터를 어떻게 계산하는지
4. 규칙별 카테고리(청구/평가/현지조사)가 이미 구분돼 있는지, 아니면 전부 flat인지
5. RULE_LABELS 전체 매핑
6. 위반 문구가 어디에 정의돼 있는지 (App.jsx의 어디)
7. 면책문구/안전문구가 어디에 있는지

지금은 수정하지 마. 보고만.
```

---

## Step 1: 제목 + 보조문구 + 차별점 + 안전문구

```
[Step 1] 앱의 표면 문구를 교체한다. 로직·구조는 손대지 마.

(A) 메인 제목 교체:
현재: "방문요양 월간 기록 리스크 감사" (또는 유사)
변경: "1인 방문요양센터장을 위한 월말 리스크 점검표"

(B) 보조 문구 추가 (제목 아래):
"혼자 운영해도, 평가 전에 놓치면 안 되는 기록 흐름을 먼저 보여드립니다."
스타일: font-size 14px, color #6B7280, margin-top 4px

(C) 차별점 배너 (제목 아래 또는 상단 요약 위):
"이 앱은 기록을 대신 작성하지 않습니다.
이미 작성된 기록들이 청구 전·평가 전·현지조사 전에 서로 맞는지 점검합니다."
스타일: bg #F7F6F3, border-left 3px solid #1F6C9F, padding 12px 16px, font-size 13px

(D) 안전 문구 교체:
현재: (확인 필요)
변경: "본 점검은 공단 평가 결과나 현지조사 결과를 보장하지 않습니다.
위험 또는 주의 항목은 공식 판정이 아니라, 기관 내부에서 추가 확인이
필요한 기록 흐름을 의미합니다."

→ build + 77점 확인 + 커밋 + 멈춤
```

---

## Step 2: 대시보드 카테고리 재구성 (가장 큰 변화)

```
[Step 2 — 주의: 이건 표시 구조를 바꾸는 거라 Step 1보다 복잡]

먼저 이해할 것:
현재 상단 요약 바는 "수급자 수 / 위험 건수 / 주의 건수 / 총 점수"로 flat하다.
이걸 센터장의 업무 흐름(청구/평가/현지조사)으로 재분류한다.

[Step 2a] 규칙별 카테고리 매핑 정의 (코드 수정 전 — 확인만)
각 규칙이 어느 카테고리에 속하는지 매핑표를 만들어 보고해:

청구 전 확인: R01(시간 불일치), R02(RFID vs 청구), R03(청구일수), R04(보험 공백)
평가 전 확인: Y01(욕구사정), Y02(계획서 서명), Y04(인지활동형), Y05(상태변화),
              Y06(방문상담), Y09(위험도평가), Y11(결과평가)
현지조사 대비: Y03(기록지 서명), R07(자격·신고)
기록흐름: (위의 것들을 가로지르는 연결성 — 별도 카테고리보다는 기록흐름 시각화로 나중에)

이 매핑이 맞는지 보고 후 → 지시 기다릴 것.

[Step 2b] 상단 요약 바를 카테고리별로 재구성 (지시 후)
기존 "위험 N건 / 주의 N건" 한 줄 → 카테고리 카드 + 총합:

[Section D 레이아웃 규칙 적용]
- 3열 동일 카드 금지 → 비대칭 벤토 그리드 사용
- 구조: CSS Grid, 1px solid #EAEAEA border, radius 10px, padding 24px
- 카드 배경: #F9F9F8 (--card), 그림자 없음(shadow 금지)
- 카드 내 숫자: Noto Serif KR 24px bold, 색은 해당 위험도 색
- 카드 내 라벨: Pretendard 13px, #6B7280
- 모바일: 단일 컬럼으로 쌓임 (grid-cols-1)

카드 구성 (비대칭: 좌 넓게 2개 / 우 좁게 1개, 또는 1:1:1이 아닌 2:1 비율):
카드 1 (넓음): "청구 전 확인" — R01~R04 위험+주의 건수 + 대표 항목 1줄
카드 2 (넓음): "평가 전 확인" — Y01~Y11 위험+주의 건수 + 대표 항목 1줄
카드 3 (좁음): "현지조사 대비" — Y03·R07 위험+주의 건수
총합 (카드 아래 한 줄): "총 위험 N건 / 주의 N건 / 자체점검 N점"

핵심: 새 계산 없음. 기존 판정 결과를 카테고리별로 *그룹핑*만 하는 것.
점수 계산은 절대 건드리지 마.

→ build + 77점 동일 + 커밋 + 멈춤

[Step 2c] "대표자가 이번 달 먼저 확인할 TOP3" 추가 (기존 "즉시확인 TOP5" 확장)
앱 개선 2단계에서 설계했던 "즉시 확인 TOP5"를 여기서 구현.
기존 판정 결과에서 위험 우선 정렬 → 상위 3개를 표시:

형식:
1. [수급자명] — [실무 문장]
   [핵심 확인값]
   → [즉시 조치]

예시:
1. 김영순 — 기록지 총시간과 세부 활동시간이 맞지 않습니다.
   총시간: 180분 / 세부 합계: 170분
   → 기록지 재확인 또는 제공시간 수정이 필요합니다.

위험 항목이 3개 미만이면 주의 항목으로 채움. 0건이면 "확인할 항목이 없습니다."

→ build + 77점 동일 + 커밋 + 멈춤
```

---

## Step 3: 위험 표현 일괄 교체

```
[Step 3] RULE_LABELS와 위반 문구를 리서치 기반 실무 언어로 일괄 교체.
rules.js judge()는 절대 수정 금지. App.jsx의 표시 문구만.

교체표 (내부 코드 → 고객에게 보이는 문구):
R01: "기록지 총시간과 세부 활동시간이 맞지 않습니다."
R02: "태그/기록 시간과 청구 예정 시간이 일치하는지 확인이 필요합니다."
R03: "청구일수와 실제 근무 가능일수가 맞는지 확인이 필요합니다."
R04: "보험 공백기간에 청구가 포함되었는지 확인이 필요합니다."
R07: "요양보호사 자격 및 인력신고 상태 확인이 필요합니다."
Y01: "평가연도 내 욕구사정 기록 및 계획 반영 여부 확인이 필요합니다."
Y02: "급여제공계획서 설명 및 확인서명 여부 확인이 필요합니다."
Y03: "급여제공기록지 서명 누락 여부 확인이 필요합니다."
Y04: "인지활동형 수급자 여부와 제공기록 연결 확인이 필요합니다."
Y05: "상태변화 기록이 방문상담 또는 계획 변경으로 이어졌는지 확인이 필요합니다."
Y06: "월 1회 방문상담 및 상담결과 반영 여부 확인이 필요합니다. (15명 이상 가산 기관)"
Y09: "반기별 위험도평가 기록 여부 확인이 필요합니다."
Y11: "급여제공결과평가 및 계획 재작성 여부 확인이 필요합니다."

위반 문구도 같은 톤으로: "부당청구" → "청구 전 추가 확인 필요",
"감점" → "평가 전 기록 흐름 확인 필요" 등. 단정 표현 전부 완화.

→ build + 77점 동일 + 커밋 + 멈춤
```

---

## Step 4: Y06 라벨 + Y18 신규

```
[Step 4a] Y06 — 이미 정확, 라벨만:
- "사회복지사 방문상담" → "사회복지사 방문상담 (15명 이상 가산 기관)"
- 15명 미만 시 "해당 없음" 안내
→ 커밋

[Step 4b~4d] Y18 신규 — 인계 브리핑의 작업 B 참조:
- 규칙 정의 + 입력 키 + 샘플 + CSV + judge 확장
- 기존 교정 1~4와 동일한 잘게 쪼개기 패턴
→ 각 단계 커밋 + 멈춤
```

---

## Step 5: 가격 + 사전신청 (페이크도어)

```
[Step 5] 페이지 하단에 가격·사전신청 섹션 추가.
실제 결제 연동 없음. 지불 의향 검증용.

(A) 섹션 구성:
헤드라인: "월간 기록 흐름 점검 서비스"
부제: "이 화면은 가상 샘플입니다. 우리 센터 기록을 매달 점검받으세요."
가격: "월 99,000원" (font-size 28px, font-weight 700)
포함 내용: "수급자 전원 · 월 1회 점검 리포트 · 평가 전 보완 가이드"
하단: "현재 사전신청 중 · 정식 출시 시 가장 먼저 안내드립니다"

(B) 사전신청 폼:
입력: 이메일 또는 카카오톡 ID (필수) + 센터명 (선택)
동의 체크: "점검표 발송을 위해 입력 정보를 사용하는 것에 동의합니다."
버튼: "사전신청하기 · 월 99,000원"
제출: Formspree (무료) → 구글시트 자동연결
UTM hidden field: utm_source, utm_medium, utm_campaign

(C) 제출 후:
폼 → "감사합니다! 정식 출시 시 가장 먼저 안내드리겠습니다."

(D) 상단/하단 고정 배너 (선택):
"우리 센터 기록 점검 신청 · 월 99,000원 →" — 클릭 시 폼으로 스크롤

→ build + 77점 동일 + Formspree 테스트 + 커밋 + 멈춤
```

---

## 검증 체크리스트 (모든 Step 공통)

기능 검증:
- [ ] npm run build 성공
- [ ] 샘플 데이터 77점 (🔴5 / 🟡9) 동일
- [ ] CSV 다운→업로드 round-trip 정상
- [ ] PDF 인쇄 정상 (새 제목·문구·카테고리 반영)
- [ ] 옛 CSV(새 칼럼 없음) 업로드 시 오류 없음

디자인 품질 (S1~S10):
- [ ] 시그니처 컬러 바가 세 카드에 일관되게 적용
- [ ] hover·focus·disabled 상태가 카드·버튼·체크·입력에 적용
- [ ] 위반 0건 시 "양호" 상태가 표시됨
- [ ] CSV 오류 시 에러 배너 표시됨 (기존 데이터 유지)
- [ ] 모바일 375px에서 깨짐 없음 + 터치 타겟 44px+
- [ ] Tab 키로 전체 네비게이션 가능 + focus-visible outline
- [ ] PDF에 새 대시보드 카테고리가 반영됨
- [ ] Noto Serif KR + Pretendard가 로드됨 (fallback 확인)
- [ ] 대시보드 카드 cursor: default (클릭 아님)

---

## 이 설계의 핵심

**Step 1~3은 "같은 엔진, 다른 껍질"** — 판정 로직 0줄 수정, 표시 문구만 교체.
**Step 4는 규칙 추가** — 기존 교정 패턴(문구→키→로직) 그대로.
**Step 5는 비즈니스 레이어** — 앱의 *존재 이유*(지불 의향 검증)를 완성.

전체 작업량: Step 1~3은 각 1~2시간, Step 4는 반나절, Step 5는 반나절.
총 2~3일이면 **"센터장의 언어로 말하는 앱 + 가격이 붙은 앱"**이 나옴.

---

## 보완 — 디자인 품질 기준 (기존 유지, 추가만)

> frontend-design + Section D 체크리스트 대조 결과.
> 기존 토큰·레이아웃·카피·5단계 순서는 절대 건드리지 않음. 아래는 *빠진 것*만 추가.

### S1. 시그니처 요소 (이 앱을 기억하게 할 단 하나)

"청구 전 / 평가 전 / 현지조사 대비" 세 카테고리 카드가 시그니처.
각 카드 상단에 **가는 컬러 바**(height: 3px)를 넣어 시각적 구분:
- 청구 전: --accent-text (#1F6C9F) 파란색
- 평가 전: --risk-warn-text (#956400) 노란색
- 현지조사 대비: --risk-bad-text (#9F2F2D) 빨간색

이 컬러 바가 카드 상단에 일관되게 붙으면, "세 색 카드"가 앱의 시각적 정체성이 됨.
PDF·랜딩·광고 소재에서도 같은 구조 반복 → 인지 일관성.

### S2. 컴포넌트 상태 (hover·focus·disabled·active)

```css
/* 카드 (대시보드 카테고리) */
카드:hover → border-color: --text-muted (#9CA3AF), transition 200ms
카드:focus-visible → outline: 2px solid --accent-text, outline-offset: 2px

/* CTA 버튼 */
:hover → bg --cta-hover (#333)
:active → scale(0.98)
:focus-visible → outline: 2px solid --accent-text, outline-offset: 2px
:disabled → opacity 0.5, cursor: not-allowed

/* 체크박스 */
:checked → bg --text-primary (#1F2A37), border-color 동일
:hover → border-color --text-secondary (#6B7280)
:focus-visible → ring 2px --accent-text
:disabled → opacity 0.4

/* 입력 필드 (날짜·숫자) */
:focus → border-color --accent-text (#1F6C9F), ring 1px 동일
:invalid → border-color --risk-bad-text (#9F2F2D)
placeholder → color --text-muted (#9CA3AF)

/* 탭 (수급자 선택) */
[active] → border-bottom 2px solid --text-primary, font-weight 600
[inactive]:hover → bg --surface (#F7F6F3)
```

### S3. 빈 상태 + 양호 상태

```
위반 0건일 때:
- 대시보드: "이번 달 확인할 항목이 없습니다." (color --risk-ok-text, bg --risk-ok-bg)
- TOP3 영역: 숨기거나 "확인할 항목이 없습니다. 다음 달에 다시 점검하세요."
- 수급자 카드: badge "양호" (bg --risk-ok-bg, text --risk-ok-text)

수급자 0명일 때 (앱 첫 진입, CSV 안 올림):
- "수급자 1명 샘플 데이터로 점검표가 어떻게 작동하는지 확인하세요."
- 큰 "샘플 데이터 채우기" 버튼 (이미 있을 수 있음 — 확인 후)
```

### S4. 에러 상태

```
CSV 형식 오류:
- 화면 상단에 배너: bg --risk-bad-bg, border-left 3px --risk-bad-text
- "CSV 형식을 확인해주세요. [구체적 오류 내용]"
- 기존 데이터는 유지 (덮어쓰지 않음)

필수 입력 누락:
- 해당 입력 아래에 text --risk-bad-text 13px: "이 항목을 입력해야 점검이 정확합니다."
- 입력 필드 border-color → --risk-bad-text
```

### S5. 반응형 구체화

```
Desktop (1024px+): 현재 설계 그대로. max-width 720px 중앙 정렬.
Tablet (768~1023px): 대시보드 카드 2열 → 1열. 카드 padding 20px.
Mobile (480~767px): 전체 1열. 폰트 한 단계 축소. padding 16px.
Small Mobile (~479px): 375px 기준. 제목 24px. TOP3 카드 축약(즉시조치 숨김, 문제만).

공통: 터치 타겟 44px 이상. 카드 간 간격 16px.
```

### S6. 키보드 접근성 (품질 바닥선)

```
- 모든 interactive 요소: focus-visible outline 2px --accent-text
- Tab 순서: 제목 → 대시보드 카드 → TOP3 → 수급자 탭 → 입력 필드 → CTA
- 체크박스: Space로 토글
- 탭: ← → 화살표로 수급자 전환
- 가격 섹션 "사전신청" 버튼에 aria-label="월 99,000원 사전신청"
- @media (prefers-reduced-motion: reduce) { 모든 transition: none }
```

### S7. PDF 디자인 갱신 (Step 2 이후 반영)

```
대시보드가 "청구/평가/현지조사"로 바뀌면 print CSS도 동기화:
- PDF 1페이지: 제목 + 세 카테고리별 건수 + TOP3 + 안전문구
- 카테고리 컬러 바를 PDF에서도 유지 (시그니처 일관성)
- @media print에서 새 대시보드 카드가 깨지지 않게 page-break 확인
→ Step 2 커밋 후 바로 PDF 인쇄 확인을 체크리스트에 추가
```

### S8. 폰트 로딩

```html
<!-- index.html <head>에 추가 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">

<!-- Pretendard는 CDN -->
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">

/* fallback */
--font-display: 'Noto Serif KR', 'Batang', serif;
--font-body: 'Pretendard Variable', 'Pretendard', -apple-system, 'Malgun Gothic', sans-serif;
```

### S9. 카드 ↔ 탭 인터랙션

```
대시보드 카테고리 카드는 "클릭 가능"이 아니라 "정보 표시"로.
이유: 50~60대 센터장에게 "카드를 클릭하면 필터됩니다"는 직관적이지 않음.
카드는 순수 요약. 상세는 아래 수급자 탭에서.
→ 카드에 cursor: default (pointer 아님). hover에도 "클릭 가능" 신호 주지 않음.
→ 카드의 "대표 항목 1줄"이 어느 수급자인지 이름을 포함해 자연스럽게 연결.
```

### S10. 새 규칙 추가 시 카피 가이드

```
향후 규칙(Y18, 그룹 C·D 등) 추가 시 문구 작성 원칙:
1. 주어는 항상 "기록" 또는 "항목" — "당신이" 아닌 "기록이"
2. 동사는 "확인이 필요합니다" / "맞는지 확인하세요" — 명령이 아닌 제안
3. 구체적 대상 포함: "급여제공계획서의 설명일·대상자·확인서명"
4. "왜" 한 줄: "청구 전 시간을 대조하지 않으면 환수 대상이 될 수 있습니다" (X)
              → "청구 전 시간을 대조하면 추가 확인이 줄어듭니다" (O)
5. 단정 금지: "감점됩니다" → "평가 전 확인이 필요합니다"
6. 카테고리 명시: 이 규칙이 "청구 전/평가 전/현지조사 대비" 중 어디인지 RULE_CATEGORY에 등록
```
