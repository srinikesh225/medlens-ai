import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  FlaskConical,
  Plus,
  Trash2,
  PencilLine,
} from 'lucide-react'
import { Modal } from './ui/misc'
import { useStore, useUpload, REVIEWER, PIPELINE, type UploadInput, type UploadResult } from '@/store/store'
import { SAMPLE_REPORTS, type SampleReport } from '@/demo/samples'
import { structureManualLabs, type ManualLabInput } from '@/domain/structure'
import type { ProcessingStage } from '@/domain/types'

type Mode = 'select' | 'processing' | 'done' | 'error' | 'manual'

/** Upload constraints — enforced before a file is ever read. */
export const ACCEPTED_EXTENSIONS = ['.txt', '.text', '.csv', '.md', '.markdown', '.json']
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // 2 MB

export function UploadModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean
  onClose: () => void
  prefill?: SampleReport
}) {
  const navigate = useNavigate()
  const { record, dispatch } = useStore()
  const runUpload = useUpload()

  const [mode, setMode] = useState<Mode>('select')
  const [activeStage, setActiveStage] = useState<ProcessingStage | null>(null)
  const [details, setDetails] = useState<Record<string, string>>({})
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string>('')
  const [failedReportId, setFailedReportId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string>('')
  const [custom, setCustom] = useState({ title: '', text: '' })

  // Reset the modal each time it opens; honor a prefill sample.
  useEffect(() => {
    if (open) {
      setMode('select')
      setResult(null)
      setError('')
      setFailedReportId(null)
      setFileError('')
      setActiveStage(null)
      setDetails({})
      if (prefill) void start(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const openConflicts = record.conflicts.filter((c) => c.status === 'OPEN').length

  async function start(input: UploadInput) {
    setMode('processing')
    setError('')
    setDetails({})
    try {
      const res = await runUpload(input, (e) => {
        setActiveStage(e.stage)
        setDetails((d) => ({ ...d, [e.stage]: e.detail }))
      })
      setResult(res)
      setMode('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed.')
      setFailedReportId((e as { reportId?: string })?.reportId ?? null)
      setMode('error')
    }
  }

  /** Real file ingestion with type + size validation. */
  function startFile(file: File) {
    setFileError('')
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError(
        `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      )
      return
    }
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
      setFileError(
        'PDF text extraction isn’t available in the offline demo. Upload a .txt export of the report, or paste its text.',
      )
      return
    }
    const isText = ACCEPTED_EXTENSIONS.some((e) => lower.endsWith(e)) || file.type.startsWith('text/')
    if (!isText) {
      setFileError(`Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}.`)
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setFileError('That file could not be read.')
    reader.onload = () => {
      const result = reader.result as string | null
      const text = String(result || '')
      if (!text.trim()) {
        setFileError('That file appears to be empty.')
        return
      }
      void start({
        title: file.name.replace(/\.[^.]+$/, ''),
        labName: 'Uploaded file',
        reportDate: new Date().toISOString().slice(0, 10),
        kind: 'LAB',
        text,
        filename: file.name,
        mimeType: file.type || 'text/plain',
      })
    }
    reader.readAsText(file)
  }

  function saveManual(rows: ManualLabInput[]) {
    const report = record.reports.find((r) => r.id === failedReportId)
    if (!report) return
    const labs = structureManualLabs(rows, report)
    if (labs.length === 0) return
    dispatch({ type: 'ADD_MANUAL_LABS', reportId: report.id, labs, actor: REVIEWER })
    onClose()
    navigate(`/reports/${report.id}`)
  }

  function startSample(s: SampleReport) {
    void start({
      title: s.title,
      labName: s.labName,
      reportDate: s.reportDate,
      kind: s.kind,
      text: s.text,
      filename: s.filename,
    })
  }

  function startCustom() {
    if (!custom.text.trim()) return
    void start({
      title: custom.title.trim() || 'Pasted report',
      labName: 'Manual upload',
      reportDate: new Date().toISOString().slice(0, 10),
      kind: 'LAB',
      text: custom.text,
      filename: 'pasted-report.txt',
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload medical report" wide={mode !== 'select'}>
      {mode === 'select' && (
        <SelectStep
          custom={custom}
          setCustom={setCustom}
          onSample={startSample}
          onCustom={startCustom}
          onFile={startFile}
          fileError={fileError}
        />
      )}
      {(mode === 'processing' || mode === 'done') && (
        <ProcessRevealStep
          activeStage={activeStage}
          details={details}
          done={mode === 'done'}
          result={result}
          openConflicts={openConflicts}
          onView={() => {
            if (result) {
              onClose()
              navigate(`/reports/${result.reportId}`)
            }
          }}
          onClose={onClose}
        />
      )}
      {mode === 'error' && (
        <div className="text-center py-6">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
          <p className="font-medium text-ink-800">We couldn’t extract this document</p>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{error}</p>
          <p className="text-sm text-ink-500 mt-2 max-w-sm mx-auto">
            The document has been kept. You can enter its values by hand, or try a different report.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {failedReportId && (
              <button className="btn-primary" onClick={() => setMode('manual')}>
                <PencilLine size={15} /> Enter values manually
              </button>
            )}
            <button className="btn-secondary" onClick={() => setMode('select')}>
              Try another report
            </button>
          </div>
        </div>
      )}
      {mode === 'manual' && <ManualEntryStep onSave={saveManual} onCancel={() => setMode('error')} />}
    </Modal>
  )
}

function ManualEntryStep({
  onSave,
  onCancel,
}: {
  onSave: (rows: ManualLabInput[]) => void
  onCancel: () => void
}) {
  const [rows, setRows] = useState<ManualLabInput[]>([
    { testName: '', valueRaw: '', unit: '', rangeRaw: '' },
  ])
  const update = (i: number, patch: Partial<ManualLabInput>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const valid = rows.some((r) => r.testName.trim() && r.valueRaw.trim())

  return (
    <div>
      <p className="text-sm text-ink-500 mb-4">
        Enter values from the document by hand. Reference-range status is computed only from the range
        you type — never a guessed one. Leave the range blank to keep a value un-range-checked.
      </p>
      <div className="space-y-2">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_1fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-400 px-1">
          <span>Test</span><span>Value</span><span>Unit</span><span>Reference range</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1.4fr_0.8fr_0.7fr_1fr_auto] gap-2">
            <input className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm" placeholder="Hemoglobin" value={r.testName} onChange={(e) => update(i, { testName: e.target.value })} />
            <input className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm" placeholder="13.2" value={r.valueRaw} onChange={(e) => update(i, { valueRaw: e.target.value })} />
            <input className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm" placeholder="g/dL" value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} />
            <input className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm" placeholder="12.0 - 16.0" value={r.rangeRaw} onChange={(e) => update(i, { rangeRaw: e.target.value })} />
            <button className="btn-ghost px-2 text-ink-400 hover:text-rose-600 disabled:opacity-40" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="Remove row">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn-ghost text-primary-700 mt-2 px-1 text-sm" onClick={() => setRows((rs) => [...rs, { testName: '', valueRaw: '', unit: '', rangeRaw: '' }])}>
        <Plus size={15} /> Add row
      </button>
      <div className="flex gap-2 mt-4 pt-4 border-t border-ink-100">
        <button className="btn-primary" onClick={() => onSave(rows)} disabled={!valid}>
          <CheckCircle2 size={15} /> Save values
        </button>
        <button className="btn-secondary" onClick={onCancel}>Back</button>
      </div>
    </div>
  )
}

function SelectStep({
  custom,
  setCustom,
  onSample,
  onCustom,
  onFile,
  fileError,
}: {
  custom: { title: string; text: string }
  setCustom: (c: { title: string; text: string }) => void
  onSample: (s: SampleReport) => void
  onCustom: () => void
  onFile: (f: File) => void
  fileError: string
}) {
  const [tab, setTab] = useState<'sample' | 'file' | 'paste'>('sample')
  return (
    <div>
      <p className="text-sm text-ink-500 mb-4">
        Choose a sample report to process live, or paste your own report text. Either way it runs
        through the real pipeline: extraction → validation → reference-range check → provenance →
        conflict scan. Nothing is pre-computed.
      </p>
      <div className="inline-flex rounded-lg bg-ink-100 p-0.5 mb-4 text-sm">
        <button className={`px-3 py-1.5 rounded-md font-medium ${tab === 'sample' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`} onClick={() => setTab('sample')}>
          Sample reports
        </button>
        <button className={`px-3 py-1.5 rounded-md font-medium ${tab === 'file' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`} onClick={() => setTab('file')}>
          Upload file
        </button>
        <button className={`px-3 py-1.5 rounded-md font-medium ${tab === 'paste' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`} onClick={() => setTab('paste')}>
          Paste text
        </button>
      </div>

      {tab === 'file' && (
        <div className="space-y-3">
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-ink-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors p-8 text-center">
            <input
              type="file"
              className="sr-only"
              accept={ACCEPTED_EXTENSIONS.join(',') + ',text/plain'}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
                e.target.value = '' // allow re-selecting the same file
              }}
            />
            <FileText className="mx-auto text-ink-300 mb-2" size={26} />
            <div className="text-sm font-medium text-ink-800">Choose a report file</div>
            <div className="text-xs text-ink-500 mt-1">
              {ACCEPTED_EXTENSIONS.join(', ')} · up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB
            </div>
          </label>
          {fileError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800" role="alert">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
          <p className="text-xs text-ink-400">
            Type and size are validated before the file is read. PDFs aren’t parsed in the offline
            demo — upload a text export or paste the text instead.
          </p>
        </div>
      )}

      {tab === 'sample' && (
        <div className="grid gap-3">
          {SAMPLE_REPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSample(s)}
              className="group text-left card p-4 hover:border-primary-300 hover:shadow-panel transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-lg bg-primary-50 text-primary-700 shrink-0">
                  <FlaskConical size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{s.title}</span>
                    <span className="text-[11px] text-ink-400">· {s.filename}</span>
                  </div>
                  <p className="text-[13px] text-ink-500 mt-1">{s.demoNote}</p>
                </div>
                <ArrowRight size={18} className="text-ink-300 group-hover:text-primary-600 shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'paste' && (
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            placeholder="Report title (optional)"
            value={custom.title}
            onChange={(e) => setCustom({ ...custom, title: e.target.value })}
          />
          <textarea
            className="w-full h-44 rounded-lg border border-ink-200 px-3 py-2 text-sm font-mono scroll-thin"
            placeholder={'Paste tabular lab text, e.g.\nHemoglobin      13.2   g/dL   12.0 - 16.0\nGlucose         96     mg/dL  70 - 99'}
            value={custom.text}
            onChange={(e) => setCustom({ ...custom, text: e.target.value })}
          />
          <button className="btn-primary w-full" onClick={onCustom} disabled={!custom.text.trim()}>
            <Sparkles size={16} /> Process report
          </button>
          <p className="text-xs text-ink-400">
            The deterministic extractor parses columnar “Test / Result / Unit / Reference” text. A
            live LLM extractor can be enabled for messy documents (see README).
          </p>
        </div>
      )}
    </div>
  )
}

function ProcessRevealStep({
  activeStage,
  details,
  done,
  result,
  openConflicts,
  onView,
  onClose,
}: {
  activeStage: ProcessingStage | null
  details: Record<string, string>
  done: boolean
  result: UploadResult | null
  openConflicts: number
  onView: () => void
  onClose: () => void
}) {
  const activeIndex = useMemo(() => PIPELINE.findIndex((p) => p.stage === activeStage), [activeStage])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pipeline */}
      <div>
        <h4 className="label mb-3">Processing pipeline</h4>
        <ol className="space-y-2.5">
          {PIPELINE.map((step, i) => {
            const state = done || i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo'
            const detail = details[step.stage]
            return (
              <li key={step.stage} className="flex items-start gap-3 text-sm">
                {state === 'done' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : state === 'active' ? (
                  <Loader2 size={18} className="text-primary-600 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <Circle size={18} className="text-ink-200 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className={state === 'todo' ? 'text-ink-400' : 'text-ink-800'}>{step.label}</div>
                  {/* Real per-stage result computed from the document/extraction */}
                  {detail && (state === 'done' || state === 'active') && (
                    <div className="text-[11px] text-ink-400 tabular-nums">{detail}</div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Reveal */}
      <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
        <h4 className="label mb-3">Evidence-to-record</h4>
        {!done && (
          <div className="space-y-2 animate-pulse-soft">
            <div className="h-3 w-3/4 rounded bg-ink-200" />
            <div className="h-3 w-2/3 rounded bg-ink-200" />
            <div className="h-3 w-4/5 rounded bg-ink-200" />
            <div className="h-3 w-1/2 rounded bg-ink-200" />
            <p className="text-xs text-ink-400 pt-2">MedLens is analyzing your report…</p>
          </div>
        )}
        {done && result && (
          <div className="space-y-2.5 text-sm animate-fade-up">
            <Reveal icon={<FileText size={15} />} text={`${result.labCount} clinical observation${result.labCount === 1 ? '' : 's'} extracted`} />
            <Reveal icon={<CheckCircle2 size={15} />} text={`${result.rangeCount} reference range${result.rangeCount === 1 ? '' : 's'} read from the source`} />
            {result.noRangeCount > 0 && (
              <Reveal icon={<AlertTriangle size={15} />} tone="warn" text={`${result.noRangeCount} value(s) left un-range-checked (no source range)`} />
            )}
            {result.medCount > 0 && (
              <Reveal icon={<FileText size={15} />} text={`${result.medCount} medication(s) identified`} />
            )}
            <Reveal icon={<ShieldCheck size={15} />} text="Every value linked to its exact source span" />
            <Reveal
              icon={<AlertTriangle size={15} />}
              tone={openConflicts ? 'warn' : 'good'}
              text={`${openConflicts} potential conflict(s) open across the record`}
            />
            {result.warnings.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
                {result.warnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-3">
              <button className="btn-primary flex-1" onClick={onView}>
                View structured record <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Reveal({ icon, text, tone = 'good' }: { icon: React.ReactNode; text: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={tone === 'warn' ? 'text-amber-600' : 'text-emerald-600'}>{icon}</span>
      <span className="text-ink-800">{text}</span>
    </div>
  )
}
