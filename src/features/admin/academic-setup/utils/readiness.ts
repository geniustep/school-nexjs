import type { SetupIssue, SetupReadiness } from '../types';

/**
 * Compute readiness from real detected issues — not a fake UI percentage.
 * Blocking issues (blocksReadiness=true) drive the score; warnings/info are tracked separately.
 */
export function computeReadiness(issues: SetupIssue[], hasBaselineData: boolean): SetupReadiness {
  const blocking = issues.filter((i) => i.blocksReadiness);
  const warning = issues.filter((i) => i.severity === 'warning' && !i.blocksReadiness);
  const info = issues.filter((i) => i.severity === 'info');

  if (!hasBaselineData) {
    return {
      percent: 0,
      blockingCount: blocking.length,
      warningCount: warning.length,
      infoCount: info.length,
      totalChecks: 0,
      completedChecks: 0,
      hasData: false,
    };
  }

  const totalChecks = Math.max(blocking.length, 1);
  const completedChecks = Math.max(totalChecks - blocking.length, 0);
  const percent = Math.round((completedChecks / totalChecks) * 100);

  return {
    percent: blocking.length === 0 ? 100 : percent,
    blockingCount: blocking.length,
    warningCount: warning.length + blocking.filter((i) => i.severity === 'warning').length,
    infoCount: info.length,
    totalChecks,
    completedChecks,
    hasData: true,
  };
}

export function readinessTone(percent: number): 'green' | 'amber' | 'red' {
  if (percent >= 90) return 'green';
  if (percent >= 60) return 'amber';
  return 'red';
}
