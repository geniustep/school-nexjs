'use client';

import { useT } from '@/features/i18n/locale-context';
import type { CollectionFormBlockerKey } from './collection-form-validation';

const BLOCKER_KEYS: Record<CollectionFormBlockerKey, string> = {
  selectStudent: 'admin.finance.collections.blockers.selectStudent',
  selectJournal: 'admin.finance.collections.blockers.selectJournal',
  selectAcademicYear: 'admin.finance.collections.blockers.selectAcademicYear',
  selectBillingPartner: 'admin.finance.collections.blockers.selectBillingPartner',
  enterAmount: 'admin.finance.collections.blockers.enterAmount',
  selectPaymentMethod: 'admin.finance.collections.blockers.selectPaymentMethod',
  enterCollectionDate: 'admin.finance.collections.blockers.enterCollectionDate',
  completeChequeFields: 'admin.finance.collections.blockers.completeChequeFields',
  fixChequeDates: 'admin.finance.collections.blockers.fixChequeDates',
  allocateOrSkip: 'admin.finance.collections.blockers.allocateOrSkip',
};

export function CollectionFormBlockers({ blockers }: { blockers: CollectionFormBlockerKey[] }) {
  const t = useT();
  if (!blockers.length) return null;
  return (
    <div className="collection-form-blockers" role="status">
      <p className="collection-form-blockers__title">{t('admin.finance.collections.cannotSubmit')}</p>
      <ul>
        {blockers.map((key) => (
          <li key={key}>{t(BLOCKER_KEYS[key])}</li>
        ))}
      </ul>
    </div>
  );
}
