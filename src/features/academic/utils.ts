import type { HomeworkDetail, HomeworkSummary } from '@/types/homework';
import type { ExamSummary } from '@/types/exam';

/** Exam states visible to parent/student (draft/archived hidden). */
export const VISIBLE_EXAM_STATES = new Set(['published', 'done', 'cancelled']);

export function isVisibleExam(exam: ExamSummary): boolean {
  return VISIBLE_EXAM_STATES.has(exam.state);
}

export function canSubmitHomework(hw: HomeworkSummary | HomeworkDetail): boolean {
  if (hw.state !== 'published') return false;
  if (!hw.require_submission) return false;
  return !hw.submitted;
}

export function formatScore(score: number, maxScore: number): string {
  if (score < 0) return '—';
  return `${score} / ${maxScore}`;
}

export function formatPercentage(pct: number): string {
  if (pct < 0) return '—';
  return `${pct}%`;
}
