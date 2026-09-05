import { useStore } from '@/store/store'
import { ProvenanceBadge, VerificationPill, Chip } from '@/components/ui/badges'
import { SectionTitle, DisclaimerBar } from '@/components/ui/misc'
import { formatDate } from '@/domain/util'
import { SAFETY_DISCLAIMER } from '@/domain/safety'
import type { SourceType } from '@/domain/types'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PAGE_META } from '@/seo/siteConfig'

export default function PatientProfile() {
  useStaticPageMeta('patient')
  const { record } = useStore()
  const d = record.demographics

  const fields: { label: string; value: string; source: SourceType }[] = [
    { label: 'Patient ID', value: d.patientId, source: d.provenance.patientId?.sourceType ?? 'USER_PROVIDED' },
    { label: 'Name', value: d.name, source: d.provenance.name?.sourceType ?? 'USER_PROVIDED' },
    { label: 'Age', value: String(d.age ?? '—'), source: d.provenance.age?.sourceType ?? 'USER_PROVIDED' },
    { label: 'Sex', value: d.sex ?? '—', source: d.provenance.sex?.sourceType ?? 'USER_PROVIDED' },
    { label: 'Date of birth', value: d.dateOfBirth ? formatDate(d.dateOfBirth) : '—', source: d.provenance.dateOfBirth?.sourceType ?? 'USER_PROVIDED' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={PAGE_META.patient.breadcrumbs} />
        <h1 className="text-xl font-semibold text-ink-900">Patient profile</h1>
        <p className="text-sm text-ink-500 mt-1">Every field is labelled with where it came from.</p>
      </div>

      <div className="card p-5">
        <SectionTitle title="Demographics" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.label} className="rounded-lg border border-ink-200 p-3">
              <div className="label">{f.label}</div>
              <div className="mt-1 font-medium text-ink-900">{f.value}</div>
              <div className="mt-2"><ProvenanceBadge type={f.source} className="scale-90 -ml-0.5" /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ListCard title="Symptoms" items={d.symptoms} source="USER_PROVIDED" empty="No symptoms recorded." />
        <ListCard title="Relevant history" items={d.history} source="USER_PROVIDED" empty="No history recorded." />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-5">
          <SectionTitle title="Conditions" />
          <div className="space-y-2">
            {record.conditions.map((c) => (
              <div key={c.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-ink-200 px-3 py-2">
                <span className="text-sm font-medium text-ink-800">{c.name}</span>
                <span className="ml-auto flex gap-1.5">
                  <ProvenanceBadge type={c.provenance.sourceType} className="scale-90" />
                  <VerificationPill state={c.verification} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle title="Allergies" />
          <div className="space-y-2">
            {record.allergies.map((a) => (
              <div key={a.id} className="rounded-lg border border-ink-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-800">{a.substance}</span>
                  <ProvenanceBadge type={a.provenance.sourceType} className="ml-auto scale-90" />
                </div>
                {a.reaction && <div className="text-xs text-ink-500 mt-0.5">Reaction: {a.reaction}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle title="Current medications" />
          <div className="space-y-2">
            {record.medications.map((m) => (
              <div key={m.id} className="rounded-lg border border-ink-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-800">{m.name}</span>
                  {m.status !== 'ACTIVE' && <Chip tone={m.status === 'UNKNOWN' ? 'warn' : 'neutral'}>{m.status.toLowerCase()}</Chip>}
                  <ProvenanceBadge type={m.provenance.sourceType} className="ml-auto scale-90" />
                </div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {[m.dose, m.frequency].filter(Boolean).join(' · ') || 'Details not specified'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DisclaimerBar text={SAFETY_DISCLAIMER} />
    </div>
  )
}

function ListCard({ title, items, source, empty }: { title: string; items: string[]; source: SourceType; empty: string }) {
  return (
    <div className="card p-5">
      <SectionTitle title={title} right={<ProvenanceBadge type={source} className="scale-90" />} />
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((it, i) => (
            <Chip key={i} tone="neutral" className="text-[13px]">{it}</Chip>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-400">{empty}</p>
      )}
    </div>
  )
}
