import PDFDocument from 'pdfkit';
import { config } from './config';
import { formatDate, formatMoney } from './utils';

const INK = '#041F4A';
const MUTED = '#4A5A79';
const BRAND = '#041F4A';
const BRASS = '#EF2636';
const YELLOW = '#F7DA40';
const LINE = '#CDD5E5';
const LEFT = 56;
const RIGHT = 539;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 770;

type PdfDoc = PDFKit.PDFDocument;

function drawRule(doc: PdfDoc, y: number, color = LINE): number {
  doc.save().lineWidth(1).strokeColor(color).moveTo(LEFT, y).lineTo(RIGHT, y).stroke().restore();
  return y + 1;
}

function masthead(doc: PdfDoc, subtitle: string): number {
  doc.font('Times-Bold').fontSize(9).fillColor(BRASS).text('ENG. NAHIL WIJESURIYA FIMAREST ENDOWMENT FUND', LEFT, 42, {
    width: WIDTH,
    align: 'center',
  });
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(subtitle, LEFT, 56, { width: WIDTH, align: 'center' });
  return drawRule(doc, 76) + 18;
}

function sectionTitle(doc: PdfDoc, title: string, y: number): number {
  doc.font('Times-Bold').fontSize(13).fillColor(BRAND).text(title.toUpperCase(), LEFT, y, { width: WIDTH });
  const afterTitle = drawRule(doc, doc.y + 6, BRASS) + 10;
  return afterTitle;
}

function ensureSpace(doc: PdfDoc, needed = 80, y = doc.y): number {
  if (y + needed <= BOTTOM) return y;
  doc.addPage();
  return masthead(doc, 'Continued') + 8;
}

function field(doc: PdfDoc, label: string, value: string | number | null | undefined, y: number): number {
  const start = ensureSpace(doc, 28, y);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(label.toUpperCase(), LEFT, start, { width: 160 });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(INK)
    .text(value === null || value === undefined || value === '' ? '—' : String(value), LEFT + 170, start, {
      width: WIDTH - 170,
    });
  return Math.max(doc.y, start) + 9;
}

function paragraph(doc: PdfDoc, text: string, y: number): number {
  const start = ensureSpace(doc, 40, y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(text || '—', LEFT, start, { width: WIDTH, lineGap: 2 });
  return doc.y + 8;
}

function bullet(doc: PdfDoc, text: string, y: number): number {
  const start = ensureSpace(doc, 24, y);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRASS).text('•', LEFT, start, { width: 12 });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(text, LEFT + 14, start, { width: WIDTH - 14 });
  return Math.max(doc.y, start) + 5;
}

function bufferFrom(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export interface AwardLetterInput {
  referenceNo: string;
  guardianName: string;
  childName: string;
  school: string;
  amount: string | number;
  currency?: string;
  issuedAt?: Date;
  acceptedBy?: string;
}

/** Generates the official award letter as a PDF buffer. */
export function generateAwardLetter(input: AwardLetterInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const issuedAt = input.issuedAt ?? new Date();
    doc.fontSize(18).text(config.appName, { align: 'center' });
    doc.moveDown(0.5).fontSize(10).text('Eng. Nahil Wijesuriya Endowment Fund', { align: 'center' });
    doc.moveTo(56, doc.y + 12).lineTo(539, doc.y + 12).stroke();
    doc.moveDown(1.5);

    doc.fontSize(11).text(issuedAt.toDateString());
    doc.text(`Reference: ${input.referenceNo}`);
    doc.moveDown(1);
    doc.text(`Dear ${input.guardianName},`);
    doc.moveDown(1);
    doc.text(
      `The Trust Board is pleased to offer a scholarship award for ${input.childName} of ${input.school}. ` +
        `The approved award is ${formatMoney(input.amount, input.currency ?? config.business.currency)}, ` +
        'payable in instalments against Trinity College fee invoices subject to the Fund regulations and annual renewal.',
    );
    doc.moveDown(1);
    doc.text('Please sign and upload this letter in the portal to accept the award. Acceptance must be completed before payments commence.');
    doc.moveDown(2);
    doc.text(config.pdf.signatoryName);
    doc.text('For and on behalf of the NWEF Trust Board');
    if (input.acceptedBy) {
      doc.moveDown(2).text(`Accepted electronically by: ${input.acceptedBy}`);
    }
    doc.end();
  });
}

export interface ApplicationSummaryInput {
  referenceNo: string;
  status: string;
  stream: 'OLD_TINITIAN_SUPPORT' | 'SPORTS_SCHOLARSHIP';
  submittedAt?: Date | null;
  child: {
    fullName: string;
    dateOfBirth: Date;
    school: string;
    grade: string;
    house: string;
    gender?: string | null;
  };
  guardian?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    relationshipToChild?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    district?: string | null;
  } | null;
  streamA?: { circumstances?: string | null } | null;
  streamB?: {
    sport?: string | null;
    position?: string | null;
    level?: string | null;
    results?: string | null;
    recruitingCoachName?: string | null;
    recruitingCoachPhone?: string | null;
    clubOrSchool?: string | null;
    achievements?: string | null;
  } | null;
  documents: Array<{ type: string; fileName: string; createdAt: Date }>;
  timeline: Array<{ label: string; createdAt: Date; actor?: string | null }>;
}

/** Generates an editorial-style PDF summary of one scholarship application. */
export function generateApplicationSummaryPdf(input: ApplicationSummaryInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const done = bufferFrom(doc);

  let y = masthead(doc, `Application summary · ${input.referenceNo}`);

  doc.font('Times-Roman').fontSize(28).fillColor(INK).text('Scholarship application', LEFT, y, { width: WIDTH });
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`Prepared ${formatDate(new Date())}`, LEFT, y, { width: WIDTH });
  y = drawRule(doc, doc.y + 12) + 18;

  y = sectionTitle(doc, 'Application', y);
  y = field(doc, 'Reference', input.referenceNo, y);
  y = field(doc, 'Status', input.status, y);
  y = field(
    doc,
    'Stream',
    input.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A — Old Trinitian Support' : 'Stream B — Sports Scholarship',
    y,
  );
  y = field(doc, 'Submitted', input.submittedAt ? formatDate(input.submittedAt) : 'Draft — not yet submitted', y);
  y += 12;

  y = sectionTitle(doc, 'Child details', y);
  y = field(doc, 'Full name', input.child.fullName, y);
  y = field(doc, 'Date of birth', formatDate(input.child.dateOfBirth), y);
  y = field(doc, 'School', input.child.school, y);
  y = field(doc, 'Grade', input.child.grade, y);
  y = field(doc, 'Trinity house', input.child.house, y);
  y = field(doc, 'Gender', input.child.gender || 'Not stated', y);
  y += 12;

  if (input.guardian) {
    y = sectionTitle(doc, 'Guardian details', y);
    y = field(doc, 'Name', input.guardian.fullName, y);
    y = field(doc, 'Phone', input.guardian.phone, y);
    y = field(doc, 'Email', input.guardian.email, y);
    y = field(doc, 'Relationship', input.guardian.relationshipToChild, y);
    y = field(
      doc,
      'Address',
      [input.guardian.addressLine1, input.guardian.city, input.guardian.district].filter(Boolean).join(', '),
      y,
    );
    y += 12;
  }

  y = sectionTitle(doc, input.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A details' : 'Stream B details', y);
  if (input.stream === 'OLD_TINITIAN_SUPPORT') {
    y = paragraph(doc, input.streamA?.circumstances || 'No additional circumstances were provided.', y);
  } else {
    y = field(doc, 'Sport', input.streamB?.sport, y);
    y = field(doc, 'Position', input.streamB?.position, y);
    y = field(doc, 'Level', input.streamB?.level, y);
    y = field(doc, 'Club / school', input.streamB?.clubOrSchool, y);
    y = field(doc, 'Coach', input.streamB?.recruitingCoachName, y);
    y = field(doc, 'Coach phone', input.streamB?.recruitingCoachPhone, y);
    y = paragraph(doc, `Results: ${input.streamB?.results || '—'}`, y);
    if (input.streamB?.achievements) y = paragraph(doc, `Achievements: ${input.streamB.achievements}`, y);
  }
  y += 12;

  y = sectionTitle(doc, 'Supporting documents', y);
  if (input.documents.length === 0) {
    y = paragraph(doc, 'No documents have been uploaded yet.', y);
  } else {
    for (const document of input.documents) {
      y = field(doc, document.type.replaceAll('_', ' '), `${document.fileName} · ${formatDate(document.createdAt)}`, y);
    }
  }
  y += 12;

  y = sectionTitle(doc, 'Status timeline', y);
  if (input.timeline.length === 0) {
    y = paragraph(doc, 'No status changes recorded yet.', y);
  } else {
    for (const event of input.timeline) {
      const label = `${event.label}${event.actor ? ` · ${event.actor}` : ''}`;
      y = field(doc, formatDate(event.createdAt), label, y);
    }
  }

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text('Generated from the NWEF scholarship portal. This record is part of the append-only audit trail.', LEFT, BOTTOM + 24, {
      width: WIDTH,
      align: 'center',
    });

  doc.end();
  return done;
}

/** Full portal reference PDF: design system, functionality, workflow and governance. */
export function generatePortalGuidePdf(): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const done = bufferFrom(doc);

  let y = 58;
  doc.save().lineWidth(3).strokeColor(YELLOW).moveTo(LEFT, 40).lineTo(RIGHT, 40).stroke().restore();
  doc.font('Times-Bold').fontSize(10).fillColor(BRASS).text('ENG. NAHIL WIJESURIYA FIMAREST ENDOWMENT FUND', LEFT, 52, {
    width: WIDTH,
    align: 'center',
  });
  y = 96;

  doc.font('Times-Roman').fontSize(34).fillColor(INK).text('The scholarship portal', LEFT, y, { width: WIDTH });
  y = doc.y + 6;
  doc.font('Times-Italic').fontSize(15).fillColor(BRASS).text('Design, functionality and governance reference', LEFT, y, {
    width: WIDTH,
  });
  y = drawRule(doc, doc.y + 16, BRASS) + 22;

  y = paragraph(
    doc,
    'This guide documents the complete NWEF scholarship portal: the Institutional Editorial design system, both scholarship streams, the applicant and staff experience, the full approval workflow, security, compliance and deployment model.',
    y,
  );

  const sections: Array<{ title: string; lines: string[]; bullets: string[] }> = [
    {
      title: '01 · Institutional Editorial design system',
      lines: [
        'The interface is built as a calm institutional publication rather than a conventional SaaS dashboard. Hairline dividers, two-pixel corners, generous margins and left-aligned editorial headings carry the hierarchy.',
      ],
      bullets: [
        'Navy #041F4A is the base for text, links and dark elements; yellow #F7DA40 is the primary action colour; red #EF2636 marks accents and urgent states.',
        'Canvas #F5F7FC · Surface #E9EDF7 · Muted #4A5A79 · Hairline #CDD5E5.',
        'Newsreader 400/500 and italic for headings and pull-quotes; Plus Jakarta Sans 400/500/600 for body and UI.',
        'Headings use weight 400, -0.02em tracking and 1.15 line-height. Body copy is 16–18px at 1.65 line-height with a 65ch measure.',
        'Money, dates and metrics use tabular figures. No shadows, gradients, SaaS blue/purple, large radii or floating card grids.',
        'Sections use 80–112px vertical rhythm, asymmetric 60/40 hero composition, framed portrait with caption, and italic pull-quotes ruled in red.',
      ],
    },
    {
      title: '02 · Two scholarship streams',
      lines: [
        'The application begins with a clear stream choice. No pre-application eligibility test is required — applicants select a stream, complete the guided form and submit supporting documents.',
      ],
      bullets: [
        'Stream A — Old Trinitian Support: parent/guardian supported applications. No income, salary or employment evidence is requested.',
        'Stream B — Sports Scholarship: recruits athletes and captures sport, position, level, results, club or school, achievements and coach declaration.',
        'Grade and Trinity house are selected from fixed dropdowns. House options cover day scholars, Central Boarding (Napier, Alison, Ryde), Junior Boarding (Collins, Hodges, Perry) and Not applicable.',
        'PDF, JPG and PNG uploads are accepted up to 10MB each, with document types restricted by stream.',
      ],
    },
    {
      title: '03 · Applicant experience',
      lines: [
        'Applicants use a passwordless mobile-number sign-in and a mobile-friendly four-step wizard: Child & guardian, Stream details, Documents, and Review & submit.',
      ],
      bullets: [
        'Drafts autosave while the applicant is on the first two steps.',
        'A personal dashboard lists applications with status, SLA flags and reference numbers.',
        'Every status change appears in a time-stamped audit timeline with the responsible actor.',
        'Shortlisted applicants self-book an available interview slot.',
        'Approved awards are accepted electronically with a typed name or drawn signature.',
        'Applicants can download a PDF summary of their application at any stage.',
        'PDPA data access, correction, erasure, portability and objection requests are available in the portal.',
      ],
    },
    {
      title: '04 · Complete workflow',
      lines: [
        'The workflow is a central, pure state machine. Every transition is authorised, validated, audited and reflected in the applicant timeline.',
      ],
      bullets: [
        'Draft → Submitted → Under screening → Shortlisted → Interview scheduled → Interviewed.',
        'Interviewed → Recommended / Not recommended → Trustee approved / Waitlisted / Declined.',
        'Trustee approved → Award accepted → Active award → Annual renewal.',
        'Information may be requested during screening. The 10-day SLA clock pauses while a request is open and resumes when the applicant responds.',
        'Screening outcomes use neutral language: selected for interview or not shortlisted.',
      ],
    },
    {
      title: '05 · Staff, trustees and finance',
      lines: [
        'Seven role-based dashboards give each group only the views and actions it needs. Resource-level checks restrict staff to the applications they are allowed to see.',
      ],
      bullets: [
        'Admin Officer: application register, user roles, audit trail, SLA reporting and data-request handling.',
        'Screening Reviewer: screening queue, checklist, required-document verification and information requests.',
        'Interview Panel: session scheduler, slot capacity, weighted 1–5 scorecards and recommendation threshold.',
        'Trustee: individual and batch decisions, budget envelopes and award approvals.',
        'Finance Officer: award activation, Trinity College invoices, instalments and payment ledger.',
        'Super Admin: elevated oversight and administrative control.',
        'Role session timeouts: Applicant 12h, Admin/Reviewer 8h, Panel/Finance 4h, Trustee/Super Admin 2h.',
      ],
    },
    {
      title: '06 · Security, audit and compliance',
      lines: [
        'Security is built into the data layer rather than added as presentation. The audit trail is append-only and hash-chained so tampering can be detected.',
      ],
      bullets: [
        'OTP challenges and database-backed sessions use HMAC-hashed tokens.',
        'Every significant action records user ID, role, timestamp, IP and user agent.',
        'Verify the audit chain from the admin audit integrity screen.',
        'Personal data fields are encrypted at rest where configured; PDPA purpose, retention and rights notices are versioned.',
        'Storage uses local development storage or S3-compatible object storage with server-side encryption.',
      ],
    },
    {
      title: '07 · Deployment and operations',
      lines: [
        'The application is a Next.js 15 App Router project with TypeScript, Prisma, PostgreSQL, Tailwind CSS and Zod. It deploys to Vercel with Neon PostgreSQL.',
      ],
      bullets: [
        'Pooled DATABASE_URL serves the runtime; DIRECT_URL is used for migrations.',
        'The prebuild step applies Prisma migrations and seeds staff accounts and budget envelopes unless SEED_ON_DEPLOY=false.',
        'Secrets are lazy-loaded so a production build does not require them at build time.',
        'Demo mode uses fixed OTP 123456 and seeded staff accounts; remove these before public launch and configure real SMS delivery.',
        'PDFs use pdfkit: award letters, application summaries and this portal guide are generated server-side.',
      ],
    },
  ];

  for (const section of sections) {
    y = ensureSpace(doc, 90);
    y = sectionTitle(doc, section.title, y);
    for (const line of section.lines) y = paragraph(doc, line, y);
    for (const item of section.bullets) y = bullet(doc, item, y);
    y += 10;
  }

  drawRule(doc, BOTTOM, BRASS);
  doc
    .font('Times-Italic')
    .fontSize(9)
    .fillColor(BRASS)
    .text('A lasting legacy is measured by the opportunities we create for others.', LEFT, BOTTOM + 14, {
      width: WIDTH,
      align: 'center',
    });

  doc.end();
  return done;
}
