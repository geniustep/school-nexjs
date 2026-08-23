const STATE_LABELS: Record<string, string> = {
  draft: 'مسودة',
  submitted: 'مُرسل',
  under_review: 'قيد المراجعة',
  in_review: 'قيد المراجعة',
  waiting_requester: 'بانتظار صاحب الطلب',
  wait_requester: 'بانتظار صاحب الطلب',
  referred: 'مُحال',
  resolved: 'تمت المعالجة',
  cancelled: 'ملغى',
  canceled: 'ملغى',
  rejected: 'مرفوض',
  closed: 'مغلق',
};

const ACTION_LABELS: Record<string, string> = {
  submit: 'إرسال الطلب',
  start_review: 'بدء المراجعة',
  start_processing: 'بدء المعالجة',
  refer: 'إحالة إلى موظف',
  wait_requester: 'طلب معلومات إضافية',
  waiting_requester: 'طلب معلومات إضافية',
  resolve: 'إنهاء المعالجة',
  reject: 'رفض الطلب',
  cancel: 'إلغاء الطلب',
  reopen: 'إعادة فتح الطلب',
  reply: 'إضافة رد',
  requester_reply: 'إضافة رد',
};

const ROLE_LABELS: Record<string, string> = {
  parent: 'ولي الأمر',
  guardian: 'ولي الأمر',
  student: 'التلميذ',
  admin: 'الإدارة',
  staff: 'الموظف',
  employee: 'الموظف',
  requester: 'صاحب الطلب',
  system: 'النظام',
};

const TYPE_LABELS: Record<string, string> = {
  complaint: 'شكاية',
  inquiry: 'استفسار',
  appointment: 'طلب موعد',
  'appointment request': 'طلب موعد',
  certificate: 'طلب شهادة',
  'certificate request': 'طلب شهادة',
  'lost and found': 'المفقودات',
  lost_found: 'المفقودات',
  'administrative request': 'طلب إداري',
  'admin request': 'طلب إداري',
};

function normalizedKey(value: string): string {
  return value.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
}

export function adminRequestStateLabel(state?: string | null): string {
  if (!state?.trim()) return '—';
  return STATE_LABELS[normalizedKey(state)] ?? 'حالة غير معروفة';
}

export function adminRequestActionLabel(action?: string | null): string {
  if (!action?.trim()) return 'إجراء';
  return ACTION_LABELS[normalizedKey(action)] ?? 'إجراء آخر';
}

export function adminRequestRoleLabel(role?: string | null): string {
  if (!role?.trim()) return '—';
  return ROLE_LABELS[normalizedKey(role)] ?? 'مستخدم';
}

export function adminRequestTypeLabel(name?: string | null): string {
  const value = name?.trim();
  if (!value) return '—';

  // Seed/QA markers are operational metadata and must never leak into family/admin UI.
  const qaMatch = value.match(/^QA\s+(Complaint|Inquiry|Appointment)(?:\s+.+)?$/i);
  if (qaMatch) {
    return TYPE_LABELS[qaMatch[1].toLowerCase()] ?? qaMatch[1];
  }

  return TYPE_LABELS[value.toLowerCase()] ?? value;
}

export interface AdminRequestStaffOption {
  id: number;
  name: string;
  detail?: string;
}

function numberFrom(value: unknown): number | null {
  if (Array.isArray(value)) return numberFrom(value[0]);
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return numberFrom((value as { id?: unknown }).id);
  }
  return null;
}

function textFrom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[1] === 'string' && value[1].trim()) return value[1].trim();
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['name', 'display_name', 'full_name', 'label']) {
      const text = textFrom(record[key]);
      if (text) return text;
    }
  }
  return null;
}

function rawStaffRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  for (const key of ['items', 'staff', 'employees', 'options', 'staff_options', 'results']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  if (record.data && typeof record.data === 'object') return rawStaffRows(record.data);
  return [];
}

/** Normalize the existing /admin/staff/options response without changing its server contract. */
export function staffOptionRows(value: unknown): AdminRequestStaffOption[] {
  return rawStaffRows(value).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const id =
      numberFrom(record.user_id) ??
      numberFrom(record.value) ??
      numberFrom(record.user) ??
      numberFrom(record.id) ??
      numberFrom(record.staff_id);
    const name =
      textFrom(record.name) ??
      textFrom(record.display_name) ??
      textFrom(record.full_name) ??
      textFrom(record.label) ??
      textFrom(record.employee_name) ??
      textFrom(record.user_name) ??
      textFrom(record.user) ??
      textFrom(record.user_id);
    if (!id || !name) return [];

    const detail =
      textFrom(record.job_title) ??
      textFrom(record.position) ??
      textFrom(record.role_name) ??
      textFrom(record.function);

    return [{ id, name, ...(detail ? { detail } : {}) }];
  });
}
