import type { DocumentType, Role, Stream } from '@prisma/client';

/** Stream A must never request income, salary, or employment evidence. */
export const ALLOWED_DOCUMENTS: Record<Stream, DocumentType[]> = {
  OLD_TINITIAN_SUPPORT: ['BIRTH_CERTIFICATE', 'SCHOOL_REPORT', 'NATIONAL_ID', 'MEDICAL_CERTIFICATE', 'OTHER'],
  SPORTS_SCHOLARSHIP: [
    'BIRTH_CERTIFICATE',
    'SCHOOL_REPORT',
    'NATIONAL_ID',
    'SPORT_CERTIFICATE',
    'COACH_RECOMMENDATION',
    'RESULTS_SHEET',
    'MEDICAL_CERTIFICATE',
    'OTHER',
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  APPLICANT: 'Applicant / Parent-Guardian',
  ADMIN_OFFICER: 'Admin Officer',
  SCREENING_REVIEWER: 'Screening Reviewer',
  INTERVIEW_PANEL: 'Interview Panel',
  TRUSTEE: 'Trustee (Approver)',
  FINANCE_OFFICER: 'Finance Officer',
  SUPER_ADMIN: 'Super Admin',
};

/** Role-based idle/absolute session lifetimes (milliseconds). */
export const ROLE_SESSION_TIMEOUTS: Record<Role, number> = {
  APPLICANT: 12 * 60 * 60 * 1000,
  ADMIN_OFFICER: 8 * 60 * 60 * 1000,
  SCREENING_REVIEWER: 8 * 60 * 60 * 1000,
  INTERVIEW_PANEL: 4 * 60 * 60 * 1000,
  TRUSTEE: 2 * 60 * 60 * 1000,
  FINANCE_OFFICER: 4 * 60 * 60 * 1000,
  SUPER_ADMIN: 2 * 60 * 60 * 1000,
};

export interface ChecklistItem {
  key: string;
  label: string;
  requiredFor: Stream[];
}

export const SCREENING_CHECKLIST: ChecklistItem[] = [
  { key: 'identity_verified', label: 'Guardian and child identity verified', requiredFor: ['OLD_TINITIAN_SUPPORT', 'SPORTS_SCHOLARSHIP'] },
  { key: 'relationship_verified', label: 'Parent/guardian relationship verified', requiredFor: ['OLD_TINITIAN_SUPPORT', 'SPORTS_SCHOLARSHIP'] },
  { key: 'school_enrolment', label: 'Current school enrolment confirmed', requiredFor: ['OLD_TINITIAN_SUPPORT', 'SPORTS_SCHOLARSHIP'] },
  { key: 'documents_complete', label: 'Required documents present and legible', requiredFor: ['OLD_TINITIAN_SUPPORT', 'SPORTS_SCHOLARSHIP'] },
  { key: 'sport_evidence', label: 'Sport, level and results evidenced', requiredFor: ['SPORTS_SCHOLARSHIP'] },
  { key: 'coach_verified', label: 'Recruiting coach details verified', requiredFor: ['SPORTS_SCHOLARSHIP'] },
];

export interface ScoreCriterion {
  key: string;
  label: string;
  weightA: number;
  weightB: number;
}

/** Weights sum to 1.00 per stream. Panel members score each 1–5 independently. */
export const SCORE_CRITERIA: ScoreCriterion[] = [
  { key: 'need', label: 'Demonstrated financial need / circumstances', weightA: 0.4, weightB: 0.2 },
  { key: 'academic', label: 'Academic standing and potential', weightA: 0.35, weightB: 0.2 },
  { key: 'sport', label: 'Sporting ability, level and results', weightA: 0, weightB: 0.4 },
  { key: 'coach', label: 'Coach assessment and attitude', weightA: 0, weightB: 0.1 },
  { key: 'conduct', label: 'Conduct and alignment with Trinity values', weightA: 0.25, weightB: 0.1 },
];

export const dataProtectionNotice = {
  version: '1.0',
  controller: 'Eng. Nahil Wijesuriya Endowment Fund (NWEF)',
  purposes: [
    'Assessing scholarship eligibility and making award decisions',
    'Verifying identity, relationship, school enrolment and sporting evidence',
    'Administering awards, payments and annual renewals',
    'Meeting legal, audit and safeguarding obligations',
  ],
  retention: 'Application records are retained for 7 years after an award closes; unsuccessful applications for 2 years.',
  rights: 'You may request access, correction, deletion, portability, or object to processing under the Sri Lanka Personal Data Protection Act.',
  contact: 'dpo@nwef.example',
} as const;
