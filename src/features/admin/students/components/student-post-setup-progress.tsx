'use client';

import { useSearchParams } from 'next/navigation';
import { Badge, Card, type Tone } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import { useStudentPostSetupStatus } from '../hooks/use-student-post-setup-status';
import {
  hasPostSetupReview,
  isPostSetupComplete,
  readBackendPostSetupProgress,
} from '../utils/student-post-setup';
import { getStudentPostSetupCopy } from '../utils/student-post-setup-copy';
import './student-post-setup-progress.css';

function statusTone(status: string): Tone {
  if (status === 'completed') return 'green';
  if (status === 'failed') return 'red';
  if (status === 'warning' || status === 'ambiguous' || status === 'unavailable') return 'amber';
  if (status === 'pending') return 'blue';
  return 'slate';
}

export function StudentPostSetupProgress({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = getStudentPostSetupCopy(locale);
  const enabled = searchParams.get('postSetup') === '1';
  const state = useStudentPostSetupStatus(studentId, enabled);

  if (!enabled) return null;

  const progress = readBackendPostSetupProgress(state.data);
  const complete = isPostSetupComplete(state.data);
  const review = hasPostSetupReview(state.data);
  const steps = state.data?.steps ?? [];
  const title = complete
    ? review
      ? copy.reviewTitle
      : copy.completeTitle
    : copy.inProgressTitle;
  const percent = progress ? Math.max(0, Math.min(100, progress.percent)) : 0;

  return (
    <Card className="student-post-setup-progress">
      <div className="student-post-setup-progress__head">
        <div>
          <strong>{title}</strong>
          <p className="muted">{copy.description}</p>
        </div>
        {progress ? (
          <Badge tone={complete ? (review ? 'amber' : 'green') : 'blue'}>
            <bdi dir="ltr">{progress.completed_steps}/{progress.total_steps}</bdi>
          </Badge>
        ) : null}
      </div>

      {progress ? (
        <div
          className="student-post-setup-progress__bar"
          role="progressbar"
          aria-label={copy.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="student-post-setup-progress__bar-fill"
            style={{ inlineSize: `${percent}%` }}
          />
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="student-post-setup-progress__steps">
          {steps.map((step) => (
            <div className="student-post-setup-progress__step" key={step.key}>
              <span>{copy.stepLabels[step.key] ?? copy.unknownStep}</span>
              <Badge tone={statusTone(step.status)}>
                {copy.statusLabels[step.status] ?? copy.checking}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{state.error ? copy.loadFailed : copy.checking}</p>
      )}

      {state.timedOut ? <p className="muted">{copy.stillWorking}</p> : null}
      {(state.error || state.timedOut) ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={state.reload}>
          {copy.retry}
        </button>
      ) : null}
    </Card>
  );
}
