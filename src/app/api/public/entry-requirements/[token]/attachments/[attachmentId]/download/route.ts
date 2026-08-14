import { NextResponse } from 'next/server';

import { publicEntryRequirementAttachmentUrl } from '@/features/entry-requirements/public-entry-requirements-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; attachmentId: string }> },
) {
  const { token, attachmentId } = await params;
  const id = Number(attachmentId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const url = await publicEntryRequirementAttachmentUrl(token, id);
  if (!url) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!upstream.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers });
}
