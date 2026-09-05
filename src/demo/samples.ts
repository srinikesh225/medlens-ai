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
  {
    id: 'sample_lipid',
    title: 'Lipid Profile — 04 Sep 2026',
    kind: 'LAB',
    labName: 'Northshore Labs',
    reportDate: '2026-09-04',
    filename: 'lipid_profile_04Sep2026.pdf',
    demoNote:
      'One-sided reference limits (< and >). Shows HIGH and LOW computed from the source range — Total Cholesterol 232 vs < 200 (HIGH), HDL 38 vs > 40 (LOW). A different date from the earlier lipid panel, so it extends the trend, not a conflict.',
    text: `NORTHSHORE LABS  —  LIPID PROFILE
------------------------------------------------------------
Patient: Jordan M. Rivera            ID: DEMO-2026-0475
Collected: 04 Sep 2026               Accession: NS-LP-9330
Specimen: Serum, fasting

RESULTS
------------------------------------------------------------
Test                 Result     Unit       Reference
Total Cholesterol    232        mg/dL      < 200
LDL Cholesterol      155        mg/dL      < 130
HDL Cholesterol      38         mg/dL      > 40
Triglycerides        120        mg/dL      < 150
------------------------------------------------------------
Comment: Fasting lipid profile. One-sided reference limits used.`,
  },
  {
    id: 'sample_diabetes',
    title: 'Diabetes Panel — 01 Sep 2026',
    kind: 'LAB',
    labName: 'CityCare Laboratory',
    reportDate: '2026-09-01',
    filename: 'diabetes_panel_01Sep2026.pdf',
    demoNote:
      'A second laboratory reports a fasting glucose for a date already on file (118 vs 96 mg/dL, same day) — watch a NEW conflict appear in the live conflict scan and in Review. HbA1c is computed HIGH from its own source range.',
    text: `CITYCARE LABORATORY  —  DIABETES PANEL
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Collected: 01 Sep 2026               Accession: CC-DM-4407
Specimen: Serum, fasting

RESULTS
------------------------------------------------------------
Test                 Result     Unit       Reference
Glucose (Fasting)    118        mg/dL      70 - 99
HbA1c                7.1        %          4.0 - 5.6
------------------------------------------------------------
Comment: Fasting sample processed at an outside laboratory.`,
  },
  {
    id: 'sample_medrecord',
    title: 'Medication Record — 04 Sep 2026',
    kind: 'MEDICATION_RECORD',
    labName: 'CityCare Family Clinic',
    reportDate: '2026-09-04',
    filename: 'medication_record_04Sep2026.pdf',
    demoNote:
      'A medication record, not a lab. Shows the medication-extraction path and status parsing: two ACTIVE and one DISCONTINUED, each with dose and frequency read from the source line.',
    text: `CITYCARE FAMILY CLINIC  —  MEDICATION & PRESCRIPTION RECORD
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Reviewed: 04 Sep 2026                Clinician: Dr. A. Rao

CURRENT MEDICATIONS
------------------------------------------------------------
- Amlodipine 5 mg — once daily (active)
- Aspirin 75 mg — discontinued 20 Aug 2026
- Omeprazole 20 mg — once daily (active)
------------------------------------------------------------
Note: Reconcile against the existing medication list at next visit.`,
  },
]

export function findSample(id: string): SampleReport | undefined {
  return SAMPLE_REPORTS.find((s) => s.id === id)
}
