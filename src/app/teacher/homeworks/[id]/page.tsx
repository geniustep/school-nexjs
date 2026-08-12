'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { SmartLinkCards } from '@/components/attachments/smart-link-cards';
import '@/features/attachments/secure-materials/secure-materials.css';
import { TeacherHomeworkAttachmentsUpload } from '@/features/teacher/teacher-homework-attachments-upload';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, DefinitionList, InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { stripHtml } from '@/lib/utils/format';
import type { HomeworkDetail } from '@/types/homework';

export default function HomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const toast = useToast();
  const [acting, setActing] = useState(false);
  const state = useResource<HomeworkDetail>(endpoints.teacher.homework(id));

  async function publish() {
    setActing(true);
    const res = await api.post(endpoints.teacher.homeworkPublish(id));
    setActing(false);
    if (res.success) {
      toast.success(t('academic.publishSuccess'));
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  async function closeHw() {
    setActing(true);
    const res = await api.post(endpoints.teacher.homeworkClose(id));
    setActing(false);
    if (res.success) {
      toast.success(t('academic.closeSuccess'));
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  return (
    <>
      <Link
        href={
          state.data?.class?.id
            ? `/teacher/classes/${state.data.class.id}/homeworks`
            : '/teacher/classes'
        }
        className="back-link"
      >
        ‹ {t('academic.backToHomework')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(hw) => (
          <>
            <PageHeader
              title={hw.name}
              subtitle={hw.class?.name}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  {hw.state === 'draft' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={acting}
                      onClick={publish}
                    >
                      {t('academic.publishHomework')}
                    </button>
                  )}
                  {hw.state === 'published' && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={acting}
                      onClick={closeHw}
                    >
                      {t('academic.closeHomework')}
                    </button>
                  )}
                  <Link
                    className="btn btn--ghost btn--sm"
                    href={`/teacher/homeworks/${id}/submissions`}
                  >
                    {t('academic.viewSubmissions')}
                  </Link>
                </div>
              }
            />

            <Card>
              <DefinitionList
                items={[
                  { label: t('academic.status'), value: <WorkflowBadge state={hw.state} /> },
                  { label: t('academic.subject'), value: hw.subject?.name },
                  { label: t('academic.publishDate'), value: formatDate(hw.publish_date) },
                  {
                    label: t('academic.deadline'),
                    value: hw.deadline ? formatDate(hw.deadline) : t('common.dash'),
                  },
                  {
                    label: t('academic.requiresSubmission'),
                    value: hw.require_submission ? t('common.yes') : t('common.no'),
                  },
                ]}
              />
              {hw.description && (
                <div className="mt-2">
                  <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('academic.description')}</h3>
                  <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {stripHtml(hw.description)}
                  </p>
                </div>
              )}
            </Card>

            <div className="section">
              <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('teacher.homeworkAttachments')}</h2>
              <Card>
                {hw.attachments && hw.attachments.length > 0 ? (
              <AttachmentList
                attachments={hw.attachments}
                manageRole="teacher"
                onChanged={() => state.reload()}
              />
                ) : (
                  <p className="tiny muted">{t('teacher.noAttachmentsYet')}</p>
                )}
                {hw.state !== 'closed' && (
                  <TeacherHomeworkAttachmentsUpload
                    homeworkId={hw.id}
                    existingCount={hw.attachments?.length ?? 0}
                    onUploaded={() => state.reload()}
                  />
                )}
              </Card>
            </div>
            {hw.links?.length ? <div className="section"><h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('secureMaterials.title')}</h2><Card><SmartLinkCards links={hw.links} /></Card></div> : null}

            {hw.state === 'closed' && (
              <InfoBanner
                tone="amber"
                title={t('academic.homeworkClosed')}
                description={t('academic.homeworkClosedDesc')}
              />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
