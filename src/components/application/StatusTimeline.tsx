import { formatDate } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  toStatus: string;
  label: string;
  action: string;
  reason: string | null;
  createdAt: string | Date;
  actor: { fullName: string; role: string } | null;
}

export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No status updates yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`h-3 w-3 rounded-sm ${index === events.length - 1 ? 'bg-brand' : 'bg-line'}`} />
            {index < events.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{event.label}</p>
            <p className="text-xs text-muted">
              {formatDate(event.createdAt)} · {event.actor?.fullName ?? 'System'}
            </p>
            {event.reason && <p className="mt-1 text-sm text-muted">{event.reason}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
