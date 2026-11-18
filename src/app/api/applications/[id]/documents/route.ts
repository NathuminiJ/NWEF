import { BadRequestError } from '@/lib/errors';
import { created, requireUser, route } from '@/lib/api';
import { documentMetaSchema } from '@/lib/validation';
import { uploadDocument } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new BadRequestError('Attach a file using the "file" field');

  const meta = documentMetaSchema.parse({
    type: form.get('type'),
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  const document = await uploadDocument(
    await requireUser(),
    id,
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size, buffer: Buffer.from(await file.arrayBuffer()) },
    { type: meta.type },
  );
  return created(document);
});
