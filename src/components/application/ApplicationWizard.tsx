'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, Field } from '@/components/ui';
import { DocumentUploader } from './DocumentUploader';
import { patchJson, postJson } from '@/lib/client';
import { GRADE_OPTIONS, TRINITY_HOUSE_OPTIONS } from '@/lib/constants';
import type { Stream } from '@prisma/client';

interface WizardApplication {
  id: string;
  stream: Stream;
  status: string;
  child: {
    fullName: string;
    dateOfBirth: string;
    school: string;
    grade: string;
    house: string;
    gender: string | null;
  };
  guardian: { addressLine1: string | null; city: string | null; district: string | null; relationshipToChild: string | null } | null;
  streamA: { circumstances: string | null } | null;
  streamB: {
    sport: string;
    position: string;
    level: string;
    results: string;
    recruitingCoachName: string;
    recruitingCoachPhone: string;
    recruitingCoachEmail: string | null;
    clubOrSchool: string | null;
    achievements: string | null;
    coachDeclaration: boolean;
  } | null;
  documents: Array<{ id: string; type: string; fileName: string; sizeBytes: number; createdAt: string }>;
}

const steps = ['Child & guardian', 'Stream details', 'Documents', 'Review & submit'];

function dateInput(iso: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}

export function ApplicationWizard({ application }: { application: WizardApplication }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const firstRender = useRef(true);

  const [form, setForm] = useState({
    fullName: application.child.fullName,
    dateOfBirth: dateInput(application.child.dateOfBirth),
    school: application.child.school,
    grade: application.child.grade,
    house: application.child.house || 'Not applicable',
    gender: application.child.gender ?? '',
    addressLine1: application.guardian?.addressLine1 ?? '',
    city: application.guardian?.city ?? '',
    district: application.guardian?.district ?? '',
    relationshipToChild: application.guardian?.relationshipToChild ?? '',
    circumstances: application.streamA?.circumstances ?? '',
    sport: application.streamB?.sport ?? '',
    position: application.streamB?.position ?? '',
    level: application.streamB?.level ?? '',
    results: application.streamB?.results ?? '',
    coachName: application.streamB?.recruitingCoachName ?? '',
    coachPhone: application.streamB?.recruitingCoachPhone ?? '',
    coachEmail: application.streamB?.recruitingCoachEmail ?? '',
    clubOrSchool: application.streamB?.clubOrSchool ?? '',
    achievements: application.streamB?.achievements ?? '',
    coachDeclaration: application.streamB?.coachDeclaration ?? false,
  });
  const [consent, setConsent] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step > 1 || application.status !== 'DRAFT') return;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const payload: Record<string, unknown> = {
          child: {
            fullName: form.fullName,
            dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
            school: form.school,
            grade: form.grade,
            house: form.house,
            gender: form.gender || undefined,
          },
          guardian: {
            addressLine1: form.addressLine1,
            city: form.city,
            district: form.district,
            relationshipToChild: form.relationshipToChild,
          },
        };
        if (application.stream === 'OLD_TINITIAN_SUPPORT') payload.streamA = { circumstances: form.circumstances };
        else {
          payload.streamB = {
            sport: form.sport,
            position: form.position,
            level: form.level,
            results: form.results,
            recruitingCoachName: form.coachName,
            recruitingCoachPhone: form.coachPhone,
            recruitingCoachEmail: form.coachEmail || undefined,
            clubOrSchool: form.clubOrSchool,
            achievements: form.achievements,
            coachDeclaration: form.coachDeclaration,
          };
        }
        await patchJson(`/api/applications/${application.id}`, payload);
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form, step, application.id, application.stream, application.status]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${application.id}/submit`, {
        detailsComplete: true,
        documentsComplete: true,
        consentGranted: true,
      });
      router.push(`/applications/${application.id}`);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <Badge key={label} tone={index === step ? 'blue' : index < step ? 'green' : 'slate'}>
              {index + 1}. {label}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Draft saved' : 'Auto-save enabled'}
        </p>
      </div>
      {error && <Alert tone="red">{error}</Alert>}

      {step === 0 && (
        <Card title="Child & guardian details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Child full name">
              <input className="input" value={form.fullName} onChange={(event) => set('fullName', event.target.value)} />
            </Field>
            <Field label="Date of birth">
              <input className="input" type="date" value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} />
            </Field>
            <Field label="School">
              <input className="input" value={form.school} onChange={(event) => set('school', event.target.value)} />
            </Field>
            <Field label="Grade">
              <select className="input" value={form.grade} onChange={(event) => set('grade', event.target.value)} required>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trinity house" hint="Choose ‘Not applicable’ if no house has been assigned.">
              <select className="input" value={form.house} onChange={(event) => set('house', event.target.value)} required>
                {TRINITY_HOUSE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gender (optional)">
              <input className="input" value={form.gender} onChange={(event) => set('gender', event.target.value)} />
            </Field>
            <Field label="Relationship to child">
              <input className="input" value={form.relationshipToChild} onChange={(event) => set('relationshipToChild', event.target.value)} />
            </Field>
            <Field label="Address">
              <input className="input" value={form.addressLine1} onChange={(event) => set('addressLine1', event.target.value)} />
            </Field>
            <Field label="City">
              <input className="input" value={form.city} onChange={(event) => set('city', event.target.value)} />
            </Field>
            <Field label="District">
              <input className="input" value={form.district} onChange={(event) => set('district', event.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      {step === 1 && application.stream === 'OLD_TINITIAN_SUPPORT' && (
        <Card
          title="Stream A — circumstances"
          description="No income, salary, employment or financial evidence is requested for this stream."
        >
          <Field label="Circumstances (optional)" hint="Share any circumstances you would like the panel to consider.">
            <textarea className="input min-h-40" value={form.circumstances} onChange={(event) => set('circumstances', event.target.value)} />
          </Field>
        </Card>
      )}

      {step === 1 && application.stream === 'SPORTS_SCHOLARSHIP' && (
        <Card title="Stream B — sports details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sport">
              <input className="input" value={form.sport} onChange={(event) => set('sport', event.target.value)} />
            </Field>
            <Field label="Position">
              <input className="input" value={form.position} onChange={(event) => set('position', event.target.value)} />
            </Field>
            <Field label="Level">
              <input className="input" value={form.level} onChange={(event) => set('level', event.target.value)} />
            </Field>
            <Field label="Club / school">
              <input className="input" value={form.clubOrSchool} onChange={(event) => set('clubOrSchool', event.target.value)} />
            </Field>
            <Field label="Results">
              <textarea className="input min-h-24" value={form.results} onChange={(event) => set('results', event.target.value)} />
            </Field>
            <Field label="Achievements (optional)">
              <textarea className="input min-h-24" value={form.achievements} onChange={(event) => set('achievements', event.target.value)} />
            </Field>
            <Field label="Recruiting coach name">
              <input className="input" value={form.coachName} onChange={(event) => set('coachName', event.target.value)} />
            </Field>
            <Field label="Recruiting coach phone">
              <input className="input" value={form.coachPhone} onChange={(event) => set('coachPhone', event.target.value)} />
            </Field>
            <Field label="Recruiting coach email">
              <input className="input" value={form.coachEmail} onChange={(event) => set('coachEmail', event.target.value)} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={form.coachDeclaration} onChange={(event) => set('coachDeclaration', event.target.checked)} />
              Coach details confirmed
            </label>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Supporting documents" description="PDF, JPG or PNG up to 10MB each.">
          <DocumentUploader
            applicationId={application.id}
            stream={application.stream}
            documents={application.documents}
            disabled={application.status !== 'DRAFT'}
          />
        </Card>
      )}

      {step === 3 && (
        <Card title="Review & submit">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-muted">Child</dt><dd className="font-medium">{form.fullName}</dd></div>
            <div><dt className="text-muted">Stream</dt><dd className="font-medium">{application.stream.replaceAll('_', ' ')}</dd></div>
            <div><dt className="text-muted">Grade</dt><dd className="font-medium">{form.grade}</dd></div>
            <div><dt className="text-muted">Trinity house</dt><dd className="font-medium">{form.house}</dd></div>
            <div><dt className="text-muted">Documents</dt><dd className="font-medium">{application.documents.length} uploaded</dd></div>
          </dl>
          <label className="mt-5 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
            I confirm the information is accurate and consent to NWEF processing it for application assessment, award administration and audit under the Sri Lanka Personal Data Protection Act.
          </label>
          <div className="mt-4 flex gap-3">
            <Button type="button" onClick={submit} disabled={!consent || application.documents.length === 0 || busy}>
              {busy ? 'Submitting…' : 'Submit application'}
            </Button>
            <a className="btn-secondary" href="/api/me/data-requests">Data protection requests</a>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
          Back
        </Button>
        <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} disabled={step === steps.length - 1}>
          Continue
        </Button>
      </div>
    </div>
  );
}
