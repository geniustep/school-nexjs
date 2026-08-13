import type { ApiResponse } from '@/types/api';

export type LibraryTab = 'catalog' | 'copies' | 'circulation';
export type LibraryAllowedActions = Record<string, boolean>;

export type LibraryTitleRow = {
  id: number;
  name: string;
  subtitle?: string | null;
  authors?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  default_circulation_policy: 'loanable' | 'library_only';
  copy_count: number;
  available_copy_count: number;
  active: boolean;
  allowed_actions?: LibraryAllowedActions | null;
};

export type LibraryCopyRow = {
  id: number;
  title: { id: number; name: string; isbn?: string | null };
  accession: string;
  barcode?: string | null;
  shelf?: string | null;
  circulation_policy: 'loanable' | 'library_only';
  state: string;
  condition?: string | null;
  active: boolean;
  allowed_actions?: LibraryAllowedActions | null;
};

export type LibraryCirculationRow = {
  id: number;
  title: { id: number; name: string };
  copy: { id: number; accession: string; barcode?: string | null; state: string };
  patron_name?: string | null;
  patron_type?: string | null;
  checked_out_at?: string | null;
  due_at?: string | null;
  state: string;
  overdue: boolean;
  allowed_actions?: LibraryAllowedActions | null;
};

export type LibraryStudentRow = {
  id: number;
  name: string;
  code?: string | null;
};

export const libraryEndpoints = {
  titles: '/admin/library/titles',
  copies: '/admin/library/copies',
  circulations: '/admin/library/circulations',
  archiveTitle: (id: number) => `/admin/library/titles/${id}/archive`,
  copyAction: (id: number, action: string) => `/admin/library/copies/${id}/${action}`,
  checkout: (id: number) => `/admin/library/copies/${id}/checkout`,
  returnLoan: (id: number) => `/admin/library/circulations/${id}/return`,
} as const;

export const libraryStateLabel: Record<string, string> = {
  available: 'متاحة',
  on_loan: 'معارة',
  lost: 'مفقودة',
  damaged: 'متضررة',
  repair: 'قيد الإصلاح',
  withdrawn: 'مسحوبة',
  checked_out: 'نشطة',
  returned: 'مُعادة',
};

const libraryErrorLabel: Record<string, string> = {
  library_copy_not_loanable: 'هذه النسخة مخصصة للاستعمال داخل المكتبة ولا يمكن إعارتها.',
  library_copy_not_available: 'هذه النسخة غير متاحة للإعارة.',
  library_copy_already_checked_out: 'هذه النسخة معارة حاليًا.',
  library_copy_checked_out: 'يجب استرجاع النسخة قبل تغيير حالتها.',
  library_accession_conflict: 'رقم الجرد مستخدم لنسخة أخرى في المكتبة.',
  library_barcode_conflict: 'الباركود مستخدم لنسخة أخرى في المكتبة.',
  library_due_date_invalid: 'تاريخ الاستحقاق غير صالح.',
  library_circulation_invalid_due_at: 'تاريخ الاستحقاق يجب أن يكون بعد وقت الإعارة.',
  library_invalid_state_transition: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية.',
  library_copy_repair_invalid_state: 'لا يمكن إرسال النسخة للإصلاح من حالتها الحالية.',
  library_copy_restore_invalid_state: 'لا يمكن إرجاع النسخة إلى حالة متاحة من حالتها الحالية.',
  forbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
};

export function libraryActionAllowed(
  actions: LibraryAllowedActions | null | undefined,
  action: string,
): boolean {
  return Boolean(actions?.[action]);
}

export function libraryErrorMessage<T>(result: ApiResponse<T>): string {
  if (result.success) return '';
  return libraryErrorLabel[result.error.code] || result.error.message || 'تعذر تنفيذ العملية.';
}

export function libraryResponseTotal<T>(result: ApiResponse<T>, fallback: number): number {
  if (!result.success) return fallback;
  const value = Number((result.meta as Record<string, unknown> | undefined)?.total);
  return Number.isFinite(value) ? value : fallback;
}
