export function cashSessionErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'cash_session_required':
      return 'admin.finance.cashDesk.errors.cashSessionRequired';
    case 'cash_session_already_open':
      return 'admin.finance.cashDesk.errors.cashSessionAlreadyOpen';
    case 'cash_journal_required':
      return 'admin.finance.cashDesk.errors.cashJournalRequired';
    case 'cash_session_closed':
      return 'admin.finance.cashDesk.errors.cashSessionClosed';
    case 'cash_difference_reason_required':
      return 'admin.finance.cashDesk.errors.differenceReasonRequired';
    case 'cash_difference_approval_required':
      return 'admin.finance.cashDesk.errors.differenceApprovalRequired';
    case 'cash_session_reopen_not_allowed':
      return 'admin.finance.cashDesk.errors.reopenNotAllowed';
    case 'forbidden':
      return 'errors.forbidden';
    default:
      return null;
  }
}
