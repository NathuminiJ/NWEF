'use client';

import { useEffect, useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { apiFetch, postJson } from '@/lib/client';
import { formatDate } from '@/lib/utils';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookings: Array<{ id: string }>;
}

interface Session {
  id: string;
  title: string;
  location: string | null;
  mode: string;
  slots: Slot[];
}

export function InterviewBooking({ applicationId, bookedSlotId }: { applicationId: string; bookedSlotId?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Session[]>('/api/interview-sessions')
      .then(setSessions)
      .catch((cause) => setError((cause as Error).message));
  }, []);

  async function book(slotId: string) {
    setBusy(slotId);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/interview-booking`, { slotId });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Select an available interview slot. Booking immediately updates your status.</p>
      {error && <Alert tone="red">{error}</Alert>}
      {sessions.map((session) => (
        <div key={session.id} className="border border-[var(--line)] p-4">
          <p className="font-medium">{session.title}</p>
          <p className="text-xs text-slate-500">
            {session.mode.replaceAll('_', ' ')} · {session.location ?? 'Location to be confirmed'}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {session.slots.map((slot) => {
              const full = slot.bookings.length >= slot.capacity;
              const selected = slot.id === bookedSlotId;
              return (
                <div key={slot.id} className="flex items-center justify-between bg-cream px-3 py-2">
                  <div>
                    <p className="text-sm">{formatDate(slot.startsAt)}</p>
                    <p className="text-xs text-slate-500">
                      {slot.bookings.length}/{slot.capacity} booked
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={selected ? 'secondary' : 'primary'}
                    disabled={full || Boolean(bookedSlotId) || busy === slot.id}
                    onClick={() => book(slot.id)}
                  >
                    {selected ? 'Booked' : full ? 'Full' : 'Book'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {sessions.length === 0 && <Alert tone="amber">No interview sessions have been published yet.</Alert>}
    </div>
  );
}
