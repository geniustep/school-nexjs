import type { ArrearsFollowupTab } from '@/types/finance-arrears';

export const ARREARS_FOLLOWUP_TABS = [
  'all',
  'needs_followup',
  'payment_promises',
  'today_followup',
  'escalated',
  'resolved',
] as const;

export function isArrearsFollowupTab(value: string | null | undefined): value is ArrearsFollowupTab {
  return !!value && (ARREARS_FOLLOWUP_TABS as readonly string[]).includes(value);
}

export function arrearsFollowupTabLabelKey(tab: ArrearsFollowupTab): string {
  switch (tab) {
    case 'all':
      return 'admin.finance.arrears.tabs.all';
    case 'needs_followup':
      return 'admin.finance.arrears.tabs.needsFollowup';
    case 'payment_promises':
      return 'admin.finance.arrears.tabs.paymentPromises';
    case 'today_followup':
      return 'admin.finance.arrears.tabs.todayFollowup';
    case 'escalated':
      return 'admin.finance.arrears.tabs.escalated';
    case 'resolved':
      return 'admin.finance.arrears.tabs.resolved';
    default:
      return 'admin.finance.arrears.tabs.all';
  }
}

export function arrearsFollowupTabApiParam(tab: ArrearsFollowupTab): string | undefined {
  if (tab === 'all') return undefined;
  return tab;
}
