import { created, ok, requireUser, route, jsonBody } from '@/lib/api';
import { interviewSessionSchema } from '@/lib/validation';
import { createInterviewSession, listInterviewSessions } from '@/services/interviews';

export const runtime = 'nodejs';

export const GET = route(async () => {
  await requireUser();
  return ok(await listInterviewSessions());
});

export const POST = route(async (request) => {
  const body = interviewSessionSchema.parse(await jsonBody(request));
  return created(await createInterviewSession(await requireUser(), body));
});
