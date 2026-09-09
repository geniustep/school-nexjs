import type { ActiveUserContext, CurrentUser } from '@/types/user';

export class ActiveContextSwitchError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = 'ActiveContextSwitchError';
  }
}

type ContextSwitchBody = {
  success?: boolean;
  data?: { user?: CurrentUser; active_context?: ActiveUserContext; home?: string };
  error?: { code?: string; message?: string } | string;
};

function errorCode(body: ContextSwitchBody | null): string {
  if (typeof body?.error === 'string') return body.error;
  return body?.error?.code ?? 'context_switch_failed';
}

export async function switchActiveContext(
  requested: ActiveUserContext,
  fetchImpl: typeof fetch = fetch,
): Promise<{ user: CurrentUser; home: string }> {
  const response = await fetchImpl('/api/auth/active-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(requested),
  });
  const body = (await response.json().catch(() => null)) as ContextSwitchBody | null;
  if (!response.ok || body?.success !== true || !body.data?.user) {
    throw new ActiveContextSwitchError(errorCode(body));
  }
  const confirmed = body.data.user.active_context ?? body.data.active_context;
  if (!confirmed || confirmed.school_id !== requested.school_id || confirmed.role !== requested.role) {
    throw new ActiveContextSwitchError('context_not_confirmed');
  }
  return { user: body.data.user, home: body.data.home || '/' };
}
