'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  applicationStatusLabelKey,
  applicationStatusTone,
  resolveApplicationStatus,
} from '../utils/admission-modern-status';

export function AdmissionModernStatusBadge({
  record,
}: {
  record: { application_status?: unknown };
}) {
  const t = useT();
  const status = resolveApplicationStatus(record);
  if (!status) return null;
  return <Badge tone={applicationStatusTone(status)}>{t(applicationStatusLabelKey(status))}</Badge>;
}
