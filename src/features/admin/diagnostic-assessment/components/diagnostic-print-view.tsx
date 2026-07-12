/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import type { DiagnosticPrintPayload } from '@/types/diagnostic-assessment';
import { fetchDiagnosticPrint, type DiagnosticWorkspaceApiRole } from '../api/diagnostic-assessment-api';
import { formatAverageScore, formatCompletionPercent } from '../utils/diagnostic-list-present';
import '../diagnostic-assessment-workspace.css';

export function DiagnosticPrintView({
  assessmentId,
  role = 'admin',
}: {
  assessmentId: string;
  role?: DiagnosticWorkspaceApiRole;
}) {
  const t = useT();
  const listHref =
    role === 'teacher'
      ? '/teacher/assessment/diagnostic'
      : '/admin/academics/assessment/diagnostic';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DiagnosticPrintPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDiagnosticPrint({ role, id: assessmentId })
      .then((res) => {
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(res.success ? t('admin.diagnosticAssessment.print.failed') : res.error.message);
          setPayload(null);
          return;
        }
        setPayload(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentId, role, t]);

  if (loading) return <LoadingState label={t('common.loading')} />;
  if (error || !payload) {
    return (
      <EmptyState
        icon="🖨️"
        title={t('admin.diagnosticAssessment.print.failed')}
        description={error ?? undefined}
        action={
          <Link href={`${listHref}/${assessmentId}`} className="btn btn--ghost btn--sm">
            {t('common.back')}
          </Link>
        }
      />
    );
  }

  const { assessment, summary, lines, score_scale } = payload;

  return (
    <div className="diagnostic-print">
      <div className="diagnostic-print-toolbar no-print">
        <Link href={`${listHref}/${assessmentId}`} className="btn btn--ghost btn--sm">
          {t('common.back')}
        </Link>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>
          {t('admin.diagnosticAssessment.print.action')}
        </button>
      </div>

      <div className="diagnostic-print__sheet">
        <h1 className="diagnostic-print__title">{assessment.title}</h1>
        <p>{t('admin.diagnosticAssessment.print.subtitle')}</p>

        <div className="diagnostic-print__meta">
          <div>
            <strong>{t('nav.classes')}:</strong> {assessment.class?.name ?? '—'}
          </div>
          <div>
            <strong>{t('nav.subjects')}:</strong> {assessment.subject?.name ?? '—'}
          </div>
          <div>
            <strong>{t('nav.teachers')}:</strong> {assessment.teacher?.name ?? '—'}
          </div>
          <div>
            <strong>{t('admin.diagnosticAssessment.assessmentDate')}:</strong>{' '}
            {assessment.assessment_date ?? '—'}
          </div>
          <div>
            <strong>{t('admin.diagnosticAssessment.stats.completion')}:</strong>{' '}
            {formatCompletionPercent(summary.completion_percent)}
          </div>
          <div>
            <strong>{t('admin.diagnosticAssessment.stats.average')}:</strong>{' '}
            {formatAverageScore(summary.average_score)}
          </div>
        </div>

        <table className="diagnostic-print__table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('admin.diagnosticAssessment.grid.student')}</th>
              <th>{t('admin.diagnosticAssessment.grid.score')}</th>
              <th>{t('admin.diagnosticAssessment.grid.phrase')}</th>
              <th>{t('admin.diagnosticAssessment.grid.participation')}</th>
              <th>{t('admin.diagnosticAssessment.grid.note')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.roster_sequence}-${line.student_name}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  {line.student_name}
                  {line.student_code ? ` (${line.student_code})` : ''}
                </td>
                <td>{line.score ?? '—'}</td>
                <td>{line.phrase ?? '—'}</td>
                <td>
                  {t(`admin.diagnosticAssessment.participation.${line.participation_state}`)}
                </td>
                <td>{line.teacher_note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="diagnostic-print__legend">
          {score_scale.map((item) => (
            <div key={item.score}>
              <strong>{item.score}</strong> — {item.phrase}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
