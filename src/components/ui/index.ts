/**
 * The MedLens primitive set. Screens should build from these only.
 *
 * Anything not exported here (raw `<div className="bg-white rounded-xl ...">`,
 * a hand-rolled table, a bespoke pill) is a bug in the design system, not a
 * licence to hand-roll — add the primitive instead.
 */
export { Card, SectionHeader } from './Card'
export { Button, ButtonLink } from './Button'
export { StatCard } from './StatCard'
export { StatusPill, ProvenanceBadge, VerificationPill, Chip } from './badges'
export { ConfidenceMeter } from './ConfidenceMeter'
export { DataTable, type Column } from './DataTable'
export { TabNav, type TabItem } from './TabNav'
export { EmptyState } from './EmptyState'
