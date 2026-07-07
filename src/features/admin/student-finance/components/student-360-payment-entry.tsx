'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FamilyCollectionDrawer } from '@/features/admin/finance/family-collection-drawer';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentDetailsData } from '@/types/student-360';
import type { CollectionUpdatedOverview, StudentFinancialOverview } from '@/types/student-financial-overview';
import { useStudentFamilyFinanceSummary } from '../hooks/use-student-family-finance';
import { resolveStudentFamilyPaymentChoice } from '../utils/resolve-student-family-payment-choice';
import { resolveStudent360PaymentEntryRoute } from '../utils/resolve-student-360-payment-entry-route';

export function Student360PaymentEntry({
  open,
  studentId,
  details,
  academicYearId,
  billingProfileId,
  billingPartnerId,
  financialOverview,
  onOpenChange,
  onSuccess,
  onOverviewUpdate,
}: {
  open: boolean;
  studentId: number;
  details: StudentDetailsData;
  academicYearId?: number;
  billingProfileId?: number;
  billingPartnerId?: number | null;
  financialOverview?: StudentFinancialOverview | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onOverviewUpdate?: (overview: CollectionUpdatedOverview) => void;
}) {
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false);
  const [familyDrawerOpen, setFamilyDrawerOpen] = useState(false);
  const [familyContext, setFamilyContext] = useState<{
    familyId: number;
    accountName: string | null;
    studentId: number;
    studentName: string;
  } | null>(null);
  const resolvedForOpenRef = useRef(false);

  const { data: familySummary, loading: familySummaryLoading } = useStudentFamilyFinanceSummary(
    studentId,
    open,
  );
  const familyFetchStartedRef = useRef(false);

  const paymentChoiceContext = useMemo(
    () =>
      resolveStudentFamilyPaymentChoice({
        summary: familySummary,
        fallbackFamilyId: billingPartnerId ?? financialOverview?.billing_profile?.billing_partner_id,
      }),
    [familySummary, billingPartnerId, financialOverview?.billing_profile?.billing_partner_id],
  );

  const entryRoute = useMemo(
    () => resolveStudent360PaymentEntryRoute(paymentChoiceContext, studentId),
    [paymentChoiceContext, studentId],
  );

  const resetEntry = useCallback(() => {
    setStudentDrawerOpen(false);
    setFamilyDrawerOpen(false);
    setFamilyContext(null);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      resolvedForOpenRef.current = false;
      familyFetchStartedRef.current = false;
      setStudentDrawerOpen(false);
      setFamilyDrawerOpen(false);
      setFamilyContext(null);
      return;
    }

    if (resolvedForOpenRef.current) return;
    if (familySummaryLoading) {
      familyFetchStartedRef.current = true;
      return;
    }
    if (!familyFetchStartedRef.current) return;

    resolvedForOpenRef.current = true;

    if (entryRoute.kind === 'family') {
      setFamilyContext({
        familyId: entryRoute.familyId,
        accountName: entryRoute.accountName,
        studentId: entryRoute.studentId,
        studentName: getStudentDisplayName(details.student),
      });
      setFamilyDrawerOpen(true);
      setStudentDrawerOpen(false);
      return;
    }

    setFamilyContext(null);
    setStudentDrawerOpen(true);
    setFamilyDrawerOpen(false);
  }, [open, entryRoute, familySummary, familySummaryLoading, details.student]);

  function handleStudentDrawerClose() {
    setStudentDrawerOpen(false);
    resetEntry();
  }

  function handleFamilyDrawerClose() {
    setFamilyDrawerOpen(false);
    resetEntry();
  }

  const studentName = getStudentDisplayName(details.student);
  const studentCode = details.student.code ?? details.student.school_number ?? undefined;

  return (
    <>
      <StudentCollectionDrawer
        open={studentDrawerOpen}
        studentId={studentId}
        studentName={studentName}
        studentCode={studentCode}
        academicYearId={academicYearId}
        billingProfileId={billingProfileId}
        billingPartnerId={billingPartnerId ?? undefined}
        financialOverview={financialOverview}
        onClose={handleStudentDrawerClose}
        onSuccess={onSuccess}
        onOverviewUpdate={onOverviewUpdate}
      />
      {familyContext ? (
        <FamilyCollectionDrawer
          open={familyDrawerOpen}
          familyId={familyContext.familyId}
          accountName={familyContext.accountName ?? undefined}
          prefilledStudentId={familyContext.studentId}
          prefilledStudentName={familyContext.studentName}
          entrySource="student360"
          onClose={handleFamilyDrawerClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </>
  );
}
