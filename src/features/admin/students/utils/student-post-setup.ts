export type StudentPostSetupProgress = {
  completed_steps: number;
  total_steps: number;
  percent: number;
};

export type StudentPostSetupStep = {
  key: string;
  status: string;
  processed: boolean;
};

export type StudentPostSetupStatus = {
  id?: number;
  state?: string;
  class_status?: string;
  account_status?: string;
  finance_status?: string;
  steps?: StudentPostSetupStep[];
  progress?: StudentPostSetupProgress;
  account?: {
    status?: string;
    user_id?: number | null;
  } | null;
};

const REVIEW_STATUSES = new Set(['warning', 'unavailable', 'ambiguous', 'failed']);

export function readBackendPostSetupProgress(
  status: StudentPostSetupStatus | null | undefined,
): StudentPostSetupProgress | null {
  const progress = status?.progress;
  if (!progress) return null;
  if (
    !Number.isFinite(progress.completed_steps) ||
    !Number.isFinite(progress.total_steps) ||
    !Number.isFinite(progress.percent)
  ) {
    return null;
  }
  return {
    completed_steps: Math.max(0, Math.trunc(progress.completed_steps)),
    total_steps: Math.max(0, Math.trunc(progress.total_steps)),
    percent: Math.min(100, Math.max(0, Math.trunc(progress.percent))),
  };
}

export function isPostSetupComplete(status: StudentPostSetupStatus | null | undefined): boolean {
  return (readBackendPostSetupProgress(status)?.percent ?? 0) >= 100;
}

export function hasPostSetupReview(status: StudentPostSetupStatus | null | undefined): boolean {
  return (status?.steps ?? []).some((step) => REVIEW_STATUSES.has(step.status));
}
