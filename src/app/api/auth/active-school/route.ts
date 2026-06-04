import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';
import { isActiveSchoolAllowed, setActiveSchoolCookieValue } from '@/lib/auth/active-school';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'forbidden', message: 'Admin session required.', details: {} },
        meta: {},
      },
      { status: 403 },
    );
  }

  let payload: { school_id?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'validation_error', message: 'Invalid request body.', details: {} },
        meta: {},
      },
      { status: 422 },
    );
  }

  const schoolId = Number(payload.school_id);
  if (!Number.isFinite(schoolId) || schoolId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'validation_error', message: 'school_id is required.', details: {} },
        meta: {},
      },
      { status: 422 },
    );
  }

  if (!isActiveSchoolAllowed(user, schoolId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'forbidden',
          message: 'You do not have access to this school.',
          details: {},
        },
        meta: {},
      },
      { status: 403 },
    );
  }

  await setActiveSchoolCookieValue(schoolId);

  return NextResponse.json({
    success: true,
    data: { active_school_id: schoolId },
    meta: {},
  });
}
