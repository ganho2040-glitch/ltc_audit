import { useState, useRef } from 'react'
import { judgeRecipient, getGradeLabel, getGradeColor } from './rules'
import { getSampleData } from './sampleData'
import { recipientsToCSV, csvToRecipients, EXAMPLE_ROW } from './csv'
import './App.css'

// 표시 레이어 전용: 내부 코드(id)를 사용자에게 보일 사람 말 제목으로 매핑.
// rules.js(판정·점수)는 건드리지 않고, 화면 표시만 바꾼다.
const RULE_LABELS = {
  R01: '기록지 총시간과 세부 활동시간 일치',
  R02: 'RFID 태그시간과 청구시간 일치',
  R03: '청구일수와 근무 가능일수',
  R04: '배상책임보험 공백기간 청구',
  R07: '요양보호사 자격·신고',
  Y01: '욕구사정 최신성 (12개월)',
  Y02: '급여제공계획서 서명',
  Y03: '급여제공기록지 서명',
  Y04: '인지활동형 기록',
  Y05: '상태 악화 후 조치',
  Y06: '사회복지사 방문상담',
  Y09: '위험도평가 (낙상·욕창·인지)',
  Y11: '급여제공결과평가',
}

function ruleLabel(id) {
  return RULE_LABELS[id] || id
}

// 위반 항목을 데이터가 채워진 사람 말 문장으로 (표시용)
function humanMessage(v, d) {
  switch (v.id) {
    case 'R01': {
      const sum = (d.physicalMin || 0) + (d.cognitiveMin || 0) + (d.cognitiveManageMin || 0) + (d.emotionalMin || 0) + (d.houseworkMin || 0)
      return `기록지 총시간(${d.totalMin}분)과 세부 활동시간 합계(${sum}분)가 다릅니다. 평가 전 확인이 필요합니다.`
    }
    case 'R02':
      return `RFID 태그시간(${d.rfidStart || '-'}~${d.rfidEnd || '-'})과 청구시간(${d.billingStart || '-'}~${d.billingEnd || '-'})이 다릅니다.`
    case 'R03':
      return `청구일수(${d.billedDays}일)가 근무 가능일수(${d.workDays}일)보다 많습니다.`
    case 'R04':
      return '배상책임보험 공백기간에 청구한 내역이 있습니다. 공백기간 급여는 감액 대상입니다.'
    case 'R07':
      return '자격증 미보유 또는 지자체 미신고 인력이 급여를 제공했습니다.'
    case 'Y01':
      return '최근 욕구사정 후 12개월이 지났습니다(또는 기록 없음). 재사정이 필요합니다.'
    case 'Y02':
      return '급여제공계획서에 수급자·보호자 서명이 없습니다.'
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
    planSigned: true,
    missingSignatures: 0, signatureReasonWritten: true,
    isCognitive: false, cognitiveNoteWritten: true,
    hasDeteriorated: false, actionAfterDeterioration: true,
    totalRecipients: 0, socialWorkerVisited: true,
    riskAssessmentDone: true, outcomeEvalDone: true,
    planRewrite30d: true,
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
        <span className="status-label">{getGradeLabel(result.grade)}</span>
        <span className="status-score">· {result.score}점</span>
      </div>

      <div className="card-body">
        <div className="section">
          <h3 className="section-title">📊 숫자 비교 항목</h3>

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
              {totalMatch ? ' ✓ 일치' : ' ⚠️ 총시간과 불일치!'}
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
          <h3 className="section-title">☑️ 체크 항목</h3>

          <div className="subsection">
            <h4>요양보호사 자격·신고</h4>
            <CheckInput label="요양보호사 자격증 있음" checked={data.hasLicense} onChange={v => set('hasLicense', v)} />
            <CheckInput label="지자체 신고 완료" checked={data.isRegistered} onChange={v => set('isRegistered', v)} />
          </div>

          <div className="subsection">
            <h4>욕구사정 최신성 <span className="rule-code">(12개월)</span></h4>
            <DateInput label="최근 욕구사정일" value={data.lastAssessmentDate} onChange={v => set('lastAssessmentDate', v)} />
          </div>

          <div className="subsection">
            <h4>급여제공계획서 서명</h4>
            <CheckInput label="급여제공계획서 서명 있음" checked={data.planSigned} onChange={v => set('planSigned', v)} />
          </div>

          <div className="subsection">
            <h4>급여제공기록지 서명</h4>
            <NumInput label="서명 누락 회차" value={data.missingSignatures} onChange={v => set('missingSignatures', v)} suffix="회" />
            {data.missingSignatures > 0 && (
              <CheckInput label="서명 생략 사유 기재함" checked={data.signatureReasonWritten} onChange={v => set('signatureReasonWritten', v)} />
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
            <h4>사회복지사 방문상담</h4>
            <NumInput label="기관 전체 수급자 수" value={data.totalRecipients} onChange={v => set('totalRecipients', v)} suffix="명" />
            {data.totalRecipients >= 15 && (
              <CheckInput label="이 수급자에게 월 1회 방문상담 수행함" checked={data.socialWorkerVisited} onChange={v => set('socialWorkerVisited', v)} />
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
        </div>
      </div>

      <div className="card-result" style={{ borderColor: getGradeColor(result.grade) }}>
        <div className="result-header">
          <span className="result-summary-label">이 수급자 종합:</span>
          <span className="result-grade" style={{ color: getGradeColor(result.grade) }}>
            {getGradeLabel(result.grade)} · {result.score}점
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
                    <span className={`badge badge-${v.level}`}>{v.level === 'critical' ? '🔴 위험' : '🟡 주의'}</span>
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

function App() {
  // 앱을 켜자마자 샘플 5명이 자동으로 보이게 한다.
  const [recipients, setRecipients] = useState(() => getSampleData())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [uploadMsg, setUploadMsg] = useState(null) // 업로드 안내 배너
  const fileInputRef = useRef(null)
  // 보고서 상단에 들어갈 메타 정보 (비워도 됨)
  const [reportMeta, setReportMeta] = useState({ org: '', month: '', auditor: '' })

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

  return (
    <div className="app">
      <h1>방문요양 월간 기록 리스크 감사</h1>

      <div className="summary" style={{ borderColor: getGradeColor(overallGrade) }}>
        <div className="summary-item">
          <span className="summary-label">점검 수급자</span>
          <span className="summary-value">{recipients.length}명</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">🔴 위험</span>
          <span className="summary-value" style={{ color: criticalCount > 0 ? '#dc2626' : undefined }}>{criticalCount}건</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">🟡 주의</span>
          <span className="summary-value" style={{ color: warningCount > 0 ? '#ca8a04' : undefined }}>{warningCount}건</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">총 리스크 점수</span>
          <span className="summary-value" style={{ color: getGradeColor(overallGrade), fontWeight: 700 }}>
            {totalScore}점 — {getGradeLabel(overallGrade)}
          </span>
        </div>
      </div>

      <p className="disclaimer">
        ※ 점수는 환수·평가 위험도를 가늠하기 위한 자체 지표이며, 공단 공식 점수가 아닙니다.
        빨간(위험) 항목은 공식 부당청구 유형에 근거합니다.
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
        <button className="btn btn-primary" onClick={addRecipient}>＋ 수급자 추가</button>
        <button className="btn btn-sample" onClick={loadSample}>📋 샘플 데이터 채우기</button>
        <button className="btn btn-sample" onClick={downloadSampleCSV}>📥 샘플 CSV 다운로드</button>
        <button className="btn btn-sample" onClick={() => fileInputRef.current && fileInputRef.current.click()}>📤 CSV 업로드</button>
        <button className="btn btn-clear" onClick={clearAll}>🗑 비우기</button>
        <button className="btn btn-print" onClick={() => window.print()}>📄 PDF로 저장(인쇄)</button>
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
              <th>🔴 위험</th><td>{criticalCount}건</td>
              <th>🟡 주의</th><td>{warningCount}건</td>
              <th>총 리스크 점수</th><td>{totalScore}점 — {getGradeLabel(overallGrade)}</td>
            </tr>
          </tbody>
        </table>

        {recipients.map((r, i) => {
          const res = results[i]
          return (
            <div className="pr-recipient" key={i}>
              <div className="pr-recipient-head">
                <span className="pr-name">{i + 1}. {r.name || `수급자 ${i + 1}`}</span>
                <span className="pr-grade">{getGradeLabel(res.grade)} · {res.score}점</span>
              </div>
              {res.violations.length > 0 ? (
                <table className="pr-violations">
                  <thead>
                    <tr><th>구분</th><th>점검 항목</th><th>내용</th><th>시정조치</th></tr>
                  </thead>
                  <tbody>
                    {res.violations.map(v => (
                      <tr key={v.id}>
                        <td>{v.level === 'critical' ? '🔴 위험' : '🟡 주의'}</td>
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
