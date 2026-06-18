// 근거: docs/RULES.md v1.0 (2026-06-17)
// 🔴 위험 = 10점 / 🟡 주의 = 3점

const RULES = [
  // 근거: R01, 「고시」제19조(방문요양 급여비용 산정방법)
  {
    id: 'R01',
    name: '시간 부풀림',
    level: 'critical',
    points: 10,
    desc: '기록지 총시간 ≠ 항목별 시간 합계',
    action: '기록지 재작성, 초과청구분 자진환수, 요양보호사 재교육',
    source: '「고시」제19조, 부당청구 사례집 p.35',
    judge(d) {
      const sum = (d.physicalMin || 0) + (d.cognitiveMin || 0) +
        (d.cognitiveManageMin || 0) + (d.emotionalMin || 0) + (d.houseworkMin || 0)
      return d.totalMin !== sum
    },
  },
  // 근거: R02, 「고시」제15조·제16조, 거짓청구 유형 고시 제3조 제3호
  {
    id: 'R02',
    name: 'RFID 시간 불일치',
    level: 'critical',
    points: 10,
    desc: 'RFID 태그 시간 ≠ 청구 시간',
    action: 'RFID 기록 대조, 불일치 건 자진신고·환수',
    source: '「고시」제15·16조, 거짓청구 유형 고시 제3조',
    judge(d) {
      return d.rfidStart !== d.billingStart || d.rfidEnd !== d.billingEnd
    },
  },
  // 근거: R03, 「고시」제6조, 거짓청구 유형 고시 제3조 제1호
  {
    id: 'R03',
    name: '미제공일 청구',
    level: 'critical',
    points: 10,
    desc: '청구일수 > 요양보호사 근무 가능일수',
    action: '미제공일 청구분 자진환수, 근무일정-기록지 대조 체계 구축',
    source: '「고시」제6조, 거짓청구 유형 고시 제3조 제1호',
    judge(d) {
      return d.billedDays > d.workDays
    },
  },
  // 근거: R04, 「노인장기요양보험법」제35조의5, 「고시」제10조·제68조
  {
    id: 'R04',
    name: '보험 공백 청구',
    level: 'critical',
    points: 10,
    desc: '배상책임보험 미가입 기간에 청구',
    action: '즉시 보험 가입·갱신, 공백기간 10% 감액 재산정, 초과분 환수',
    source: '「법」제35조의5, 「고시」제10·68조',
    judge(d) {
      return d.insuranceGap === true
    },
  },
  // 근거: R07, 「노인복지법」제39조의2, 거짓청구 유형 고시 제3조 제5·6호
  {
    id: 'R07',
    name: '무자격·미신고 인력',
    level: 'critical',
    points: 10,
    desc: '자격증 미보유 또는 지자체 미신고 인력이 서비스 제공',
    action: '자격 확인, 미자격 기간 전액 환수, 인력관리 체계 점검',
    source: '「노인복지법」제39조의2, 거짓청구 유형 고시 제3조',
    judge(d) {
      return d.hasLicense === false || d.isRegistered === false
    },
  },
  // 근거: Y01, 「고시」제57조 제2항
  {
    id: 'Y01',
    name: '욕구사정 회계연도 기준 연 1회 미실시',
    level: 'warning',
    points: 3,
    desc: '해당 회계연도 내 욕구사정 미실시',
    action: '즉시 재사정 실시, 사정 주기 관리 체계 구축',
    source: '「고시」제57조 제2항',
    judge(d) {
      if (!d.lastAssessmentDate) return true
      const diff = new Date() - new Date(d.lastAssessmentDate)
      return diff > 365 * 24 * 60 * 60 * 1000
    },
  },
  // 근거: Y02, 「시행규칙」제18조
  {
    id: 'Y02',
    name: '계획서 서명 누락',
    level: 'warning',
    points: 3,
    desc: '급여제공계획서에 수급자/보호자 서명 없음',
    action: '서명 보완 수집, 향후 서명 절차 준수',
    source: '「시행규칙」제18조',
    judge(d) {
      return d.planSigned === false
    },
  },
  // 근거: Y03, 별지 제12호서식 유의사항
  {
    id: 'Y03',
    name: '기록지 서명 누락',
    level: 'warning',
    points: 3,
    desc: '기록지 서명 누락 + 생략 사유 미기재',
    action: '누락 회차 서명 보완, 생략 사유 기재 확인',
    source: '별지 제12호서식 유의사항',
    judge(d) {
      return d.missingSignatures > 0 && d.signatureReasonWritten === false
    },
  },
  // 근거: Y04, 별지 제12호서식 작성 유의사항, 「고시」제17조
  {
    id: 'Y04',
    name: '인지활동형 특이사항 미기재',
    level: 'warning',
    points: 3,
    desc: '인지활동형인데 프로그램 운영내용 미기재',
    action: '특이사항란에 프로그램명·활동내용·수급자 반응 상세 기재',
    source: '별지 제12호서식, 「고시」제17조',
    judge(d) {
      return d.isCognitive === true && d.cognitiveNoteWritten === false
    },
  },
  // 근거: Y05, 평가매뉴얼, 「고시」제6조
  {
    id: 'Y05',
    name: '악화 후 조치 누락',
    level: 'warning',
    points: 3,
    desc: '상태 악화 체크됐으나 후속 조치 기록 없음',
    action: '악화 시 즉각 조치(보호자 통보, 의료연계) 후 기록',
    source: '평가매뉴얼, 「고시」제6조',
    judge(d) {
      return d.hasDeteriorated === true && d.actionAfterDeterioration === false
    },
  },
  // 근거: Y06, 「고시」제57조·제58조
  {
    id: 'Y06',
    name: '사회복지사 방문상담 미수행',
    level: 'warning',
    points: 3,
    desc: '수급자 15인 이상 기관에서 월 1회 방문상담 미수행',
    action: '방문상담 일정 재수립, 미방문 수급자 즉시 방문',
    source: '「고시」제57·58조',
    judge(d) {
      return d.totalRecipients >= 15 && d.socialWorkerVisited === false
    },
  },
  // 근거: Y09, 평가매뉴얼 방문요양16
  {
    id: 'Y09',
    name: '위험도평가 반기 미실시',
    level: 'warning',
    points: 3,
    desc: '낙상·욕창·인지 위험도평가 반기 1회 미실시',
    action: '즉시 미실시 평가 수행, 반기별 일정표 수립',
    source: '평가매뉴얼 방문요양16',
    judge(d) {
      return d.riskAssessmentDone === false
    },
  },
  // 근거: Y11, 평가매뉴얼 방문요양24
  {
    id: 'Y11',
    name: '결과평가 연 1회 미실시',
    level: 'warning',
    points: 3,
    desc: '급여제공결과평가 연 1회 미실시',
    action: '즉시 결과평가 실시, 필요 시 급여제공계획 재수립',
    source: '평가매뉴얼 방문요양24',
    judge(d) {
      // 연 1회 결과평가 미실시 또는 결과 반영 30일 내 계획 재작성 미수행
      return d.outcomeEvalDone === false || d.planRewrite30d === false
    },
  },
]

export function judgeRecipient(data) {
  let score = 0
  const violations = []

  for (const rule of RULES) {
    try {
      if (rule.judge(data)) {
        score += rule.points
        violations.push({
          id: rule.id,
          name: rule.name,
          level: rule.level,
          points: rule.points,
          desc: rule.desc,
          action: rule.action,
          source: rule.source,
        })
      }
    } catch {
      // skip rules with missing input
    }
  }

  let grade
  if (score === 0) grade = 'good'
  else if (score < 10) grade = 'caution'
  else grade = 'danger'

  return { score, grade, violations }
}

export function getGradeLabel(grade) {
  if (grade === 'good') return '✅ 양호'
  if (grade === 'caution') return '🟡 주의'
  return '🔴 위험'
}

export function getGradeColor(grade) {
  if (grade === 'good') return '#16a34a'
  if (grade === 'caution') return '#ca8a04'
  return '#dc2626'
}
