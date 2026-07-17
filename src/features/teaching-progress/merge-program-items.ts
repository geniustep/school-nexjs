/**
 * Merge Backend remaining items with summary lines / suggestion flags.
 * Identity key: distribution_line_id only. No FE remaining recompute.
 */

import type {
  TeachingProgressLineSummary,
  TeachingRemainingItem,
} from '@/types/teaching-delivery';

export type TeacherProgramItemView = TeachingRemainingItem & {
  is_suggested?: boolean;
  progress_line_id?: number | null;
  coverage_percent?: number | null;
  last_delivery_at?: string | null;
  last_delivery_id?: number | null;
};

function progressLineDistributionId(line: TeachingProgressLineSummary): number | null {
  return line.distribution_line?.id ?? null;
}

export function remainingFromProgressLine(line: TeachingProgressLineSummary): TeachingRemainingItem {
  const distributionLineId = progressLineDistributionId(line) ?? line.id;
  return {
    distribution_line_id: distributionLineId,
    title: line.title ?? line.name ?? null,
    name: line.name ?? line.title ?? null,
    sequence_order: line.sequence_order ?? null,
    order: line.sequence_order ?? null,
    planned_period:
      line.planned_window_start || line.planned_window_end
        ? { start: line.planned_window_start ?? null, end: line.planned_window_end ?? null }
        : null,
    delivered_session_units: line.delivered_units ?? null,
    remaining_units: line.remaining_units ?? null,
    completion_status: line.status ?? null,
    completed: line.status === 'completed',
    is_partial: line.status === 'in_progress',
    postponed: Boolean(line.delayed),
    progress_line_id: line.id,
    eligibility: line.status !== 'completed',
  };
}

export function mergeTeacherProgramItems(args: {
  remaining: TeachingRemainingItem[];
  summaryLines?: TeachingProgressLineSummary[] | null;
  suggestionLineId?: number | null;
  postponedItems?: TeachingRemainingItem[] | null;
}): TeacherProgramItemView[] {
  const lineByDist = new Map<number, TeachingProgressLineSummary>();
  for (const line of args.summaryLines ?? []) {
    const distId = progressLineDistributionId(line);
    if (distId != null) lineByDist.set(distId, line);
  }

  const postponedByDist = new Map<number, TeachingRemainingItem>();
  for (const item of args.postponedItems ?? []) {
    postponedByDist.set(item.distribution_line_id, item);
  }

  const source =
    args.remaining.length > 0
      ? args.remaining
      : (args.summaryLines ?? []).map(remainingFromProgressLine);

  const seen = new Set<number>();
  const out: TeacherProgramItemView[] = [];

  for (const item of source) {
    if (seen.has(item.distribution_line_id)) continue;
    seen.add(item.distribution_line_id);
    const line = lineByDist.get(item.distribution_line_id);
    const postponed = postponedByDist.get(item.distribution_line_id);
    out.push({
      ...item,
      postponed: item.postponed || postponed?.postponed || Boolean(line?.delayed),
      latest_postponement_reason:
        item.latest_postponement_reason ?? postponed?.latest_postponement_reason ?? null,
      latest_postponement_at:
        item.latest_postponement_at ?? postponed?.latest_postponement_at ?? null,
      progress_line_id: item.progress_line_id ?? line?.id ?? null,
      coverage_percent: line?.coverage_percent ?? null,
      last_delivery_at: line?.last_delivery_at ?? null,
      last_delivery_id:
        line?.last_delivery_id ?? item.actual_delivery_id ?? item.current_delivery_id ?? null,
      is_suggested:
        args.suggestionLineId != null && item.distribution_line_id === args.suggestionLineId,
    });
  }

  for (const postponed of args.postponedItems ?? []) {
    if (seen.has(postponed.distribution_line_id)) continue;
    seen.add(postponed.distribution_line_id);
    const line = lineByDist.get(postponed.distribution_line_id);
    out.push({
      ...postponed,
      postponed: true,
      progress_line_id: postponed.progress_line_id ?? line?.id ?? null,
      coverage_percent: line?.coverage_percent ?? null,
      last_delivery_at: line?.last_delivery_at ?? null,
      last_delivery_id: line?.last_delivery_id ?? null,
      is_suggested:
        args.suggestionLineId != null &&
        postponed.distribution_line_id === args.suggestionLineId,
    });
  }

  out.sort((a, b) => (a.sequence_order ?? a.order ?? 0) - (b.sequence_order ?? b.order ?? 0));
  return out;
}

export function resolveOccurrenceId(item: TeachingRemainingItem): number | null {
  const id = item.occurrence_id ?? item.session_occurrence_id ?? null;
  return id != null && id > 0 ? id : null;
}

export function resolveDeliveryId(item: TeacherProgramItemView): number | null {
  const id =
    item.actual_delivery_id ?? item.current_delivery_id ?? item.last_delivery_id ?? null;
  return id != null && id > 0 ? id : null;
}
