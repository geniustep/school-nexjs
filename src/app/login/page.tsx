import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeForRole } from '@/lib/routes/role-routes';
import { LoginForm } from '@/features/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // If there is already a valid session, skip the form.
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
