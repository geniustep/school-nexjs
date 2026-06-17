'use client';

import { useT } from '@/features/i18n/locale-context';
import type { CollectionFormBlockerKey } from './collection-form-validation';

const BLOCKER_KEYS: Record<CollectionFormBlockerKey, string> = {
  selectStudent: 'admin.finance.collections.blockers.selectStudent',
  selectJournal: 'admin.finance.collections.blockers.selectJournal',
  selectAcademicYear: 'admin.finance.collections.blockers.selectAcademicYear',
  selectBillingPartner: 'admin.finance.collections.blockers.selectBillingPartner',
  billingPartnerUnavailable: 'admin.finance.collections.blockers.billingPartnerUnavailable',
  enterAmount: 'admin.finance.collections.blockers.enterAmount',
  selectPaymentMethod: 'admin.finance.collections.blockers.selectPaymentMethod',
  enterCollectionDate: 'admin.finance.collections.blockers.enterCollectionDate',
  completeChequeFields: 'admin.finance.collections.blockers.completeChequeFields',
  fixChequeDates: 'admin.finance.collections.blockers.fixChequeDates',
  allocateOrSkip: 'admin.finance.collections.blockers.allocateOrSkip',
  allocationTotalMismatch: 'admin.finance.collections.blockers.allocationTotalMismatch',
  unallocatedRemainder: 'admin.finance.collections.blockers.unallocatedRemainder',
  paymentReferenceRequired: 'admin.finance.collections.blockers.paymentReferenceRequired',
};

export function CollectionFormBlockers({ blockers }: { blockers: CollectionFormBlockerKey[] }) {
  const t = useT();
  if (!blockers.length) return null;
  return (
    <p className="collection-form-blockers collection-form-blockers--compact muted" role="status">
      {t('admin.finance.collectionWorkflow.completeRequiredFields')}
    </p>
  );
}
