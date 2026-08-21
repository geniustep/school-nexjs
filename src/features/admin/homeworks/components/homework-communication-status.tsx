'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, DefinitionList, InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  approveCommunicationContent,
  fetchCommunicationContentDetail,
  publishCommunicationContent,
  requestChangesCommunicationContent,
} from '@/features/communication/api/admin-communication-api';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { communicationStateMessageKey } from '@/features/communication/utils/communication-labels';
import { hasCommunicationRecordAction } from '@/lib/permissions/communication';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';
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
    reviewRequiredTitle: 'بانتظار اعتمادك',
    reviewRequiredDescription: 'الواجب منشور أكاديميًا، لكنه غير ظاهر لولي الأمر حتى اعتماد التواصل ونشره.',
    familyVisibleDescription: 'تم اعتماد التواصل ونشره، ويمكن لولي الأمر رؤية الواجب.',
    notStartedDescription: 'لا توجد عملية تواصل مرتبطة بهذا الواجب حتى الآن.',
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
    reviewRequiredTitle: 'Validation requise',
    reviewRequiredDescription: 'Le devoir est publié académiquement, mais reste invisible aux parents jusqu’à la validation et la publication de la communication.',
    familyVisibleDescription: 'La communication a été validée et publiée. Le devoir est visible pour le parent.',
    notStartedDescription: 'Aucune communication n’est encore liée à ce devoir.',
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
    reviewRequiredTitle: 'Approval required',
    reviewRequiredDescription: 'The homework is academically published, but remains hidden from parents until communication is approved and published.',
    familyVisibleDescription: 'Communication is approved and published. The homework is visible to the parent.',
    notStartedDescription: 'No communication workflow is linked to this homework yet.',
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
    reviewRequiredTitle: 'Aprobación requerida',
    reviewRequiredDescription: 'La tarea está publicada académicamente, pero permanece oculta para las familias hasta aprobar y publicar la comunicación.',
    familyVisibleDescription: 'La comunicación fue aprobada y publicada. La tarea es visible para la familia.',
    notStartedDescription: 'Todavía no hay un flujo de comunicación vinculado a esta tarea.',
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
  showActionLink = true,
}: {
  item: HomeworkCommunicationStatusLike;
  showActionLink?: boolean;
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

  const items: Array<{ label: string; value: ReactNode }> = [
    { label: copy.communicationState, value: communicationState },
    { label: copy.familyVisibility, value: familyVisibility },
    { label: copy.pendingApproval, value: pendingApproval },
  ];

  if (showActionLink) {
    items.push({
      label: t('common.actions'),
      value: item.communication_content_id ? (
        <Link href={`/admin/communication/${item.communication_content_id}`} className="link">
          {copy.openDetails}
        </Link>
      ) : (
        t('common.dash')
      ),
    });
  }

  return <DefinitionList items={items} />;
}

export function HomeworkCommunicationReviewPanel({
  item,
  onUpdated,
}: {
  item: HomeworkCommunicationStatusLike;
  onUpdated: () => void;
}) {
  const t = useT();
  const copy = useCopy();
  const toast = useToast();
  const presentation = resolveHomeworkCommunicationStatus(item);
  const contentId = item.communication_content_id ?? null;
  const [content, setContent] = useState<CommunicationContent | null>(null);
  const [loading, setLoading] = useState(Boolean(contentId));
  const [acting, setActing] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!contentId) {
      setContent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchCommunicationContentDetail(contentId);
    if (res.success) setContent(res.data);
    else setContent(null);
    setLoading(false);
  }, [contentId]);

  useEffect(() => {
    void load();
  }, [load]);

  function showActionError(error?: ApiErrorBody) {
    const key = communicationErrorMessageKey(error?.code);
    toast.error(key ? t(key) : t('channels.sendFailed'));
  }

  async function refreshAfterAction() {
    await load();
    onUpdated();
  }

  async function approveAndPublish() {
    if (!content || acting) return;
    setActing(true);
    const approved = await approveCommunicationContent(content.id);
    if (!approved.success) {
      setActing(false);
      showActionError(approved.error);
      await load();
      return;
    }
    const published = await publishCommunicationContent(content.id);
    setActing(false);
    if (!published.success) {
      showActionError(published.error);
      await refreshAfterAction();
      return;
    }
    toast.success(t('communication.actionSuccess'));
    setReason('');
    setShowReason(false);
    await refreshAfterAction();
  }

  async function publish() {
    if (!content || acting) return;
    setActing(true);
    const res = await publishCommunicationContent(content.id);
    setActing(false);
    if (!res.success) {
      showActionError(res.error);
      await load();
      return;
    }
    toast.success(t('communication.actionSuccess'));
    await refreshAfterAction();
  }

  async function requestChanges() {
    if (!content || acting || !reason.trim()) return;
    setActing(true);
    const res = await requestChangesCommunicationContent(content.id, reason.trim());
    setActing(false);
    if (!res.success) {
      showActionError(res.error);
      await load();
      return;
    }
    toast.success(t('communication.actionSuccess'));
    setReason('');
    setShowReason(false);
    await refreshAfterAction();
  }

  const actions = content?.allowed_actions ?? [];
  const canApprove = hasCommunicationRecordAction(actions, 'approve');
  const canPublish = hasCommunicationRecordAction(actions, 'publish');
  const canRequestChanges = hasCommunicationRecordAction(actions, 'request_changes');
  const hasReviewActions = canApprove || canPublish || canRequestChanges;

  const banner = presentation.kind === 'family-visible'
    ? {
        tone: 'green' as const,
        icon: '✓',
        title: copy.familyVisible,
        description: copy.familyVisibleDescription,
      }
    : presentation.kind === 'pending-approval'
      ? {
          tone: 'amber' as const,
          icon: '!',
          title: copy.reviewRequiredTitle,
          description: copy.reviewRequiredDescription,
        }
      : presentation.kind === 'not-started'
        ? {
            tone: 'blue' as const,
            icon: 'ℹ',
            title: copy.notStarted,
            description: copy.notStartedDescription,
          }
        : {
            tone: 'blue' as const,
            icon: 'ℹ',
            title: item.communication_state
              ? t(communicationStateMessageKey(item.communication_state))
              : copy.unavailable,
            description: undefined,
          };

  return (
    <Card>
      <InfoBanner
        tone={banner.tone}
        icon={banner.icon}
        title={banner.title}
        description={banner.description}
      />

      <div className="mt-4">
        <HomeworkCommunicationDetails item={item} showActionLink={false} />
      </div>

      {contentId ? (
        <div className="mt-4">
          {loading ? <p className="tiny muted">{t('common.loading')}</p> : null}

          {!loading && content ? (
            <>
              <div className="wrap-gap">
                {canApprove ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={acting}
                    onClick={() => void approveAndPublish()}
                  >
                    {acting
                      ? t('common.loading')
                      : `${t('communication.actions.approve')} + ${t('communication.actions.publish')}`}
                  </button>
                ) : canPublish ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={acting}
                    onClick={() => void publish()}
                  >
                    {acting ? t('common.loading') : t('communication.actions.publish')}
                  </button>
                ) : null}

                {canRequestChanges ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={acting}
                    onClick={() => setShowReason((current) => !current)}
                  >
                    {t('communication.actions.requestChanges')}
                  </button>
                ) : null}

                <Link href={`/admin/communication/${content.id}`} className="btn btn--ghost btn--sm">
                  {copy.openDetails}
                </Link>
              </div>

              {showReason && canRequestChanges ? (
                <div className="mt-4">
                  <label className="tiny" htmlFor={`homework-communication-reason-${content.id}`}>
                    {t('communication.changeRequestReason')}
                  </label>
                  <textarea
                    id={`homework-communication-reason-${content.id}`}
                    className="textarea mt-2"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t('communication.reasonPlaceholder')}
                  />
                  <div className="wrap-gap mt-2">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={acting || !reason.trim()}
                      onClick={() => void requestChanges()}
                    >
                      {acting ? t('common.loading') : t('communication.actions.requestChanges')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={acting}
                      onClick={() => {
                        setShowReason(false);
                        setReason('');
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}

              {!hasReviewActions && presentation.kind === 'pending-approval' ? (
                <p className="tiny muted mt-2">{copy.pending}</p>
              ) : null}
            </>
          ) : null}

          {!loading && !content ? (
            <div className="wrap-gap">
              <span className="tiny muted">{copy.unavailable}</span>
              <Link href={`/admin/communication/${contentId}`} className="link">
                {copy.openDetails}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
