'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FamilyCollectionDrawer } from '@/features/admin/finance/family-collection-drawer';
import { StudentPaymentFamilyChoiceDialog } from '@/features/admin/finance/student-payment-family-choice-dialog';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentDetailsData } from '@/types/student-360';
import type { CollectionUpdatedOverview, StudentFinancialOverview } from '@/types/student-financial-overview';
import { useStudentFamilyFinanceSummary } from '../hooks/use-student-family-finance';
import {
  resolveStudentFamilyPaymentChoice,
  type StudentFamilyPaymentChoice,
} from '../utils/resolve-student-family-payment-choice';

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
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false);
  const [familyDrawerOpen, setFamilyDrawerOpen] = useState(false);
  const [familyContext, setFamilyContext] = useState<{
    familyId: number;
    accountName: string | null;
  } | null>(null);
  const resolvedForOpenRef = useRef(false);

  const { data: familySummary, loading: familySummaryLoading } = useStudentFamilyFinanceSummary(
    studentId,
    open,
  );

  const paymentChoiceContext = useMemo(
    () =>
      resolveStudentFamilyPaymentChoice({
        summary: familySummary,
        fallbackFamilyId: billingPartnerId ?? financialOverview?.billing_profile?.billing_partner_id,
      }),
    [familySummary, billingPartnerId, financialOverview?.billing_profile?.billing_partner_id],
  );

  const resetEntry = useCallback(() => {
    setChoiceDialogOpen(false);
    setStudentDrawerOpen(false);
    setFamilyDrawerOpen(false);
    setFamilyContext(null);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      resolvedForOpenRef.current = false;
      setChoiceDialogOpen(false);
      setStudentDrawerOpen(false);
      setFamilyDrawerOpen(false);
      setFamilyContext(null);
      return;
    }

    if (resolvedForOpenRef.current) return;
    if (familySummaryLoading && !familySummary) return;

    resolvedForOpenRef.current = true;

    if (paymentChoiceContext.shouldPrompt && paymentChoiceContext.familyId != null) {
      setFamilyContext({
        familyId: paymentChoiceContext.familyId,
        accountName: paymentChoiceContext.accountName,
      });
      setChoiceDialogOpen(true);
      setStudentDrawerOpen(false);
      setFamilyDrawerOpen(false);
      return;
    }

    setChoiceDialogOpen(false);
    setFamilyContext(null);
    setStudentDrawerOpen(true);
    setFamilyDrawerOpen(false);
  }, [open, paymentChoiceContext, familySummary, familySummaryLoading]);

  function handleChoiceContinue(choice: StudentFamilyPaymentChoice) {
    setChoiceDialogOpen(false);
    if (choice === 'family' && familyContext) {
      setFamilyDrawerOpen(true);
      setStudentDrawerOpen(false);
      return;
    }
    setStudentDrawerOpen(true);
    setFamilyDrawerOpen(false);
  }

  function handleChoiceClose() {
    resetEntry();
  }

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
      <StudentPaymentFamilyChoiceDialog
        open={choiceDialogOpen}
        onContinue={handleChoiceContinue}
        onClose={handleChoiceClose}
      />
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
          onClose={handleFamilyDrawerClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </>
  );
}
