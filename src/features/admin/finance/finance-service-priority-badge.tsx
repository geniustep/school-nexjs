'use client';

import { Badge } from '@/components/ui/primitives';
import {
  collectionPriorityBadgeTone,
  collectionPriorityLabelKey,
} from '@/features/admin/finance/finance-service-priority';
import { useT } from '@/features/i18n/locale-context';

export function FinanceServicePriorityBadge({ level }: { level?: string | null }) {
  const t = useT();
  const key = collectionPriorityLabelKey(level);
  const label = t(key);
  const text = label === key ? level ?? t('admin.finance.services.priority.normal') : label;
  return <Badge tone={collectionPriorityBadgeTone(level)}>{text}</Badge>;
}
