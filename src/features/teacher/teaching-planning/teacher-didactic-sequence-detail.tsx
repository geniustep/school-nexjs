'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Teacher read-only Didactic Sequence detail. Session rows are TEMPLATES (the
 * plan), not scheduled sessions and not a Jathatha. No mutations.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { normalizeDidacticSequenceDetail } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { sessionTypeLabelKey } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function TeacherDidacticSequenceDetail({ id }: { id: string }) {
  const t = useT();
  const state = useResource(endpoints.teacher.didacticSequence(id));
  const sequence = useMemo(
    () => (state.data ? normalizeDidacticSequenceDetail(state.data) : null),
    [state.data],
  );

  return (
    <div className="admin-workspace">
      <ResourceView
        state={{ ...state, data: sequence }}
        loadingLabel={t('common.loading')}
        teacherWorkspace
      >
        {(detail) => (
          <div className="teaching-planning-page">
            <PageHeader
              title={detail.name}
              subtitle={t('admin.teachingPlanning.sequences.detailSubtitle', {
                level: detail.level.name,
                subject: detail.subject.name,
              })}
            />
            <div className="teaching-planning-page__actions" style={{ marginBottom: '1rem' }}>
              <WorkflowBadge state={detail.state} />
              <Badge tone="blue">
                {t('admin.teachingPlanning.sequences.expectedTotalBadge', {
                  count: detail.expected_session_count,
                })}
              </Badge>
            </div>

            <Card>
              <SectionHead title={t('admin.teachingPlanning.sequences.sections.overview')} />
              <dl className="teaching-planning-page__meta-grid">
                <div>
                  <dt>{t('admin.teachingPlanning.sequences.fields.unit')}</dt>
                  <dd dir="auto">{detail.unit || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.teachingPlanning.sequences.fields.lesson')}</dt>
                  <dd dir="auto">{detail.lesson || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.teachingPlanning.sequences.fields.objectives')}</dt>
                  <dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                    {detail.objectives || t('common.dash')}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.teachingPlanning.fields.reference')}</dt>
                  <dd dir="auto">{detail.reference?.name || t('common.dash')}</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <SectionHead title={t('admin.teachingPlanning.sequences.templates.title')} />
              <p className="muted tiny">
                {t('admin.teachingPlanning.sequences.templates.readHint')}
              </p>
              <ol className="tp-templates__read">
                {detail.session_templates.map((tpl) => (
                  <li key={tpl.id ?? tpl.order} className="tp-templates__read-item">
                    <div className="tp-templates__read-head">
                      <span className="tp-templates__order">
                        <bdi dir="ltr">{tpl.order}</bdi>
                      </span>
                      <strong dir="auto">{tpl.name}</strong>
                      <Badge tone="slate">{t(sessionTypeLabelKey(tpl.session_type))}</Badge>
                      <Badge tone="blue">
                        <bdi dir="ltr">{tpl.expected_session_count}</bdi>{' '}
                        {t('admin.teachingPlanning.sequences.templates.sessionsShort')}
                      </Badge>
                    </div>
                    {tpl.objective ? (
                      <p className="muted tiny" dir="auto">
                        {tpl.objective}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </ResourceView>
    </div>
  );
}
