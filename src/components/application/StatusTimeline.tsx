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
  if (events.length === 0) return <p className="text-sm text-slate-500">No status updates yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`h-3 w-3 rounded-full ${index === events.length - 1 ? 'bg-brand-600' : 'bg-slate-300'}`} />
            {index < events.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{event.label}</p>
            <p className="text-xs text-slate-500">
              {formatDate(event.createdAt)} · {event.actor?.fullName ?? 'System'}
            </p>
            {event.reason && <p className="mt-1 text-sm text-slate-600">{event.reason}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
