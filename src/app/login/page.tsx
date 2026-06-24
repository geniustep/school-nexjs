import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeForUser } from '@/lib/routes/role-routes';
import { LoginForm } from '@/features/auth/login-form';
import { resolveLoginSchoolBranding } from '@/lib/public-school-branding/server';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // If there is already a valid session, skip the form.
  const user = await getCurrentUser();
  if (user) redirect(homeForUser(user));

  const branding = await resolveLoginSchoolBranding();

  return (
    <Suspense fallback={null}>
      <LoginForm branding={branding} />
    </Suspense>
  );
}
