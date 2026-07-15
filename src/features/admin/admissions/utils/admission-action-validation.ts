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
