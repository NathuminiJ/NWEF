import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Alert, Badge, Card, Stat } from '@/components/ui';
import { StatusTimeline } from '@/components/application/StatusTimeline';
import { DocumentUploader } from '@/components/application/DocumentUploader';
import { InterviewBooking } from '@/components/application/InterviewBooking';
import { InfoRequestPanel } from '@/components/application/InfoRequestPanel';
import { AwardAcceptance } from '@/components/application/AwardAcceptance';
import { RenewalButton } from '@/components/application/RenewalButton';
import { getApplicationDetail } from '@/services/applications';
import { getSlaInfo, slaLabel } from '@/lib/sla';
import { STATUS_LABELS } from '@/lib/workflow';
import { formatDate, formatMoney } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage();
  const { id } = await params;
  const application = await getApplicationDetail(id, user);
  if (!application) notFound();

  const sla = getSlaInfo(application);
  const canEditDocuments = ['DRAFT', 'INFO_REQUESTED'].includes(application.status);
  const events = application.timeline.map((event) => ({
    id: event.id,
    toStatus: event.toStatus,
    label: STATUS_LABELS[event.toStatus],
    action: event.action,
    reason: event.reason,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor ? { fullName: event.actor.fullName, role: event.actor.role } : null,
  }));

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <header className="page-heading flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>{application.referenceNo}</h1>
            <p className="page-lede">
              {application.child.fullName} · {application.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A — Old Trinitian Support' : 'Stream B — Sports Scholarship'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <a className="btn-secondary" href={`/api/applications/${id}/summary-pdf`}>
              Download PDF
            </a>
            <Badge tone="blue">{STATUS_LABELS[application.status]}</Badge>
            <Badge tone={sla.flag === 'OVERDUE' ? 'red' : sla.flag === 'DUE_SOON' ? 'amber' : 'slate'}>{slaLabel(sla.flag)}</Badge>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Submitted" value={formatDate(application.submittedAt)} />
          <Stat label="Screening due" value={formatDate(sla.effectiveDueAt)} sub={`${configDays()} working calendar days + paused time`} />
          <Stat label="Panel score" value={application.scores.length ? 'Available' : 'Pending'} sub={`${application.scores.length} scorecard(s)`} />
        </div>

        {application.status === 'INFO_REQUESTED' && (
          <InfoRequestPanel
            applicationId={id}
            canRespond={user.role === 'APPLICANT'}
            requests={application.infoRequests.map((request) => ({
              id: request.id,
              message: request.message,
              createdAt: request.createdAt.toISOString(),
              dueAt: request.dueAt?.toISOString() ?? null,
              response: request.response,
              respondedAt: request.respondedAt?.toISOString() ?? null,
            }))}
          />
        )}

        {application.status === 'TRUSTEE_DECLINED' && (
          <Alert tone="red">The Trust Board has declined this application for this award cycle.</Alert>
        )}

        {application.status === 'SHORTLISTED' && (
          <Card title="Book your interview" description="Choose an available slot with the interview panel.">
            <InterviewBooking applicationId={id} bookedSlotId={application.booking?.slotId} />
          </Card>
        )}

        {application.status === 'INTERVIEW_SCHEDULED' && application.booking && (
          <Card title="Interview scheduled">
            <p className="text-sm">
              {formatDate(application.booking.slot.startsAt)} — {application.booking.slot.session.title} ·{' '}
              {application.booking.slot.session.location ?? 'Online'}
            </p>
          </Card>
        )}

        {application.status === 'TRUSTEE_APPROVED' && application.award && (
          <Card title="Award acceptance">
            <AwardAcceptance
              applicationId={id}
              amount={Number(application.award.amount)}
              currency={application.award.currency}
            />
          </Card>
        )}

        {application.status === 'ACTIVE_AWARD' && (
          <Card title="Annual renewal">
            <p className="mb-3 text-sm text-muted">Renewal applications open each academic year while the award is active.</p>
            <RenewalButton applicationId={id} />
          </Card>
        )}

        <Card title="Supporting documents">
          <DocumentUploader
            applicationId={id}
            stream={application.stream}
            disabled={!canEditDocuments}
            documents={application.documents.map((document) => ({
              id: document.id,
              type: document.type,
              fileName: document.fileName,
              sizeBytes: document.sizeBytes,
              createdAt: document.createdAt.toISOString(),
            }))}
          />
        </Card>

        <Card title="Application timeline" description="Every status change is recorded with user and timestamp.">
          <StatusTimeline events={events} />
        </Card>

        {application.award && (
          <Card title="Award & payments">
            <p className="numeric text-sm">Awarded: {formatMoney(application.award.amount, application.award.currency)}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {application.award.instalments.map((instalment) => (
                <li key={instalment.id} className="flex justify-between bg-surface px-3 py-2">
                  <span>Instalment {instalment.sequence} · due {formatDate(instalment.dueDate)}</span>
                  <Badge tone={instalment.status === 'PAID' ? 'green' : 'amber'}>{instalment.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function configDays() {
  return Number(process.env.SCREENING_TURNAVEROUND_DAYS ?? 10);
}
