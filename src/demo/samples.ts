/**
 * Sample report texts a judge can "upload" live during the demo. These are fed
 * through the REAL deterministic extractor → validation → range engine →
 * provenance → conflict scan, exactly like the seeded reports. Nothing here is
 * hardcoded output; the structured result is computed at upload time.
 */

export interface SampleReport {
  id: string
  title: string
  kind: 'LAB' | 'MEDICATION_RECORD'
  labName: string
  reportDate: string
  filename: string
  text: string
  /** What this upload is meant to demonstrate (shown as a hint in the UI). */
  demoNote: string
}

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: 'sample_thyroid',
    title: 'Thyroid Function Test — 03 Sep 2026',
    kind: 'LAB',
    labName: 'Meridian Diagnostics',
    reportDate: '2026-09-03',
    filename: 'thyroid_panel_03Sep2026.pdf',
    demoNote:
      'Adds a new report to the timeline and shows a HIGH value computed from the source range (TSH 5.9 vs 0.4–4.0).',
    text: `MERIDIAN DIAGNOSTICS  —  THYROID FUNCTION TEST
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Collected: 03 Sep 2026               Report No: MD-TFT-7788
Specimen: Serum

RESULTS
------------------------------------------------------------
Test                 Result     Unit       Reference
TSH                  5.9        uIU/mL     0.4 - 4.0
Free T4              1.1        ng/dL      0.8 - 1.8
Free T3              3.2        pg/mL      2.3 - 4.2
Anti-TPO             48         IU/mL      Not provided
------------------------------------------------------------
Comment: Elevated TSH with normal free hormones on this sample.`,
  },
  {
    id: 'sample_urine',
    title: 'Urinalysis — 03 Sep 2026',
    kind: 'LAB',
    labName: 'Northshore Labs',
    reportDate: '2026-09-03',
    filename: 'urinalysis_03Sep2026.pdf',
    demoNote:
      'Includes qualitative results (Positive/Negative) and a value with no printed range — shows how MedLens leaves them un-range-checked instead of guessing.',
    text: `NORTHSHORE LABS  —  URINALYSIS
------------------------------------------------------------
Patient: Jordan M. Rivera            ID: DEMO-2026-0475
Collected: 03 Sep 2026               Accession: NS-UA-9021

RESULTS
------------------------------------------------------------
Test                 Result     Unit       Reference
Glucose (Urine)      Negative              Negative
Protein (Urine)      Trace                 Not provided
Specific Gravity     1.018                 1.005 - 1.030
pH                   6.0                   4.5 - 8.0
Ketones              Positive              Negative
------------------------------------------------------------
Note: Qualitative pad results; correlate clinically.`,
  },
]

export function findSample(id: string): SampleReport | undefined {
  return SAMPLE_REPORTS.find((s) => s.id === id)
}
