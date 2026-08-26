export type AdminRequestStateTone = 'green' | 'red' | 'amber' | 'blue' | 'slate';

function normalizedState(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
}

export function adminRequestStateTone(state?: string | null): AdminRequestStateTone {
  switch (normalizedState(state)) {
    case 'submitted':
    case 'referred':
      return 'blue';
    case 'under_review':
    case 'in_review':
    case 'waiting_requester':
    case 'wait_requester':
      return 'amber';
    case 'resolved':
      return 'green';
    case 'cancelled':
    case 'canceled':
    case 'rejected':
      return 'red';
    case 'draft':
    case 'closed':
    default:
      return 'slate';
  }
}

export function adminRequestCardStyle(state?: string | null): { background: string; borderColor: string } {
  const tone = adminRequestStateTone(state);
  return {
    background: `var(--c-${tone}-soft)`,
    borderColor: `color-mix(in srgb, var(--c-${tone === 'slate' ? 'text-muted' : tone}) 28%, var(--c-border))`,
  };
}
