import { useMemo, useState } from 'react'
import {
  ShieldCheck,
  X,
  Pencil,
  StickyNote,
  AlertTriangle,
  HelpCircle,
  Check,
  Crosshair,
  History,
  Scale,
} from 'lucide-react'
import { useStore, REVIEWER } from '@/store/store'
import { LabItem } from '@/components/LabItem'
import { SourceDocument } from '@/components/SourceDocument'
import { Modal, SectionTitle, EmptyState } from '@/components/ui/misc'
import { Chip } from '@/components/ui/badges'
import {
  DEFAULT_FILTERS,
  filterLabs,
  recordStats,
  type LabFilters,
} from '@/store/selectors'
import { formatDateTime } from '@/domain/util'
import type { Conflict, LabResult, SourceSpan } from '@/domain/types'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PAGE_META } from '@/seo/siteConfig'

export default function Review() {
  useStaticPageMeta('review')
  const { record, dispatch } = useStore()
  const stats = recordStats(record)
  const [filters, setFilters] = useState<LabFilters>(DEFAULT_FILTERS)
  const [editing, setEditing] = useState<string | null>(null)
  const [noting, setNoting] = useState<string | null>(null)
  const [source, setSource] = useState<{ reportId: string; span: SourceSpan } | null>(null)

  const openConflicts = record.conflicts.filter((c) => c.status === 'OPEN')
  const openClar = record.clarifications.filter((q) => !q.answered)
  const filtered = useMemo(() => filterLabs(record.labs, filters), [record.labs, filters])
  const sourceReport = source ? record.reports.find((r) => r.id === source.reportId) : null

  function openSource(lab: LabResult) {
    if (lab.provenance.span) setSource({ reportId: lab.reportId, span: lab.provenance.span })
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={PAGE_META.review.breadcrumbs} />
        <h1 className="text-xl font-semibold text-ink-900">Human review</h1>
        <p className="text-sm text-ink-500 mt-1">
          MedLens prepared this information. Nothing is treated as final until a person reviews it.
        </p>
      </div>

      {/* Progress banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-600 font-medium">Review progress</span>
            <span className="text-ink-500 tabular-nums">{stats.verified}/{stats.totalLabs} verified</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.verifiedPct}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Chip tone={openConflicts.length ? 'danger' : 'neutral'}>{openConflicts.length} conflicts</Chip>
          <Chip tone={openClar.length ? 'warn' : 'neutral'}>{openClar.length} questions</Chip>
          <Chip tone="neutral">{stats.unreviewed} unreviewed</Chip>
        </div>
      </div>

      {/* Conflicts */}
      {openConflicts.length > 0 && (
        <div className="card p-5">
          <SectionTitle title="Potential conflicts" subtitle="MedLens surfaces disagreements — it never picks a winner automatically." right={<AlertTriangle size={18} className="text-rose-500" />} />
          <div className="space-y-4">
            {openConflicts.map((c) => (
              <ConflictCard
                key={c.id}
                conflict={c}
                onResolve={(inFavorOf, note) => dispatch({ type: 'RESOLVE_CONFLICT', conflictId: c.id, resolvedInFavorOf: inFavorOf, note, actor: REVIEWER })}
                onAck={() => dispatch({ type: 'ACK_CONFLICT', conflictId: c.id, actor: REVIEWER })}
                onViewSource={(span) => span && setSource({ reportId: span.reportId, span })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clarifications */}
      {openClar.length > 0 && (
        <div className="card p-5">
          <SectionTitle title="Clarification questions" subtitle="Specific, non-diagnostic questions generated from gaps in the data." right={<HelpCircle size={18} className="text-primary-500" />} />
          <div className="space-y-3">
            {openClar.map((q) => (
              <ClarificationCard key={q.id} question={q.question} rationale={q.rationale} category={q.category} onAnswer={(a) => dispatch({ type: 'ANSWER_CLARIFICATION', id: q.id, answer: a, actor: REVIEWER })} />
            ))}
          </div>
        </div>
      )}

      {/* Value review queue */}
      <div className="card p-5">
        <SectionTitle title="Value review" subtitle="Verify, edit, reject or annotate each extracted value." />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm w-44"
            placeholder="Search tests…"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
          <Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v as LabFilters['status'] })} options={[['ALL', 'All statuses'], ['ABNORMAL', 'Abnormal'], ['WITHIN', 'Within range'], ['UNKNOWN', 'Range unavailable']]} />
          <Select value={filters.verification} onChange={(v) => setFilters({ ...filters, verification: v as LabFilters['verification'] })} options={[['ALL', 'All review states'], ['UNREVIEWED', 'Unreviewed'], ['VERIFIED', 'Verified'], ['REJECTED', 'Rejected']]} />
          <Select value={filters.reportId} onChange={(v) => setFilters({ ...filters, reportId: v })} options={[['ALL', 'All reports'], ...record.reports.filter((r) => record.labs.some((l) => l.reportId === r.id)).map((r) => [r.id, r.title] as [string, string])]} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No values match these filters" icon={<HelpCircle size={28} />} />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map((l) => (
              <div key={l.id}>
                <LabItem
                  lab={l}
                  conflicts={record.conflicts}
                  onViewSource={openSource}
                  actions={
                    <>
                      <button className="btn-secondary px-2.5 py-1 text-xs" disabled={l.verification === 'VERIFIED'} onClick={() => dispatch({ type: 'VERIFY_LAB', labId: l.id, actor: REVIEWER })}>
                        <ShieldCheck size={13} /> Verify
                      </button>
                      <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setEditing(editing === l.id ? null : l.id)}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setNoting(noting === l.id ? null : l.id)}>
                        <StickyNote size={13} /> Note
                      </button>
                      <button className="btn-ghost px-2.5 py-1 text-xs text-rose-600" disabled={l.verification === 'REJECTED'} onClick={() => dispatch({ type: 'REJECT_LAB', labId: l.id, actor: REVIEWER })}>
                        <X size={13} /> Reject
                      </button>
                    </>
                  }
                />
                {editing === l.id && <EditForm lab={l} onSave={(patch) => { dispatch({ type: 'EDIT_LAB', labId: l.id, patch, actor: REVIEWER }); setEditing(null) }} onCancel={() => setEditing(null)} />}
                {noting === l.id && <NoteForm onSave={(note) => { dispatch({ type: 'ADD_LAB_NOTE', labId: l.id, note, actor: REVIEWER }); setNoting(null) }} onCancel={() => setNoting(null)} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit trail */}
      <div className="card p-5">
        <SectionTitle title="Audit trail" subtitle="An append-only record of who did what." right={<History size={18} className="text-ink-400" />} />
        <ol className="space-y-2 max-h-80 overflow-y-auto scroll-thin">
          {record.audit.map((a) => (
            <li key={a.id} className="flex items-start gap-3 text-sm border-l-2 border-ink-100 pl-3 py-0.5">
              <div className="flex-1">
                <span className="font-medium text-ink-800">{a.actor}</span>{' '}
                <span className="text-ink-600">{a.detail}</span>
                {a.from && a.to && (
                  <div className="text-xs text-ink-400 mt-0.5">
                    <span className="line-through">{a.from}</span> → <span className="text-ink-700">{a.to}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-ink-400 whitespace-nowrap">{formatDateTime(a.at)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Source viewer modal */}
      <Modal open={!!source} onClose={() => setSource(null)} title={sourceReport?.title ?? 'Source'} wide>
        {sourceReport && (
          <div className="rounded-lg border border-ink-100 p-4 bg-white max-h-[65vh] overflow-y-auto scroll-thin">
            <SourceDocument report={sourceReport} activeSpan={source?.span} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function ConflictCard({ conflict, onResolve, onAck, onViewSource }: { conflict: Conflict; onResolve: (inFavorOf: string | undefined, note: string) => void; onAck: () => void; onViewSource: (span?: SourceSpan) => void }) {
  const [note, setNote] = useState('')
  const [favor, setFavor] = useState<string | undefined>()
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink-900">{conflict.concept}</span>
            <Chip tone="danger" className="scale-90">{conflict.kind.replace(/_/g, ' ').toLowerCase()}</Chip>
          </div>
          <p className="text-[13px] text-ink-600 mt-1">{conflict.summary}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        {conflict.evidence.map((e, i) => (
          <button
            key={i}
            onClick={() => { setFavor(e.label); e.span && onViewSource(e.span) }}
            className={`text-left rounded-lg border p-2.5 transition-colors ${favor === e.label ? 'border-primary-400 bg-primary-50' : 'border-ink-200 bg-white hover:border-ink-300'}`}
          >
            <div className="text-xs text-ink-400">{e.label}{e.date ? ` · ${e.date}` : ''}</div>
            <div className="font-medium text-ink-800 mt-0.5">{e.value}</div>
            {e.span && <div className="text-[11px] text-primary-600 mt-1 flex items-center gap-1"><Crosshair size={11} /> view in source</div>}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm"
          placeholder={favor ? `Resolution note (favouring ${favor})…` : 'Resolution note…'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-primary px-3 py-1.5 text-sm" disabled={!note.trim()} onClick={() => onResolve(favor, note.trim())}>
          <Check size={14} /> Resolve
        </button>
        <button className="btn-secondary px-3 py-1.5 text-sm" onClick={onAck} title="Keep both values, record that this was reviewed">
          <Scale size={14} /> Acknowledge
        </button>
      </div>
    </div>
  )
}

function ClarificationCard({ question, rationale, category, onAnswer }: { question: string; rationale: string; category: string; onAnswer: (a: string) => void }) {
  const [answer, setAnswer] = useState('')
  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Chip tone="primary" className="scale-90">{category.toLowerCase()}</Chip>
      </div>
      <p className="text-sm font-medium text-ink-800">{question}</p>
      <p className="text-xs text-ink-500 mt-1">{rationale}</p>
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <input className="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm" placeholder="Record an answer…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <button className="btn-primary px-3 py-1.5 text-sm" disabled={!answer.trim()} onClick={() => onAnswer(answer.trim())}>Save answer</button>
      </div>
    </div>
  )
}

function EditForm({ lab, onSave, onCancel }: { lab: LabResult; onSave: (patch: { valueRaw?: string; rangeRaw?: string; unit?: string }) => void; onCancel: () => void }) {
  const [valueRaw, setValue] = useState(lab.valueRaw)
  const [unit, setUnit] = useState(lab.unit ?? '')
  const [rangeRaw, setRange] = useState(lab.referenceRange.unavailable ? '' : lab.referenceRange.raw)
  return (
    <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50/50 p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Value"><input className="w-full rounded border border-ink-200 px-2 py-1 text-sm" value={valueRaw} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Unit"><input className="w-full rounded border border-ink-200 px-2 py-1 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <Field label="Reference range"><input className="w-full rounded border border-ink-200 px-2 py-1 text-sm" placeholder="e.g. 12.0 - 16.0" value={rangeRaw} onChange={(e) => setRange(e.target.value)} /></Field>
      </div>
      <p className="text-[11px] text-ink-500">Editing recomputes the status against the range you enter, and records the change in the audit trail.</p>
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1 text-xs" onClick={() => onSave({ valueRaw, unit: unit || undefined, rangeRaw })}>Save changes</button>
        <button className="btn-ghost px-3 py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function NoteForm({ onSave, onCancel }: { onSave: (n: string) => void; onCancel: () => void }) {
  const [note, setNote] = useState('')
  return (
    <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50 p-3 flex gap-2">
      <input className="flex-1 rounded border border-ink-200 px-2 py-1 text-sm" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <button className="btn-primary px-3 py-1 text-xs" disabled={!note.trim()} onClick={() => onSave(note.trim())}>Add</button>
      <button className="btn-ghost px-3 py-1 text-xs" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-ink-500">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm bg-white" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
