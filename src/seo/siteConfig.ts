/**
 * Single source of truth for site identity + per-page SEO metadata.
 *
 * CUSTOM DOMAIN: change SITE_URL to your real domain in ONE place and every
 * canonical tag, Open Graph URL, sitemap entry and JSON-LD id updates with it.
 * (Also update public/sitemap.xml + public/robots.txt, which are static.)
 */

export const SITE_URL = 'https://medlensai-azure.vercel.app'
export const SITE_NAME = 'MedLens'
export const SITE_TAGLINE = 'Clinical Information Intelligence'
export const SITE_DESCRIPTION =
  'MedLens turns fragmented medical information into a structured, source-traceable, human-reviewable patient record — with reference-range fidelity, provenance and responsible-AI safeguards.'

export interface Crumb {
  name: string
  path: string
}

export interface PageMeta {
  path: string
  title: string
  description: string
  breadcrumbs: Crumb[]
  /** Optional schema.org @type for the page (defaults to WebPage). */
  pageType?: string
}

const home: Crumb = { name: 'Dashboard', path: '/' }

/** Per-route metadata. Titles are unique; each ends with the brand. */
export const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    path: '/',
    title: 'Patient Overview — MedLens Clinical Information Intelligence',
    description:
      'A structured, source-traceable overview of a patient record: extracted values, provenance, reference-range status, conflicts and trends — organized, never diagnosed.',
    breadcrumbs: [home],
    pageType: 'MedicalWebPage',
  },
  patient: {
    path: '/patient',
    title: 'Patient Profile — MedLens',
    description:
      'Demographics, symptoms, conditions, allergies and medications, each labelled with its source: user-provided, document-extracted, AI-generated or human-verified.',
    breadcrumbs: [home, { name: 'Patient', path: '/patient' }],
    pageType: 'MedicalWebPage',
  },
  reports: {
    path: '/reports',
    title: 'Reports — MedLens',
    description:
      'Every ingested medical report, structured through a validated extraction pipeline with the original document retained as the source of truth.',
    breadcrumbs: [home, { name: 'Reports', path: '/reports' }],
  },
  review: {
    path: '/review',
    title: 'Human Review — MedLens',
    description:
      'The human-in-the-loop workflow: verify, edit or reject extracted values, resolve conflicts, answer clarifications, and track every change in an audit trail.',
    breadcrumbs: [home, { name: 'Review', path: '/review' }],
    pageType: 'MedicalWebPage',
  },
  timeline: {
    path: '/timeline',
    title: 'Timeline & Trends — MedLens',
    description:
      'A chronological patient timeline and data-only trend analysis of repeated tests — describing the reported numbers, never a clinical interpretation.',
    breadcrumbs: [home, { name: 'Timeline & Trends', path: '/timeline' }],
    pageType: 'MedicalWebPage',
  },
  summary: {
    path: '/summary',
    title: 'Record Summary — MedLens',
    description:
      'A safety-gated patient information summary composed deterministically from the structured record, linted against diagnostic and prescriptive language before it is ever shown.',
    breadcrumbs: [home, { name: 'Record Summary', path: '/summary' }],
    pageType: 'MedicalWebPage',
  },
  notFound: {
    path: '/404',
    title: 'Page Not Found — MedLens',
    description: 'The page you were looking for could not be found on MedLens.',
    breadcrumbs: [home, { name: 'Not found', path: '/404' }],
  },
}

/** Organization / product identity used in JSON-LD. */
export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: SITE_DESCRIPTION,
  slogan: SITE_TAGLINE,
}
