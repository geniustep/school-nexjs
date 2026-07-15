export function validateLogContact(input: {
  result?: string;
  note?: string;
  next_action_date?: string;
  scheduled_at?: string;
  appointment_at?: string;
}) {
  if (input.result === 'call_later' && !input.next_action_date) {
    return 'admin.admissions.actionValidation.nextActionDateRequired';
  }
  if (
    input.result === 'appointment_scheduled' &&
    !input.scheduled_at &&
    !input.appointment_at
  ) {
    return 'admin.admissions.actionValidation.appointmentDateRequired';
  }
  if (input.result === 'other' && !input.note?.trim()) {
    return 'admin.admissions.actionValidation.noteRequired';
  }
  return null;
}

export function validateReject(input: { note?: string; reason?: string }) {
  return input.note?.trim() || input.reason?.trim()
    ? null
    : 'admin.admissions.actionValidation.rejectionReasonRequired';
}

export function validateAccept(_input: { note?: string }) {
  return null;
}

export function validateClose(input: { note?: string }) {
  return input.note?.trim() ? null : 'admin.admissions.closeDialog.noteRequired';
}

export function validateReturnToStatus(input: {
  target_status?: string;
  note?: string;
  allowedTargets?: readonly string[];
}) {
  const target = input.target_status?.trim() ?? '';
  if (!target) {
    return 'admin.admissions.returnToStatusDialog.targetRequired';
  }
  if (
    Array.isArray(input.allowedTargets) &&
    input.allowedTargets.length > 0 &&
    !input.allowedTargets.includes(target)
  ) {
    return 'admin.admissions.returnToStatusDialog.targetNotAllowed';
  }
  if (!input.note?.trim()) {
    return 'admin.admissions.returnToStatusDialog.noteRequired';
  }
  return null;
}

export function validateChangeStatus(input: {
  target_status?: string;
  note?: string;
  allowedTargets?: readonly string[];
  confirmFamilyApproval?: boolean;
}) {
  const target = input.target_status?.trim() ?? '';
  if (!target) {
    return 'admin.admissions.changeStatusDialog.targetRequired';
  }
  if (
    Array.isArray(input.allowedTargets) &&
    input.allowedTargets.length > 0 &&
    !input.allowedTargets.includes(target)
  ) {
    return 'admin.admissions.changeStatusDialog.targetNotAllowed';
  }
  if (!input.note?.trim()) {
    return 'admin.admissions.changeStatusDialog.noteRequired';
  }
  if (target === 'ready_for_registration' && input.confirmFamilyApproval !== true) {
    return 'admin.admissions.changeStatusDialog.familyApprovalRequired';
  }
  return null;
}
