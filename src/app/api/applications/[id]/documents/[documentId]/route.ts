import { noContent, requireUser, route } from '@/lib/api';
import { deleteDocument } from '@/services/applications';

export const runtime = 'nodejs';

export const DELETE = route(async (_request, context) => {
  const { id, documentId } = await context.params;
  await deleteDocument(await requireUser(), id, documentId);
  return noContent();
});
