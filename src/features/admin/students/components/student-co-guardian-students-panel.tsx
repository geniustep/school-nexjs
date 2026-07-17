'use client';

import { useT } from '@/features/i18n/locale-context';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { useStudentCoGuardianStudents } from '../hooks/use-student-co-guardian-students';
import { resolveCoGuardianCandidateBadges } from '../utils/co-guardian-candidate-display';
import type { CoGuardianCandidate } from '@/types/student-co-guardian';

const STATUS_LABEL_KEYS = new Set([
  'active',
  'inactive',
  'archived',
  'graduated',
  'transferred',
  'expelled',
  'suspended',
  'withdrawn',
  'prospective',
  'draft',
]);

/** Resolve a status label without ever leaking a raw i18n key. */
function statusLabel(t: TranslateFn, status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;
  if (STATUS_LABEL_KEYS.has(normalized)) {
    return t(`admin.student360.coGuardian.status.${normalized}`);
  }
  return null;
}

function CandidateRow({
  candidate,
  t,
}: {
  candidate: CoGuardianCandidate;
  t: TranslateFn;
}) {
  const badges = resolveCoGuardianCandidateBadges(candidate);
  const name = candidate.display_name?.trim() || t('admin.student360.coGuardian.unnamedStudent');
  const level = candidate.level_name?.trim() || null;
  const cls = candidate.class_name?.trim() || null;
  const status = statusLabel(t, candidate.status);
  const sharedNames = candidate.shared_guardian_names.filter((n) => n.trim());
  const sharedCount = candidate.shared_guardian_ids.length;

  const metaParts = [level, cls, status].filter(Boolean) as string[];

  return (
    <li className="student-co-guardian-panel__row">
      <div className="student-co-guardian-panel__row-main">
        <span className="student-co-guardian-panel__name" dir="auto">
          {name}
        </span>
        {metaParts.length > 0 ? (
          <span className="student-co-guardian-panel__meta" dir="auto">
            {metaParts.join(' · ')}
          </span>
        ) : null}
        {sharedNames.length > 0 ? (
          <span className="student-co-guardian-panel__shared" dir="auto">
            {t('admin.student360.coGuardian.sharedGuardiansNames', {
              names: sharedNames.join('، '),
            })}
          </span>
        ) : sharedCount > 0 ? (
          <span className="student-co-guardian-panel__shared" dir="auto">
            {t('admin.student360.coGuardian.sharedGuardiansCount', { count: sharedCount })}
          </span>
        ) : null}
      </div>
      <div className="student-co-guardian-panel__badges">
        <span className="student-co-guardian-panel__badge student-co-guardian-panel__badge--same">
          {t(badges.primaryKey)}
        </span>
        {badges.siblingKey ? (
          <span className="student-co-guardian-panel__badge student-co-guardian-panel__badge--sibling">
            {t(badges.siblingKey)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function StudentCoGuardianStudentsPanel({
  studentId,
  enabled = true,
}: {
  studentId: string | number;
  enabled?: boolean;
}) {
  const t = useT();
  const { loading, data, failed } = useStudentCoGuardianStudents(studentId, enabled);

  // Never break Student 360: on failure, hide the panel entirely.
  if (failed) return null;

  return (
    <section
      className="student-co-guardian-panel"
      aria-labelledby="student-co-guardian-panel-title"
    >
      <header className="student-co-guardian-panel__head">
        <h3 id="student-co-guardian-panel-title" className="student-co-guardian-panel__title">
          {t('admin.student360.coGuardian.title')}
        </h3>
        {data && data.summary.candidate_count > 0 ? (
          <span className="student-co-guardian-panel__count">
            {t('admin.student360.coGuardian.candidateCount', {
              count: data.summary.candidate_count,
            })}
          </span>
        ) : null}
      </header>

      <div className="student-co-guardian-panel__body">
        {loading && !data ? (
          <p className="student-co-guardian-panel__empty">{t('common.loading')}</p>
        ) : !data ? null : data.summary.guardian_count === 0 ? (
          <p className="student-co-guardian-panel__empty">
            {t('admin.student360.coGuardian.emptyNoGuardian')}
          </p>
        ) : data.summary.candidate_count === 0 ? (
          <p className="student-co-guardian-panel__empty">
            {t('admin.student360.coGuardian.emptyNoCandidates')}
          </p>
        ) : (
          <>
            <ul className="student-co-guardian-panel__list">
              {data.candidates.map((candidate) => (
                <CandidateRow key={candidate.student_id} candidate={candidate} t={t} />
              ))}
            </ul>
            <p className="student-co-guardian-panel__disclaimer">
              {t('admin.student360.coGuardian.disclaimer')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
