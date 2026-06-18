import { useState, useRef } from 'react'
import { judgeRecipient, getGradeColor } from './rules'
import { getSampleData } from './sampleData'
import { recipientsToCSV, csvToRecipients, EXAMPLE_ROW } from './csv'
import './App.css'

// 표시 레이어 전용: 내부 코드(id)를 사용자에게 보일 사람 말 제목으로 매핑.
// rules.js(판정·점수)는 건드리지 않고, 화면 표시만 바꾼다.
const RULE_LABELS = {
  R01: '기록지 총시간과 세부 활동시간이 맞지 않습니다.',
  R02: '태그/기록 시간과 청구 예정 시간이 일치하는지 확인이 필요합니다.',
  R03: '청구일수와 실제 근무 가능일수가 맞는지 확인이 필요합니다.',
  R04: '보험 공백기간에 청구가 포함되었는지 확인이 필요합니다.',
  R07: '요양보호사 자격 및 인력신고 상태 확인이 필요합니다.',
  Y01: '평가연도 내 욕구사정 기록 및 계획 반영 여부 확인이 필요합니다.',
  Y02: '급여제공계획서 설명 및 확인서명 여부 확인이 필요합니다.',
  Y03: '급여제공기록지 서명 누락 여부 확인이 필요합니다.',
  Y04: '인지활동형 수급자 여부와 제공기록 연결 확인이 필요합니다.',
  Y05: '상태변화 기록이 방문상담 또는 계획 변경으로 이어졌는지 확인이 필요합니다.',
  Y06: '월 1회 방문상담 및 상담결과 반영 여부 확인이 필요합니다. (15명 이상 가산 기관)',
  Y09: '반기별 위험도평가 기록 여부 확인이 필요합니다.',
  Y11: '급여제공결과평가 및 계획 재작성 여부 확인이 필요합니다.',
  Y18: '급여 변경(시간·제공자·횟수) 후 급여제공계획서가 갱신되었는지 확인이 필요합니다',
}

function ruleLabel(id) {
  return RULE_LABELS[id] || id
}

// 표시용 등급 라벨 (Section D: 이모지 금지 — rules.js의 getGradeLabel 대체).
// 색은 getGradeColor가 담당, 여기선 텍스트만.
function gradeText(grade) {
  if (grade === 'good') return '양호'
  if (grade === 'caution') return '주의'
  return '위험'
}

// 표시 레이어 전용: 각 규칙을 센터장의 업무 흐름(청구/평가/현지조사)으로 분류.
// rules.js(판정·점수)는 그대로. 화면에서 결과를 그룹핑만 한다.
const RULE_CATEGORY = {
  R01: 'billing', R02: 'billing', R03: 'billing', R04: 'billing',
  Y01: 'eval', Y02: 'eval', Y04: 'eval', Y05: 'eval', Y06: 'eval', Y09: 'eval', Y11: 'eval', Y18: 'eval',
  Y03: 'inspect', R07: 'inspect',
}
const CATEGORIES = [
  { key: 'billing', title: '청구 전 확인', cls: 'dash-billing' },
  { key: 'eval', title: '평가 전 확인', cls: 'dash-eval' },
  { key: 'inspect', title: '현지조사 대비', cls: 'dash-inspect' },
]

// 위반 항목을 데이터가 채워진 사람 말 문장으로 (표시용)
function humanMessage(v, d) {
  switch (v.id) {
    case 'R01': {
      const sum = (d.physicalMin || 0) + (d.cognitiveMin || 0) + (d.cognitiveManageMin || 0) + (d.emotionalMin || 0) + (d.houseworkMin || 0)
      return `기록지 총시간(${d.totalMin}분)과 세부 활동시간 합계(${sum}분)가 다릅니다. 평가 전 확인이 필요합니다.`
    }
    case 'R02':
      return `RFID 태그시간(${d.rfidStart || '-'}~${d.rfidEnd || '-'})과 청구시간(${d.billingStart || '-'}~${d.billingEnd || '-'})이 다릅니다. 분 단위 완전일치가 필수는 아니므로 추가 확인이 필요합니다.`
    case 'R03':
      return `청구일수(${d.billedDays}일)가 근무 가능일수(${d.workDays}일)보다 많습니다. 청구 전 확인이 필요합니다.`
    case 'R04':
      return '배상책임보험 공백기간에 청구가 포함되었는지 확인이 필요합니다.'
    case 'R07':
      return '요양보호사 자격증·지자체 신고 상태 확인이 필요합니다.'
    case 'Y01':
      return '해당 평가연도(1.1~12.31) 내 욕구사정 기록 및 계획 반영 여부 확인이 필요합니다.'
    case 'Y02':
      return '급여제공계획서 설명 및 수급자·보호자 확인서명 여부 확인이 필요합니다.'
    case 'Y03':
      return `급여제공기록지 서명 누락 회차(${d.missingSignatures}회)가 있고 생략 사유도 기재되지 않았습니다.`
    case 'Y04':
      return '인지활동형인데 특이사항란에 프로그램 운영내용이 기재되지 않았습니다.'
    case 'Y05':
      return '상태 악화가 표시됐으나 후속 조치 기록이 없습니다.'
    case 'Y06':
      return '수급자 15인 이상 기관에서 이 수급자에 대한 월 1회 방문상담 기록이 없습니다.'
    case 'Y09':
      return '낙상·욕창·인지 위험도평가를 반기 1회 실시하지 않았습니다.'
    case 'Y11':
      return '급여제공결과평가를 연 1회 이상 실시하지 않았습니다.'
    case 'Y18':
      return '급여 변경이 발생했으나 급여제공계획서가 갱신되지 않았습니다. 지표 18·18-2 연쇄 감점 가능성이 있으므로 계획서 재작성 및 공단 통보를 확인하세요.'
    default:
      return v.desc
  }
}

function emptyRecipient() {
  return {
    name: '',
    totalMin: 0,
    physicalMin: 0, cognitiveMin: 0, cognitiveManageMin: 0,
    emotionalMin: 0, houseworkMin: 0,
    rfidStart: '', billingStart: '', rfidEnd: '', billingEnd: '',
    billedDays: 0, workDays: 0,
    insuranceGap: false,
    hasLicense: true, isRegistered: true,
    lastAssessmentDate: '',
    assessmentDoneThisYear: true,
    planSigned: true,
    planSignExempted: false,
    missingSignatures: 0, signatureReasonWritten: true,
    isCognitive: false, cognitiveNoteWritten: true,
    hasDeteriorated: false, actionAfterDeterioration: true,
    totalRecipients: 0, socialWorkerVisited: true,
    riskAssessmentDone: true, outcomeEvalDone: true,
    planRewrite30d: true,
    benefitChanged: false, planRewrittenAfterChange: false,
  }
}

function NumInput({ label, value, onChange, suffix }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input-wrap">
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
    </label>
  )
}

function TimeInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="time" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function CheckInput({ label, checked, onChange }) {
  return (
    <label className="field check-field">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="field-label">{label}</span>
    </label>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function RecipientCard({ data, index, onUpdate, onRemove }) {
  const result = judgeRecipient(data)

  // 표시용 합계(판정 로직과 무관 — 화면 안내만)
  const detailSum = (data.physicalMin || 0) + (data.cognitiveMin || 0) +
    (data.cognitiveManageMin || 0) + (data.emotionalMin || 0) + (data.houseworkMin || 0)
  const totalMatch = data.totalMin === detailSum

  function set(key, val) {
    onUpdate(index, { ...data, [key]: val })
  }

  return (
    <div className="card">
      <div className="card-header">
        <input
          className="name-input"
          placeholder={`수급자 ${index + 1} 이름`}
          value={data.name}
          onChange={e => set('name', e.target.value)}
        />
        <button className="btn-remove" onClick={() => onRemove(index)} title="삭제">✕</button>
      </div>

      {/* 이 수급자의 종합 상태 — 카드에서 가장 눈에 띄는 표시 */}
      <div
        className="status-banner"
        style={{ background: getGradeColor(result.grade) }}
      >
        <span className="status-label">{gradeText(result.grade)}</span>
        <span className="status-score">· {result.score}점</span>
      </div>

      <div className="card-body">
        <div className="section">
          <h3 className="section-title">숫자 비교 항목</h3>

          <div className="subsection">
            <h4>기록지 총시간과 세부 활동시간 일치 <span className="rule-code">(분 단위)</span></h4>
            <div className="r01-total">
              <NumInput label="기록지 총시간" value={data.totalMin} onChange={v => set('totalMin', v)} suffix="분" />
            </div>
            <div className="r01-divider" />
            <div className="r01-details field-grid">
              <NumInput label="신체활동" value={data.physicalMin} onChange={v => set('physicalMin', v)} suffix="분" />
              <NumInput label="인지활동" value={data.cognitiveMin} onChange={v => set('cognitiveMin', v)} suffix="분" />
              <NumInput label="인지관리" value={data.cognitiveManageMin} onChange={v => set('cognitiveManageMin', v)} suffix="분" />
              <NumInput label="정서지원" value={data.emotionalMin} onChange={v => set('emotionalMin', v)} suffix="분" />
              <NumInput label="가사지원" value={data.houseworkMin} onChange={v => set('houseworkMin', v)} suffix="분" />
            </div>
            <p className={`calc-hint ${totalMatch ? 'match' : 'mismatch'}`}>
              항목 합계: {detailSum}분
              {totalMatch ? ' ✓ 일치' : ' ✗ 총시간과 불일치'}
            </p>
          </div>

          <div className="subsection">
            <h4>RFID 태그시간과 청구시간 일치</h4>
            <div className="rfid-compare">
              {/* 열 헤더 (데스크톱) */}
              <div className="rfid-colheads">
                <span className="rfid-corner" />
                <span>RFID</span>
                <span>청구</span>
                <span className="rfid-match-head">일치</span>
              </div>

              {/* 시작 행: RFID 시작 ↔ 청구 시작 나란히 */}
              <div className="rfid-row">
                <span className="rfid-rowhead">시작</span>
                <label className="rfid-cell">
                  <span className="rfid-celllabel">RFID</span>
                  <input type="time" value={data.rfidStart} onChange={e => set('rfidStart', e.target.value)} />
                </label>
                <label className="rfid-cell">
                  <span className="rfid-celllabel">청구</span>
                  <input type="time" value={data.billingStart} onChange={e => set('billingStart', e.target.value)} />
                </label>
                <span className={`rfid-match ${data.rfidStart === data.billingStart ? 'ok' : 'bad'}`}>
                  {data.rfidStart === data.billingStart ? '✓' : '✗'}
                </span>
              </div>

              {/* 종료 행: RFID 종료 ↔ 청구 종료 나란히 */}
              <div className="rfid-row">
                <span className="rfid-rowhead">종료</span>
                <label className="rfid-cell">
                  <span className="rfid-celllabel">RFID</span>
                  <input type="time" value={data.rfidEnd} onChange={e => set('rfidEnd', e.target.value)} />
                </label>
                <label className="rfid-cell">
                  <span className="rfid-celllabel">청구</span>
                  <input type="time" value={data.billingEnd} onChange={e => set('billingEnd', e.target.value)} />
                </label>
                <span className={`rfid-match ${data.rfidEnd === data.billingEnd ? 'ok' : 'bad'}`}>
                  {data.rfidEnd === data.billingEnd ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>

          <div className="subsection">
            <h4>청구일수와 근무 가능일수</h4>
            <div className="field-grid">
              <NumInput label="청구 일수" value={data.billedDays} onChange={v => set('billedDays', v)} suffix="일" />
              <NumInput label="근무 가능일수" value={data.workDays} onChange={v => set('workDays', v)} suffix="일" />
            </div>
          </div>

          <div className="subsection">
            <h4>배상책임보험 공백기간 청구</h4>
            <CheckInput label="배상책임보험 공백기간에 청구함" checked={data.insuranceGap} onChange={v => set('insuranceGap', v)} />
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">체크 항목</h3>

          <div className="subsection">
            <h4>요양보호사 자격·신고</h4>
            <CheckInput label="요양보호사 자격증 있음" checked={data.hasLicense} onChange={v => set('hasLicense', v)} />
            <CheckInput label="지자체 신고 완료" checked={data.isRegistered} onChange={v => set('isRegistered', v)} />
          </div>

          <div className="subsection">
            <h4>욕구사정 최신성 <span className="rule-code">(회계연도 기준 연 1회)</span></h4>
            <div className="y01-record">
              <DateInput label="최근 욕구사정일" value={data.lastAssessmentDate} onChange={v => set('lastAssessmentDate', v)} />
              <span className="record-note">(기록용)</span>
            </div>
            <CheckInput label="해당 회계연도 내 욕구사정 실시함" checked={data.assessmentDoneThisYear} onChange={v => set('assessmentDoneThisYear', v)} />
          </div>

          <div className="subsection">
            <h4>급여제공계획서 서명</h4>
            <CheckInput label="급여제공계획서 서명 있음" checked={data.planSigned} onChange={v => set('planSigned', v)} />
            {!data.planSigned && (
              <CheckInput label="서명 예외: 우편발송+유선안내 근거 있음 또는 전자서명" checked={data.planSignExempted} onChange={v => set('planSignExempted', v)} />
            )}
          </div>

          <div className="subsection">
            <h4>급여제공기록지 서명</h4>
            <NumInput label="서명 누락 회차" value={data.missingSignatures} onChange={v => set('missingSignatures', v)} suffix="회" />
            {data.missingSignatures > 0 && (
              <CheckInput label="서명 불가 사유를 비고란에 기재함 (예외 인정)" checked={data.signatureReasonWritten} onChange={v => set('signatureReasonWritten', v)} />
            )}
          </div>

          <div className="subsection">
            <h4>인지활동형 기록</h4>
            <CheckInput label="인지활동형 수급자임" checked={data.isCognitive} onChange={v => set('isCognitive', v)} />
            {data.isCognitive && (
              <CheckInput label="특이사항란에 프로그램 내용 기재함" checked={data.cognitiveNoteWritten} onChange={v => set('cognitiveNoteWritten', v)} />
            )}
          </div>

          <div className="subsection">
            <h4>상태 악화 후 조치</h4>
            <CheckInput label="상태 악화(③) 체크됨" checked={data.hasDeteriorated} onChange={v => set('hasDeteriorated', v)} />
            {data.hasDeteriorated && (
              <CheckInput label="악화 후 조치내용 기록함" checked={data.actionAfterDeterioration} onChange={v => set('actionAfterDeterioration', v)} />
            )}
          </div>

          <div className="subsection">
            <h4>사회복지사 방문상담 <span className="rule-code">(15명 이상 가산 기관)</span></h4>
            <NumInput label="기관 전체 수급자 수" value={data.totalRecipients} onChange={v => set('totalRecipients', v)} suffix="명" />
            {data.totalRecipients >= 15 ? (
              <CheckInput label="이 수급자에게 월 1회 방문상담 수행함" checked={data.socialWorkerVisited} onChange={v => set('socialWorkerVisited', v)} />
            ) : (
              <p className="na-note">수급자 15명 미만 — 사회복지사 배치 가산 대상이 아니므로 이 항목은 해당 없음입니다.</p>
            )}
          </div>

          <div className="subsection">
            <h4>위험도평가 <span className="rule-code">(낙상·욕창·인지)</span></h4>
            <CheckInput label="낙상·욕창·인지 위험도평가 반기 실시함" checked={data.riskAssessmentDone} onChange={v => set('riskAssessmentDone', v)} />
          </div>

          <div className="subsection">
            <h4>급여제공결과평가 <span className="rule-code">(연 1회 이상 + 30일 내 계획 재작성)</span></h4>
            <CheckInput label="급여제공결과평가 연 1회 실시함" checked={data.outcomeEvalDone} onChange={v => set('outcomeEvalDone', v)} />
            <CheckInput label="결과 반영해 30일 내 계획 재작성함" checked={data.planRewrite30d} onChange={v => set('planRewrite30d', v)} />
          </div>

          <div className="subsection">
            <h4>급여 변경 후 계획서 갱신</h4>
            <CheckInput label="최근 급여 변경 발생 (시간·제공자·횟수 중 하나라도)" checked={!!data.benefitChanged} onChange={v => set('benefitChanged', v)} />
            {data.benefitChanged && (
              <CheckInput label="변경 후 급여제공계획서 재작성함" checked={!!data.planRewrittenAfterChange} onChange={v => set('planRewrittenAfterChange', v)} />
            )}
          </div>
        </div>
      </div>

      <div className="card-result" style={{ borderColor: getGradeColor(result.grade) }}>
        <div className="result-header">
          <span className="result-summary-label">이 수급자 종합:</span>
          <span className="result-grade" style={{ color: getGradeColor(result.grade) }}>
            {gradeText(result.grade)} · {result.score}점
          </span>
        </div>

        {result.violations.length > 0 ? (
          <table className="violation-table">
            <thead>
              <tr>
                <th>점검 항목</th>
                <th>내용</th>
                <th>시정조치</th>
                <th>근거</th>
              </tr>
            </thead>
            <tbody>
              {result.violations.map(v => (
                <tr key={v.id} className={v.level === 'critical' ? 'row-critical' : 'row-warning'}>
                  <td className="rule-cell">
                    <span className={`badge badge-${v.level}`}>{v.level === 'critical' ? '위험' : '주의'}</span>
                    <span className="rule-name">{ruleLabel(v.id)}</span>
                    <span className="rule-code">{v.id}</span>
                  </td>
                  <td>{humanMessage(v, data)}</td>
                  <td>{v.action}</td>
                  <td className="source-cell">{v.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-violation">발견된 문제가 없습니다.</p>
        )}
      </div>
    </div>
  )
}

// 사전신청 제출처. ⚠️ 실제 Formspree 폼 ID로 교체해야 전송이 동작합니다.
// (자리표시자 상태에서는 네트워크 전송 없이 완료 화면만 표시)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'

function App() {
  // 앱을 켜자마자 샘플 5명이 자동으로 보이게 한다.
  const [recipients, setRecipients] = useState(() => getSampleData())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [uploadMsg, setUploadMsg] = useState(null) // 업로드 안내 배너
  const fileInputRef = useRef(null)
  // 보고서 상단에 들어갈 메타 정보 (비워도 됨)
  const [reportMeta, setReportMeta] = useState({ org: '', month: '', auditor: '' })
  // 사전신청(페이크도어) 폼 상태
  const [preReg, setPreReg] = useState({ contact: '', center: '', consent: false })
  const [preRegDone, setPreRegDone] = useState(false)

  async function submitPreReg(e) {
    e.preventDefault()
    if (!preReg.contact.trim() || !preReg.consent) return
    const params = new URLSearchParams(window.location.search)
    const payload = {
      contact: preReg.contact,
      center: preReg.center,
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    }
    // 실제 폼 ID가 설정된 경우에만 전송 시도
    if (!FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        /* 네트워크 실패해도 사용자에겐 완료 안내 (지불의향 검증용) */
      }
    }
    setPreRegDone(true)
  }

  function updateRecipient(idx, data) {
    setRecipients(prev => prev.map((r, i) => i === idx ? data : r))
  }

  function removeRecipient(idx) {
    setRecipients(prev => {
      const next = prev.filter((_, i) => i !== idx)
      // 삭제 후 선택 인덱스가 범위를 벗어나지 않게 옆 수급자로 이동
      setSelectedIndex(sel => {
        let s = idx < sel ? sel - 1 : sel
        if (s > next.length - 1) s = next.length - 1
        return Math.max(0, s)
      })
      return next
    })
  }

  function addRecipient() {
    setRecipients(prev => {
      setSelectedIndex(prev.length) // 새로 추가된 수급자를 선택
      return [...prev, emptyRecipient()]
    })
  }

  function loadSample() {
    setRecipients(getSampleData())
    setSelectedIndex(0)
    setUploadMsg(null)
  }

  function clearAll() {
    setRecipients([])
    setSelectedIndex(0)
    setUploadMsg(null)
  }

  // 📥 샘플 CSV 다운로드 — 현재 수급자들을 내보냄(비어 있으면 예시 1줄 양식)
  function downloadSampleCSV() {
    const rows = recipients.length > 0 ? recipients : [EXAMPLE_ROW]
    const csv = recipientsToCSV(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '방문요양_감사_샘플양식.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 📤 CSV 업로드 — 파일 선택 후 카드로 자동 입력 + 즉시 판정
  function onFilePicked(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const { recipients: loaded, errors } = csvToRecipients(String(reader.result))
      if (loaded.length > 0) {
        setRecipients(loaded)
        setSelectedIndex(0)
      }
      if (errors.length > 0) {
        setUploadMsg({ type: 'warn', text: `${loaded.length}명을 불러왔습니다. 다만 ` + errors.join(' ') })
      } else {
        setUploadMsg({ type: 'ok', text: `${loaded.length}명을 정상적으로 불러왔습니다.` })
      }
    }
    reader.onerror = () => setUploadMsg({ type: 'warn', text: '파일을 읽지 못했습니다.' })
    reader.readAsText(file, 'utf-8')
    e.target.value = '' // 같은 파일 다시 선택 가능하게 초기화
  }

  const results = recipients.map(r => judgeRecipient(r))
  const totalScore = results.reduce((s, r) => s + r.score, 0)
  const criticalCount = results.reduce((s, r) => s + r.violations.filter(v => v.level === 'critical').length, 0)
  const warningCount = results.reduce((s, r) => s + r.violations.filter(v => v.level === 'warning').length, 0)

  let overallGrade
  if (totalScore === 0) overallGrade = 'good'
  else if (totalScore < 10) overallGrade = 'caution'
  else overallGrade = 'danger'

  // 카테고리별 그룹핑(새 계산 아님 — 기존 판정 결과를 분류만)
  function categoryStat(catKey) {
    let critical = 0, warning = 0, rep = null
    recipients.forEach((r, i) => {
      results[i].violations.forEach(v => {
        if (RULE_CATEGORY[v.id] !== catKey) return
        if (v.level === 'critical') critical++
        else warning++
        // 대표 항목: 위험 우선
        if (!rep || (v.level === 'critical' && rep.level !== 'critical')) {
          rep = { name: r.name || `수급자 ${i + 1}`, label: ruleLabel(v.id), level: v.level }
        }
      })
    })
    return { critical, warning, rep }
  }

  // 먼저 확인할 TOP3 (위험 우선 정렬 → 상위 3)
  const allViolations = []
  recipients.forEach((r, i) => {
    results[i].violations.forEach(v => {
      allViolations.push({ name: r.name || `수급자 ${i + 1}`, data: r, v })
    })
  })
  allViolations.sort((a, b) =>
    (b.v.level === 'critical' ? 1 : 0) - (a.v.level === 'critical' ? 1 : 0))
  const top3 = allViolations.slice(0, 3)

  return (
    <div className="app">
      <h1>1인 방문요양센터장을 위한 월말 리스크 점검표</h1>
      <p className="app-subtitle">혼자 운영해도, 평가 전에 놓치면 안 되는 기록 흐름을 먼저 보여드립니다.</p>

      <div className="intro-banner">
        이 앱은 기록을 대신 작성하지 않습니다.
        이미 작성된 기록들이 청구 전·평가 전·현지조사 전에 서로 맞는지 점검합니다.
      </div>

      <div className="dashboard">
        {CATEGORIES.map(cat => {
          const s = categoryStat(cat.key)
          const clean = s.critical === 0 && s.warning === 0
          return (
            <div className={`dash-card ${cat.cls}`} key={cat.key}>
              <span className="dash-bar" />
              <h2 className="dash-title">{cat.title}</h2>
              <div className="dash-counts">
                <span className="dash-count dash-count-bad">위험 {s.critical}</span>
                <span className="dash-dot">·</span>
                <span className="dash-count dash-count-warn">주의 {s.warning}</span>
              </div>
              <p className="dash-rep">
                {clean ? '확인할 항목이 없습니다.' : `${s.rep.name} — ${s.rep.label}`}
              </p>
            </div>
          )
        })}
      </div>

      <div className="dash-total" style={{ borderColor: getGradeColor(overallGrade) }}>
        점검 수급자 <b>{recipients.length}명</b>
        <span className="dash-total-sep">/</span>
        총 위험 <b>{criticalCount}건</b>
        <span className="dash-total-sep">/</span>
        주의 <b>{warningCount}건</b>
        <span className="dash-total-sep">/</span>
        자체점검 <b style={{ color: getGradeColor(overallGrade) }}>{totalScore}점 — {gradeText(overallGrade)}</b>
      </div>

      <div className="top3">
        <h2 className="top3-head">대표자가 이번 달 먼저 확인할 항목</h2>
        {top3.length === 0 ? (
          <p className="top3-empty">확인할 항목이 없습니다.</p>
        ) : (
          <ol className="top3-list">
            {top3.map((item, i) => (
              <li className="top3-item" key={i}>
                <span className="top3-title">{item.name} — {ruleLabel(item.v.id)}</span>
                <span className="top3-detail">{humanMessage(item.v, item.data)}</span>
                <span className="top3-action">→ {item.v.action}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="disclaimer">
        ※ 본 점검은 공단 평가 결과나 현지조사 결과를 보장하지 않습니다.
        위험 또는 주의 항목은 공식 판정이 아니라, 기관 내부에서 추가 확인이
        필요한 기록 흐름을 의미합니다.
      </p>

      {recipients.length > 0 && (
        <div className="tab-bar">
          {recipients.map((r, i) => {
            const res = results[i]
            const hasCritical = res.violations.some(v => v.level === 'critical')
            const hasWarning = res.violations.some(v => v.level === 'warning')
            const dotClass = hasCritical ? 'dot-critical' : hasWarning ? 'dot-warning' : ''
            return (
              <button
                key={i}
                className={`tab ${i === selectedIndex ? 'tab-active' : ''}`}
                onClick={() => setSelectedIndex(i)}
              >
                {dotClass && <span className={`tab-dot ${dotClass}`} />}
                {r.name || `수급자 ${i + 1}`}
              </button>
            )
          })}
        </div>
      )}

      <div className="toolbar">
        <button className="btn btn-primary" onClick={addRecipient}>수급자 추가</button>
        <button className="btn btn-sample" onClick={loadSample}>샘플 데이터 채우기</button>
        <button className="btn btn-sample" onClick={downloadSampleCSV}>샘플 CSV 다운로드</button>
        <button className="btn btn-sample" onClick={() => fileInputRef.current && fileInputRef.current.click()}>CSV 업로드</button>
        <button className="btn btn-clear" onClick={clearAll}>비우기</button>
        <button className="btn btn-print" onClick={() => window.print()}>PDF로 저장(인쇄)</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={onFilePicked}
        />
      </div>

      <div className="report-meta-inputs">
        <label className="meta-field">
          <span>기관명</span>
          <input value={reportMeta.org} onChange={e => setReportMeta(m => ({ ...m, org: e.target.value }))} placeholder="예) ○○방문요양센터" />
        </label>
        <label className="meta-field">
          <span>점검월</span>
          <input value={reportMeta.month} onChange={e => setReportMeta(m => ({ ...m, month: e.target.value }))} placeholder="예) 2026년 6월" />
        </label>
        <label className="meta-field">
          <span>점검자</span>
          <input value={reportMeta.auditor} onChange={e => setReportMeta(m => ({ ...m, auditor: e.target.value }))} placeholder="예) 홍길동" />
        </label>
        <span className="meta-hint">※ 입력하면 인쇄 보고서 상단에 표시됩니다(비워도 됨).</span>
      </div>

      {uploadMsg && (
        <div className={`banner banner-${uploadMsg.type}`}>
          {uploadMsg.text}
          <button className="banner-close" onClick={() => setUploadMsg(null)} title="닫기">✕</button>
        </div>
      )}

      {recipients.length > 0 && selectedIndex < recipients.length && (
        <RecipientCard
          key={selectedIndex}
          data={recipients[selectedIndex]}
          index={selectedIndex}
          onUpdate={updateRecipient}
          onRemove={removeRecipient}
        />
      )}

      {recipients.length === 0 && (
        <p className="empty-msg">수급자를 추가하거나 샘플 데이터를 불러오세요.</p>
      )}

      {/* 가격 + 사전신청 (페이크도어 — 지불 의향 검증용) */}
      <section className="pricing">
        <h2 className="pricing-head">월간 기록 흐름 점검 서비스</h2>
        <p className="pricing-sub">이 화면은 가상 샘플입니다. 우리 센터 기록을 매달 점검받으세요.</p>
        <p className="pricing-price">월 99,000원</p>
        <p className="pricing-includes">수급자 전원 · 월 1회 점검 리포트 · 평가 전 보완 가이드</p>

        {preRegDone ? (
          <p className="pricing-done">감사합니다! 정식 출시 시 가장 먼저 안내드리겠습니다.</p>
        ) : (
          <form className="prereg-form" onSubmit={submitPreReg}>
            <label className="prereg-field">
              <span>이메일 또는 카카오톡 ID</span>
              <input
                type="text"
                value={preReg.contact}
                onChange={e => setPreReg(p => ({ ...p, contact: e.target.value }))}
                placeholder="예) center@naver.com 또는 카톡ID"
                required
              />
            </label>
            <label className="prereg-field">
              <span>센터명 (선택)</span>
              <input
                type="text"
                value={preReg.center}
                onChange={e => setPreReg(p => ({ ...p, center: e.target.value }))}
                placeholder="예) ○○방문요양센터"
              />
            </label>
            <label className="prereg-consent">
              <input
                type="checkbox"
                checked={preReg.consent}
                onChange={e => setPreReg(p => ({ ...p, consent: e.target.checked }))}
              />
              <span>점검표 발송을 위해 입력 정보를 사용하는 것에 동의합니다.</span>
            </label>
            <button
              type="submit"
              className="prereg-btn"
              aria-label="월 99,000원 사전신청"
              disabled={!preReg.contact.trim() || !preReg.consent}
            >
              사전신청하기 · 월 99,000원
            </button>
          </form>
        )}
        <p className="pricing-note">현재 사전신청 중 · 정식 출시 시 가장 먼저 안내드립니다</p>
      </section>

      {/* 인쇄(PDF) 전용 보고서 — 화면에선 숨김, 인쇄할 때만 표시 */}
      <div className="print-report">
        <h2 className="pr-title">방문요양 월간 기록 리스크 감사 보고서</h2>

        <table className="pr-meta">
          <tbody>
            <tr>
              <th>기관명</th><td>{reportMeta.org || '—'}</td>
              <th>점검월</th><td>{reportMeta.month || '—'}</td>
              <th>점검자</th><td>{reportMeta.auditor || '—'}</td>
            </tr>
          </tbody>
        </table>

        <table className="pr-summary">
          <tbody>
            <tr>
              <th>점검 수급자</th><td>{recipients.length}명</td>
              <th>위험</th><td>{criticalCount}건</td>
              <th>주의</th><td>{warningCount}건</td>
              <th>총 리스크 점수</th><td>{totalScore}점 — {gradeText(overallGrade)}</td>
            </tr>
          </tbody>
        </table>

        <table className="pr-categories">
          <thead>
            <tr><th>업무 흐름</th><th>위험</th><th>주의</th><th>대표 항목</th></tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const s = categoryStat(cat.key)
              const clean = s.critical === 0 && s.warning === 0
              return (
                <tr key={cat.key}>
                  <td>{cat.title}</td>
                  <td>{s.critical}건</td>
                  <td>{s.warning}건</td>
                  <td>{clean ? '—' : `${s.rep.name} · ${s.rep.label}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {top3.length > 0 && (
          <div className="pr-top3">
            <p className="pr-top3-head">먼저 확인할 항목</p>
            <ol>
              {top3.map((item, i) => (
                <li key={i}>{item.name} — {ruleLabel(item.v.id)} → {item.v.action}</li>
              ))}
            </ol>
          </div>
        )}

        {recipients.map((r, i) => {
          const res = results[i]
          return (
            <div className="pr-recipient" key={i}>
              <div className="pr-recipient-head">
                <span className="pr-name">{i + 1}. {r.name || `수급자 ${i + 1}`}</span>
                <span className="pr-grade">{gradeText(res.grade)} · {res.score}점</span>
              </div>
              {res.violations.length > 0 ? (
                <table className="pr-violations">
                  <thead>
                    <tr><th>구분</th><th>점검 항목</th><th>내용</th><th>시정조치</th></tr>
                  </thead>
                  <tbody>
                    {res.violations.map(v => (
                      <tr key={v.id}>
                        <td>{v.level === 'critical' ? '위험' : '주의'}</td>
                        <td>{ruleLabel(v.id)}</td>
                        <td>{humanMessage(v, r)}</td>
                        <td>{v.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="pr-none">발견된 문제 없음</p>
              )}
            </div>
          )
        })}

        <p className="pr-footer">
          본 보고서는 자가점검 보조 도구의 결과이며, 부당청구 여부·임상 적정성의 최종 판단이 아닙니다.
          점수는 자체 지표이며 공단 공식 점수가 아닙니다. 최종 책임은 기관에 있습니다.
        </p>
      </div>
    </div>
  )
}

export default App
