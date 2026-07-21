'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import type { SubjectDetail } from '@/features/admin/entity-forms';
import { countSubjectsByName } from '@/features/admin/academic-setup/utils/subject-display';
import { canManageSubjects } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, Subject } from '@/types/class';
import { CreateSchoolSubjectForm } from './create-school-subject-form';
import {
  buildLevelsByIdFromLevels,
  buildSubjectRowMeta,
  inferSubjectTier,
  subjectLevelCodes,
  type SubjectTier,
} from '../utils/subjects-list-utils';
import '../admin-subjects.css';

const TIER_VISUAL: Record<SubjectTier, { icon: string; accent: string }> = {
  primary: { icon: '📗', accent: '#86efac' },
  middle: { icon: '📘', accent: '#93c5fd' },
  high: { icon: '🎓', accent: '#c4b5fd' },
  other: { icon: '📋', accent: '#cbd5e1' },
};

function tierTitle(tier: SubjectTier, t: ReturnType<typeof useT>): string {
  switch (tier) {
    case 'primary':
      return t('admin.subjectsList.tierPrimary');
    case 'middle':
      return t('admin.subjectsList.tierMiddle');
    case 'high':
      return t('admin.subjectsList.tierHigh');
    default:
      return t('admin.subjectsList.tierOther');
  }
}

function mergeSubject(detail: SubjectDetail, fromList?: Subject): Subject {
  return {
    id: detail.id,
    name: detail.name,
    code: detail.code ?? fromList?.code,
    level_id: fromList?.level_id,
    level_ids: detail.level_ids ?? fromList?.level_ids,
    track_id: fromList?.track_id,
    ref_subject_id: detail.ref_subject_id ?? fromList?.ref_subject_id,
    source: fromList?.source,
    required: fromList?.required,
    optional: fromList?.optional,
    sequence: detail.sequence ?? fromList?.sequence,
    weekly_hours: detail.weekly_hours ?? fromList?.weekly_hours,
    assessment_coefficient: detail.assessment_coefficient ?? fromList?.assessment_coefficient,
    legacy_coefficient: detail.legacy_coefficient ?? fromList?.legacy_coefficient,
    assignments_count: fromList?.assignments_count,
    active: fromList?.active,
  };
}

function DetailFact({
  label,
  value,
  dir,
  mono,
}: {
  label: string;
  value: string | number;
  dir?: 'ltr' | 'rtl';
  mono?: boolean;
}) {
  return (
    <div className="admin-subject-detail-fact">
      <span className="admin-subject-detail-fact__label">{label}</span>
      <span
        className={`admin-subject-detail-fact__value${mono ? ' mono' : ''}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

export function AdminSubjectDetailShell({ subjectId }: { subjectId: string }) {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const [editing, setEditing] = useState(false);
  const detailState = useAdminResource<SubjectDetail>(endpoints.admin.subject(subjectId));
  const listState = useAdminResource<Subject[]>(endpoints.admin.subjects);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);

  const canManage = canManageSubjects(user);
  const loading = detailState.loading || listState.loading;

  const view = useMemo(() => {
    const detail = detailState.data;
    if (!detail) return null;

    const fromList = listState.data?.find((item) => item.id === detail.id);
    const subject = mergeSubject(detail, fromList);
    const levelsById = buildLevelsByIdFromLevels(
      (levelsState.data ?? []).map((level) => ({ id: level.id, name: level.name, code: level.code })),
    );
    const nameCounts = countSubjectsByName(listState.data ?? [subject]);
    const meta = buildSubjectRowMeta(subject, levelsById, nameCounts, t);
    const tier = inferSubjectTier(subject, levelsById);
    const levelCodes = subjectLevelCodes(subject, levelsById);
    const sameNameCount = nameCounts.get(subject.name?.trim() ?? '') ?? 1;

    return {
      detail,
      subject,
      meta,
      tier,
      levelCodes,
      sameNameCount,
      visual: TIER_VISUAL[tier],
    };
  }, [detailState.data, listState.data, levelsState.data, t]);

  const combinedState = {
    ...detailState,
    loading,
    reload: () => {
      detailState.reload();
      listState.reload();
      levelsState.reload();
    },
  };

  return (
    <ResourceView state={combinedState} loadingLabel={t('common.loading')}>
      {() =>
        view ? (
          <div className="admin-subjects-detail-page">
            <header
              className="admin-subjects-detail-hero"
              style={{ '--detail-accent': view.visual.accent } as CSSProperties}
            >
              <div className="admin-subjects-detail-hero__glow" aria-hidden="true" />
              <div className="admin-subjects-detail-hero__content">
                <div className="admin-subjects-detail-hero__top">
                  <Link href="/admin/subjects" className="btn btn--ghost btn--sm admin-subjects-detail-hero__back">
                    {t('admin.subjectsList.detailBack')}
                  </Link>
                  {!editing && canManage && view.detail.status !== 'archived' ? (
                    <div className="admin-subjects-detail-hero__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditing(true)}
                      >
                        {t('common.edit')}
                      </button>
                      <ConfirmActionButton
                        label={t('admin.archive')}
                        confirmMessage={t('admin.confirmArchive')}
                        path={endpoints.admin.subjectArchive(view.detail.id)}
                        variant="danger"
                        onSuccess={() => router.push('/admin/subjects')}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="admin-subjects-detail-hero__main">
                  <span className="admin-subjects-detail-hero__icon" aria-hidden="true">
                    {view.visual.icon}
                  </span>
                  <div className="admin-subjects-detail-hero__identity">
                    <span className="admin-subjects-detail-hero__ref mono" dir="ltr">
                      #{view.detail.id}
                    </span>
                    <h1 className="admin-subjects-detail-hero__title">{view.meta.displayName}</h1>
                    <p className="admin-subjects-detail-hero__code mono" dir="ltr">
                      {view.subject.code?.trim() || t('common.dash')}
                    </p>
                    <div className="admin-subjects-detail-hero__badges">
                      <span className="admin-subjects-card__tier">{tierTitle(view.tier, t)}</span>
                      {view.meta.sourceLabel ? (
                        <span className="admin-subjects-detail-hero__badge">{view.meta.sourceLabel}</span>
                      ) : null}
                      <span className="admin-subjects-detail-hero__badge">
                        {view.detail.status ?? t('states.active')}
                      </span>
                    </div>
                  </div>
                </div>

                {view.meta.isDuplicateName ? (
                  <p className="admin-subjects-detail-hero__dup-banner" role="status">
                    {t('admin.subjectsList.detailDuplicateBanner', { count: view.sameNameCount })}
                  </p>
                ) : null}
              </div>
            </header>

            {editing ? (
              <section className="admin-subjects-detail-panel card">
                <CreateSchoolSubjectForm
                  embedded
                  levels={levelsState.data ?? []}
                  subject={{
                    id: view.detail.id,
                    name: view.detail.name,
                    code: view.detail.code ?? view.subject.code,
                    weekly_hours:
                      view.detail.weekly_hours ?? view.subject.weekly_hours ?? null,
                    assessment_coefficient:
                      view.detail.assessment_coefficient ??
                      view.subject.assessment_coefficient ??
                      null,
                    legacy_coefficient:
                      view.detail.legacy_coefficient ??
                      view.subject.legacy_coefficient ??
                      null,
                    level_ids: view.detail.level_ids ?? view.subject.level_ids ?? [],
                    ref_subject_id:
                      view.detail.ref_subject_id ?? view.subject.ref_subject_id ?? null,
                  }}
                  onSaved={() => {
                    setEditing(false);
                    combinedState.reload();
                  }}
                  onCancel={() => setEditing(false)}
                />
              </section>
            ) : (
              <>
                <section className="admin-subjects-detail-stats" aria-label={t('admin.subjectsList.detailStats')}>
                  <div className="admin-subjects-stat admin-subjects-stat--accent">
                    <span className="admin-subjects-stat__icon" aria-hidden="true">
                      #
                    </span>
                    <span className="admin-subjects-stat__value">{view.detail.sequence ?? t('common.dash')}</span>
                    <span className="admin-subjects-stat__label">{t('admin.subjectsList.detailSequence')}</span>
                  </div>
                  <div className="admin-subjects-stat">
                    <span className="admin-subjects-stat__icon" aria-hidden="true">
                      ⏱
                    </span>
                    <span className="admin-subjects-stat__value">{view.detail.credit_hours ?? t('common.dash')}</span>
                    <span className="admin-subjects-stat__label">{t('admin.subjectsList.detailCreditHours')}</span>
                  </div>
                  <div className="admin-subjects-stat">
                    <span className="admin-subjects-stat__icon" aria-hidden="true">
                      ×
                    </span>
                    <span className="admin-subjects-stat__value">
                      {view.detail.assessment_coefficient ??
                        view.detail.legacy_coefficient ??
                        t('common.dash')}
                    </span>
                    <span className="admin-subjects-stat__label">{t('academic.coefficient')}</span>
                  </div>
                  <div className="admin-subjects-stat">
                    <span className="admin-subjects-stat__icon" aria-hidden="true">
                      📅
                    </span>
                    <span className="admin-subjects-stat__value">
                      {view.subject.weekly_hours ?? t('common.dash')}
                    </span>
                    <span className="admin-subjects-stat__label">{t('admin.subjectsList.detailWeeklyHours')}</span>
                  </div>
                  <div className="admin-subjects-stat">
                    <span className="admin-subjects-stat__icon" aria-hidden="true">
                      👨‍🏫
                    </span>
                    <span className="admin-subjects-stat__value">
                      {view.subject.assignments_count ?? 0}
                    </span>
                    <span className="admin-subjects-stat__label">{t('admin.subjectsList.assignmentsCountLabel')}</span>
                  </div>
                </section>

                <div className="admin-subjects-detail-grid-layout">
                  <section className="admin-subjects-detail-panel card">
                    <h2 className="admin-subjects-detail-panel__title">{t('admin.subjectsList.detailIdentity')}</h2>
                    <div className="admin-subject-detail-facts">
                      <DetailFact label={t('admin.subjectName')} value={view.detail.name} />
                      <DetailFact
                        label={t('admin.code')}
                        value={view.subject.code?.trim() || t('common.dash')}
                        dir="ltr"
                        mono
                      />
                      <DetailFact
                        label={t('admin.subjectsList.detailReferenceId')}
                        value={`#${view.detail.id}`}
                        dir="ltr"
                        mono
                      />
                    </div>
                  </section>

                  <section className="admin-subjects-detail-panel card">
                    <h2 className="admin-subjects-detail-panel__title">{t('admin.subjectsList.detailAcademic')}</h2>
                    <div className="admin-subject-detail-facts">
                      <DetailFact
                        label={t('admin.subjectsList.tierLabel')}
                        value={tierTitle(view.tier, t)}
                      />
                      <DetailFact
                        label={t('admin.subjectsList.levelLabel')}
                        value={
                          view.meta.levelLabels.length
                            ? view.meta.levelLabels.join(' · ')
                            : t('common.dash')
                        }
                      />
                      <DetailFact
                        label={t('admin.subjectsList.detailLevelCodes')}
                        value={view.levelCodes.length ? view.levelCodes.join(' · ') : t('common.dash')}
                        dir="ltr"
                        mono
                      />
                      {view.meta.sourceLabel ? (
                        <DetailFact label={t('admin.subjectsList.detailSource')} value={view.meta.sourceLabel} />
                      ) : null}
                    </div>
                  </section>

                  <section className="admin-subjects-detail-panel card">
                    <h2 className="admin-subjects-detail-panel__title">{t('admin.subjectsList.detailSettings')}</h2>
                    <div className="admin-subject-detail-facts">
                      <DetailFact
                        label={t('admin.subjectsList.detailCategory')}
                        value={view.detail.category ?? t('common.dash')}
                      />
                      <DetailFact
                        label={t('admin.academicSetup.guided.badgeRequired')}
                        value={
                          view.subject.required
                            ? t('common.yes')
                            : view.subject.optional
                              ? t('admin.academicSetup.guided.badgeOptional')
                              : t('common.dash')
                        }
                      />
                      <DetailFact label={t('common.status')} value={view.detail.status ?? t('states.active')} />
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        ) : null
      }
    </ResourceView>
  );
}
