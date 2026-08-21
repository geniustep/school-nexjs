import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountActivationForm } from '@/features/auth/account-activation-form';
import { resolveLoginSchoolBranding } from '@/lib/public-school-branding/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'تفعيل الحساب | رقيم' };

export default async function ActivatePage() {
  const branding = await resolveLoginSchoolBranding();
  return (
    <Suspense fallback={null}>
      <AccountActivationForm branding={branding} />
    </Suspense>
  );
}
