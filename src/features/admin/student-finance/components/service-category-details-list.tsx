'use client';

import { useT } from '@/features/i18n/locale-context';
import type { ServiceCategoryDetailItem } from '../utils/service-category-details';

export function ServiceCategoryDetailsList({ items }: { items: ServiceCategoryDetailItem[] }) {
  const t = useT();
  if (!items.length) return null;

  return (
    <ul className="student-finance-service-details tiny">
      {items.map((item) => (
        <li key={item.key}>
          <span className="student-finance-service-details__label">
            {t(`admin.student360.financeOps.serviceDetails.${item.key}`)}
          </span>
          <span className="student-finance-service-details__value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
