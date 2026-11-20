import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { generatePortalGuidePdf } from '@/lib/pdf';

export const runtime = 'nodejs';

/** Public, static PDF reference for the complete portal design and functionality. */
export const GET = route(async () => {
  const pdf = await generatePortalGuidePdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="NWEF-Portal-Guide.pdf"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
