'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Field } from '@/components/ui';
import { apiFetch } from '@/lib/client';
import { ALLOWED_DOCUMENTS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export function DocumentUploader({
  applicationId,
  stream,
  documents,
  disabled = false,
  onChange,
}: {
  applicationId: string;
  stream: 'OLD_TINITIAN_SUPPORT' | 'SPORTS_SCHOLARSHIP';
  documents: DocumentItem[];
  disabled?: boolean;
  onChange?: () => void;
}) {
  const [type, setType] = useState<string>(ALLOWED_DOCUMENTS[stream][0]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('type', type);
      form.set('file', file);
      await apiFetch(`/api/applications/${applicationId}/documents`, { method: 'POST', body: form });
      setFile(null);
      onChange?.();
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="red">{error}</Alert>}
      {!disabled && (
        <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
          <Field label="Document type">
            <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
              {ALLOWED_DOCUMENTS[stream].map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="File (PDF, JPG or PNG, max 10MB)">
            <input
              className="input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Button type="button" onClick={upload} disabled={!file || busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between border border-line px-3 py-2">
            <div>
              <p className="text-sm font-medium">{document.fileName}</p>
              <p className="text-xs text-muted">
                {document.type.replaceAll('_', ' ')} · {(document.sizeBytes / 1024).toFixed(0)} KB · {formatDate(document.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="green">Uploaded</Badge>
              {!disabled && (
                <a className="text-sm text-brand hover:underline" href={`/api/documents/${document.id}`}>
                  View
                </a>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}
