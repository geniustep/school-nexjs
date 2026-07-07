import type { AdmissionKanbanDragRecord, DraggableAdmissionUiStage } from './admission-kanban-drag';
import { evaluateKanbanDragStateChange } from './admission-kanban-drag';

export interface BulkStageChangeItem {
  id: number;
  record: AdmissionKanbanDragRecord;
}

export interface BulkStageChangeResult {
  succeeded: number[];
  failed: number[];
  skipped: number[];
}

export type BulkStageChangeFn = (admissionId: number, state: string) => Promise<boolean>;

const DEFAULT_CONCURRENCY = 2;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function runWorker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
}

/** Applies the same UI-stage transition mapping as Kanban drag, sequentially with bounded concurrency. */
export async function runBulkStageChange(
  items: BulkStageChangeItem[],
  targetStage: DraggableAdmissionUiStage,
  changeState: BulkStageChangeFn,
  options?: { concurrency?: number },
): Promise<BulkStageChangeResult> {
  const succeeded: number[] = [];
  const failed: number[] = [];
  const skipped: number[] = [];

  const planned = items.map((item) => {
    const decision = evaluateKanbanDragStateChange(item.record, targetStage);
    return { item, decision };
  });

  for (const { item, decision } of planned) {
    if (!decision.apply || !decision.targetState) {
      skipped.push(item.id);
    }
  }

  const toApply = planned.filter(
    (entry) => entry.decision.apply && entry.decision.targetState,
  ) as Array<{
    item: BulkStageChangeItem;
    decision: { apply: true; targetState: string };
  }>;

  await runWithConcurrency(
    toApply,
    options?.concurrency ?? DEFAULT_CONCURRENCY,
    async ({ item, decision }) => {
      const ok = await changeState(item.id, decision.targetState);
      if (ok) succeeded.push(item.id);
      else failed.push(item.id);
    },
  );

  return { succeeded, failed, skipped };
}
