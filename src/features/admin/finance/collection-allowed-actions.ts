import type { PaymentCollection } from '@/types/finance';

export type CollectionAllowedActionsMap = Record<string, boolean | number | undefined>;

function actionValueTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'number') return value > 0;
  return false;
}

/** Official collection allowed_actions — array or boolean map from API. */
export function collectionAllowsAction(
  coll: Pick<PaymentCollection, 'allowed_actions'> | null | undefined,
  action: string,
): boolean {
  const raw = coll?.allowed_actions;
  if (!raw) return false;
  if (Array.isArray(raw)) return raw.includes(action);
  if (typeof raw === 'object') {
    return actionValueTruthy((raw as CollectionAllowedActionsMap)[action]);
  }
  return false;
}
