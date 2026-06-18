// CSV 읽기/쓰기 로직을 전부 이 파일 한 곳에 모았습니다.
// 나중에 실제 기관(케어포 등) 내보내기 형식이 오면 이 파일만 고치면 됩니다.
// 판정 규칙(rules.js)·점수 계산과는 분리되어 있습니다.

// ── 칼럼 정의표: CSV 한글 제목 ↔ 앱 항목(key) ↔ 타입 ──
// type: 'text' | 'number' | 'time' | 'date' | 'bool'
export const COLUMNS = [
  { header: '수급자 이름', key: 'name', type: 'text' },
  { header: '기록지 총시간(분)', key: 'totalMin', type: 'number' },
  { header: '신체활동(분)', key: 'physicalMin', type: 'number' },
  { header: '인지활동(분)', key: 'cognitiveMin', type: 'number' },
  { header: '인지관리(분)', key: 'cognitiveManageMin', type: 'number' },
  { header: '정서지원(분)', key: 'emotionalMin', type: 'number' },
  { header: '가사지원(분)', key: 'houseworkMin', type: 'number' },
  { header: 'RFID 시작시각', key: 'rfidStart', type: 'time' },
  { header: '청구 시작시각', key: 'billingStart', type: 'time' },
  { header: 'RFID 종료시각', key: 'rfidEnd', type: 'time' },
  { header: '청구 종료시각', key: 'billingEnd', type: 'time' },
  { header: '청구일수', key: 'billedDays', type: 'number' },
  { header: '근무가능일수', key: 'workDays', type: 'number' },
  { header: '서명누락 회차', key: 'missingSignatures', type: 'number' },
  { header: '기관 전체 수급자수', key: 'totalRecipients', type: 'number' },
  { header: '최근 욕구사정일', key: 'lastAssessmentDate', type: 'date' },
  // 옛 CSV(이 칼럼 없음) 업로드 시 거짓양성 방지를 위해 기본값을 true로
  { header: '회계연도 내 욕구사정', key: 'assessmentDoneThisYear', type: 'bool', missingDefault: true },
  { header: '보험공백 있음', key: 'insuranceGap', type: 'bool' },
  { header: '자격증 있음', key: 'hasLicense', type: 'bool' },
  { header: '지자체신고 완료', key: 'isRegistered', type: 'bool' },
  { header: '계획서 서명 있음', key: 'planSigned', type: 'bool' },
  { header: '서명생략 사유기재', key: 'signatureReasonWritten', type: 'bool' },
  { header: '인지활동형 여부', key: 'isCognitive', type: 'bool' },
  { header: '인지 특이사항 기록', key: 'cognitiveNoteWritten', type: 'bool' },
  { header: '상태 악화 체크', key: 'hasDeteriorated', type: 'bool' },
  { header: '악화후 조치기록', key: 'actionAfterDeterioration', type: 'bool' },
  { header: '사회복지사 월방문', key: 'socialWorkerVisited', type: 'bool' },
  { header: '위험도평가 반기실시', key: 'riskAssessmentDone', type: 'bool' },
  { header: '결과평가 반기실시', key: 'outcomeEvalDone', type: 'bool' },
  // 옛 CSV(이 칼럼 없음) 업로드 시 거짓양성 방지를 위해 기본값을 true로
  { header: '계획 30일내 재작성', key: 'planRewrite30d', type: 'bool', missingDefault: true },
]

// 업로드 시 빈 칸이나 누락 칼럼에 쓸 기본값
function defaultValue(type) {
  if (type === 'number') return 0
  if (type === 'bool') return false
  return ''
}

// 한 칸(셀) 값을 CSV용 문자열로 변환
function cellToString(value, type) {
  if (type === 'bool') return value ? '예' : '아니오'
  if (value === null || value === undefined) return ''
  return String(value)
}

// CSV용 문자열을 앱 값으로 변환
function stringToCell(raw, type) {
  const s = (raw ?? '').trim()
  if (type === 'number') {
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }
  if (type === 'bool') {
    const yes = ['예', 'y', 'yes', 'true', '1', 'o', 'ㅇ']
    return yes.includes(s.toLowerCase())
  }
  return s // text / time / date 는 문자열 그대로
}

// ── 내보내기: 수급자 배열 → CSV 문자열 ──
export function recipientsToCSV(recipients) {
  const headerLine = COLUMNS.map(c => escapeField(c.header)).join(',')
  const rows = recipients.map(r =>
    COLUMNS.map(c => escapeField(cellToString(r[c.key], c.type))).join(',')
  )
  // ﻿ = UTF-8 BOM. 엑셀에서 한글이 깨지지 않게 함.
  return '﻿' + [headerLine, ...rows].join('\r\n')
}

// 다운로드용 예시 1줄 (사용자가 채우는 법을 알 수 있게)
export const EXAMPLE_ROW = {
  name: '예시) 김복지',
  totalMin: 180,
  physicalMin: 60, cognitiveMin: 40, cognitiveManageMin: 0,
  emotionalMin: 20, houseworkMin: 60,
  rfidStart: '09:00', billingStart: '09:00', rfidEnd: '12:00', billingEnd: '12:00',
  billedDays: 22, workDays: 22,
  missingSignatures: 0, totalRecipients: 20,
  lastAssessmentDate: '2025-03-10',
  assessmentDoneThisYear: true,
  insuranceGap: false, hasLicense: true, isRegistered: true,
  planSigned: true, signatureReasonWritten: true,
  isCognitive: false, cognitiveNoteWritten: true,
  hasDeteriorated: false, actionAfterDeterioration: true,
  socialWorkerVisited: true, riskAssessmentDone: true, outcomeEvalDone: true,
  planRewrite30d: true,
}

// ── 읽기: CSV 문자열 → { recipients, errors } ──
export function csvToRecipients(text) {
  const errors = []
  const recipients = []

  // BOM 제거
  const clean = text.replace(/^﻿/, '')
  const rows = parseCSV(clean)
  if (rows.length === 0) {
    errors.push('파일이 비어 있습니다.')
    return { recipients, errors }
  }

  // 첫 줄 = 제목. 제목으로 칼럼 위치 매칭 (순서 달라도 됨)
  const headers = rows[0].map(h => h.trim())
  const colIndex = {} // key -> CSV 칼럼 위치
  for (const col of COLUMNS) {
    const idx = headers.indexOf(col.header)
    if (idx !== -1) colIndex[col.key] = idx
  }

  if (colIndex.name === undefined) {
    errors.push('칼럼 제목 줄에서 "수급자 이름"을 찾지 못했습니다. 샘플 CSV 양식을 확인하세요.')
    return { recipients, errors }
  }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    // 완전히 빈 줄은 조용히 건너뜀
    if (cells.every(c => (c ?? '').trim() === '')) continue

    try {
      const rec = {}
      for (const col of COLUMNS) {
        const idx = colIndex[col.key]
        if (idx === undefined) {
          // 칼럼이 아예 없으면 칼럼별 기본값(missingDefault) 우선, 없으면 타입 기본값
          rec[col.key] = col.missingDefault ?? defaultValue(col.type)
        } else {
          rec[col.key] = stringToCell(cells[idx], col.type)
        }
      }
      if (!rec.name) rec.name = `수급자 ${recipients.length + 1}`
      recipients.push(rec)
    } catch {
      errors.push(`${i + 1}번째 줄에 문제가 있어 건너뛰었습니다.`)
    }
  }

  if (recipients.length === 0 && errors.length === 0) {
    errors.push('읽어들인 수급자가 없습니다. 데이터 줄이 있는지 확인하세요.')
  }

  return { recipients, errors }
}

// ── CSV 파서 (따옴표·쉼표·줄바꿈 처리) ──
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (ch === '\r') { /* skip */ }
      else field += ch
    }
  }
  // 마지막 필드/줄
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// 내보낼 때 따옴표 처리
function escapeField(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
