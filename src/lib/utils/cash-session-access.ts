import { refName } from '@/lib/utils/finance';
import {
  cashSessionAllowsAction,
  cashSessionIsActive,
} from '@/lib/utils/cash-session-normalize';
import type { CashSession } from '@/types/finance-cash-desk';

export function cashSessionCashierId(
  session: CashSession | null | undefined,
): number | undefined {
  if (!session) return undefined;
  if (typeof session.cashier_id === 'number') return session.cashier_id;
  if (typeof session.cashier?.id === 'number') return session.cashier.id;
  return undefined;
}

export function cashSessionCashierName(session: CashSession | null | undefined): string | undefined {
  if (!session) return undefined;
  const direct = session.cashier_name?.trim();
  if (direct) return direct;
  const fromRef = refName(session.cashier)?.trim();
  return fromRef || undefined;
}

export function cashSessionOwnedByUser(
  session: CashSession | null | undefined,
  userId: number | string | null | undefined,
): boolean {
  if (!session || userId == null) return false;
  const cashierId = cashSessionCashierId(session);
  if (cashierId == null) return false;
  return String(cashierId) === String(userId);
}

export type CashSessionCollectionAccess =
  | { kind: 'not_required' }
  | { kind: 'checking' }
  | { kind: 'missing_session' }
  | { kind: 'blocked_no_permission'; cashierName?: string }
  | { kind: 'allowed'; session: CashSession; shared: boolean; cashierName?: string };

export function resolveCashSessionCollectionAccess(input: {
  requiresSession: boolean;
  checking: boolean;
  session: CashSession | null | undefined;
  currentUserId?: number | string | null;
}): CashSessionCollectionAccess {
  if (!input.requiresSession) return { kind: 'not_required' };
  if (input.checking) return { kind: 'checking' };
  if (!input.session || !cashSessionIsActive(input.session.state)) {
    return { kind: 'missing_session' };
  }
  if (!cashSessionAllowsAction(input.session, 'add_cash_collection')) {
    return {
      kind: 'blocked_no_permission',
      cashierName: cashSessionCashierName(input.session),
    };
  }
  const shared = !cashSessionOwnedByUser(input.session, input.currentUserId);
  return {
    kind: 'allowed',
    session: input.session,
    shared,
    cashierName: cashSessionCashierName(input.session),
  };
}

export function collectionBlockedByCashSession(access: CashSessionCollectionAccess): boolean {
  return access.kind === 'missing_session' || access.kind === 'blocked_no_permission';
}

export function cashDeskHasOpenSession(session: CashSession | null | undefined): boolean {
  return !!session && cashSessionIsActive(session.state);
}
