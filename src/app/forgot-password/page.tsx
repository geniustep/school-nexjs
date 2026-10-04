import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PasswordRecoveryForm } from '@/features/auth/password-recovery-form';
import { getCurrentUser } from '@/lib/api/server';
import { homeForUser } from '@/lib/routes/role-routes';
import { resolveLoginSchoolBranding } from '@/lib/public-school-branding/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'استرجاع كلمة المرور | رقيم' };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForUser(user));

  const branding = await resolveLoginSchoolBranding();
  return (
    <Suspense fallback={null}>
      <PasswordRecoveryForm branding={branding} />
    </Suspense>
  );
}
