import type { FinanceCheque } from '@/types/finance';
import type { CollectionAllowedActionsMap } from '@/types/finance';
import type { ChequeLifecycleAction } from '@/lib/utils/cheque';

function actionValueTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'number') return value > 0;
  return false;
}

function hasAllowedActionsMap(
  raw: FinanceCheque['allowed_actions'] | undefined,
): raw is CollectionAllowedActionsMap {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw);
}

const LEGACY_CODE_TO_ACTION: Record<string, ChequeLifecycleAction> = {
  deposit: 'deposit',
  settle: 'settle',
  clear: 'settle',
  bounce: 'reject',
  reject: 'reject',
  cancel: 'cancel',
};

/** Official cheque allowed_actions map — do not infer settle/reject from state. */
export function chequeAllowsAction(
  cheque: Pick<FinanceCheque, 'allowed_actions' | 'allowed_action_codes'> | null | undefined,
  action: ChequeLifecycleAction | 'view',
): boolean {
  if (!cheque) return false;
  const raw = cheque.allowed_actions;

  if (hasAllowedActionsMap(raw)) {
    if (action in raw) return actionValueTruthy(raw[action]);
    if (action === 'deposit' && 'deposit' in raw) return actionValueTruthy(raw.deposit);
    return false;
  }

  if (Array.isArray(raw) && raw.length) {
    if (action === 'view') return raw.includes('view');
    const normalized = raw.map((entry) => LEGACY_CODE_TO_ACTION[entry] ?? entry);
    return normalized.includes(action);
  }

  const codes = cheque.allowed_action_codes ?? [];
  if (!codes.length) return false;
  return codes.some((code) => (LEGACY_CODE_TO_ACTION[code] ?? code) === action);
}

export function resolveChequeLifecycleActions(
  cheque: Pick<FinanceCheque, 'allowed_actions' | 'allowed_action_codes'>,
): ChequeLifecycleAction[] {
  const actions: ChequeLifecycleAction[] = [];
  for (const action of ['deposit', 'settle', 'reject', 'cancel'] as const) {
    if (chequeAllowsAction(cheque, action)) actions.push(action);
  }
  return actions;
}
