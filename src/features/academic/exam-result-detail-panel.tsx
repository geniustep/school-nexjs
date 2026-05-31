'use client';

import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, DefinitionList } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatScore, formatPercentage } from '@/features/academic/utils';
import type { ExamResult } from '@/types/exam';

export function ExamResultDetailPanel({ result }: { result: ExamResult }) {
  const t = useT();
  const { formatDate } = useFormat();

  return (
    <Card>
      <DefinitionList
        items={[
          { label: t('academic.exam'), value: result.exam?.name ?? t('common.dash') },
          { label: t('academic.subject'), value: result.subject?.name ?? t('common.dash') },
          { label: t('academic.date'), value: formatDate(result.exam?.exam_date) },
          {
            label: t('academic.score'),
            value: formatScore(result.score, result.max_score),
          },
          { label: t('academic.percentage'), value: formatPercentage(result.percentage) },
          { label: t('academic.coefficient'), value: result.coefficient ?? t('common.dash') },
          { label: t('academic.grade'), value: result.grade_label ?? t('common.dash') },
          {
            label: t('academic.rankInClass'),
            value: result.rank_in_class ?? t('common.dash'),
          },
          { label: t('academic.status'), value: <WorkflowBadge state={result.state} /> },
          {
            label: t('academic.teacherComment'),
            value: result.teacher_comment ?? t('common.dash'),
          },
        ]}
      />
    </Card>
  );
}
