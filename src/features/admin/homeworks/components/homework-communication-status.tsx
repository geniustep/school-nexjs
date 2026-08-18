'use client';

import Link from 'next/link';
import { Badge, DefinitionList } from '@/components/ui/primitives';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { communicationStateMessageKey } from '@/features/communication/utils/communication-labels';
import {
  hasHomeworkCommunicationContract,
  resolveHomeworkCommunicationStatus,
  type HomeworkCommunicationStatusLike,
} from '@/features/admin/homeworks/utils/homework-communication-status';

const COPY = {
  ar: {
    familyVisible: 'ظاهر لولي الأمر',
    pending: 'بانتظار اعتماد التواصل',
    notStarted: 'لم يبدأ التواصل بعد',
    unavailable: 'حالة التواصل غير متاحة',
    notFamilyVisible: 'غير ظاهر لولي الأمر',
    communicationState: 'حالة التواصل',
    familyVisibility: 'الظهور لولي الأمر',
    pendingApproval: 'بانتظار الاعتماد',
    openDetails: 'فتح تفاصيل التواصل',
  },
  fr: {
    familyVisible: 'Visible pour le parent',
    pending: 'En attente de validation de la communication',
    notStarted: 'Communication non démarrée',
    unavailable: 'État de communication indisponible',
    notFamilyVisible: 'Non visible pour le parent',
    communicationState: 'État de la communication',
    familyVisibility: 'Visibilité pour le parent',
    pendingApproval: 'En attente de validation',
    openDetails: 'Ouvrir les détails de communication',
  },
  en: {
    familyVisible: 'Visible to parent',
    pending: 'Awaiting communication approval',
    notStarted: 'Communication not started',
    unavailable: 'Communication status unavailable',
    notFamilyVisible: 'Not visible to parent',
    communicationState: 'Communication status',
    familyVisibility: 'Parent visibility',
    pendingApproval: 'Awaiting approval',
    openDetails: 'Open communication details',
  },
  es: {
    familyVisible: 'Visible para la familia',
    pending: 'Pendiente de aprobación de comunicación',
    notStarted: 'Comunicación no iniciada',
    unavailable: 'Estado de comunicación no disponible',
    notFamilyVisible: 'No visible para la familia',
    communicationState: 'Estado de comunicación',
    familyVisibility: 'Visibilidad para la familia',
    pendingApproval: 'Pendiente de aprobación',
    openDetails: 'Abrir detalles de comunicación',
  },
} as const;

function useCopy() {
  const { locale } = useLocale();
  return COPY[locale];
}

export function HomeworkFamilyAccessBadge({
  item,
}: {
  item: HomeworkCommunicationStatusLike;
}) {
  const t = useT();
  const copy = useCopy();
  const presentation = resolveHomeworkCommunicationStatus(item);

  let label: string;
  if (presentation.kind === 'family-visible') label = copy.familyVisible;
  else if (presentation.kind === 'pending-approval') label = copy.pending;
  else if (presentation.kind === 'not-started') label = copy.notStarted;
  else if (presentation.kind === 'unavailable') label = copy.unavailable;
  else label = t(communicationStateMessageKey(item.communication_state));

  return <Badge tone={presentation.tone}>{label}</Badge>;
}

export function HomeworkCommunicationDetails({
  item,
}: {
  item: HomeworkCommunicationStatusLike;
}) {
  const t = useT();
  const copy = useCopy();
  const contractAvailable = hasHomeworkCommunicationContract(item);
  const communicationState = !contractAvailable
    ? copy.unavailable
    : item.communication_state
      ? t(communicationStateMessageKey(item.communication_state))
      : copy.notStarted;
  const familyVisibility = !contractAvailable
    ? copy.unavailable
    : item.is_family_visible
      ? copy.familyVisible
      : copy.notFamilyVisible;
  const pendingApproval = !contractAvailable
    ? copy.unavailable
    : item.pending_approval
      ? copy.pending
      : t('common.no');

  return (
    <DefinitionList
      items={[
        { label: copy.communicationState, value: communicationState },
        { label: copy.familyVisibility, value: familyVisibility },
        { label: copy.pendingApproval, value: pendingApproval },
        {
          label: t('common.actions'),
          value: item.communication_content_id ? (
            <Link href={`/admin/communication/${item.communication_content_id}`} className="link">
              {copy.openDetails}
            </Link>
          ) : (
            t('common.dash')
          ),
        },
      ]}
    />
  );
}
