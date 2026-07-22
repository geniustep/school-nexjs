import type { AcademicTermOption, UpdateAcademicTermInput } from '@/types/academic-context';

export type TermEditFormValues = {
  name: string;
  code: string;
  date_start: string;
  date_end: string;
};

export type TermEditValidationError =
  | 'name_required'
  | 'code_required'
  | 'date_start_required'
  | 'date_end_required'
  | 'dates_invalid'
  | 'no_changes';

export function validateTermEditForm(
  values: TermEditFormValues,
): TermEditValidationError | null {
  const name = values.name.trim();
  const code = values.code.trim();
  if (!name) return 'name_required';
  if (!code) return 'code_required';
  if (!values.date_start) return 'date_start_required';
  if (!values.date_end) return 'date_end_required';
  if (!(values.date_start < values.date_end)) return 'dates_invalid';
  return null;
}

/** Build a partial PATCH body with only changed allowed fields. Returns null if empty. */
export function buildTermUpdatePayload(
  original: AcademicTermOption,
  values: TermEditFormValues,
): UpdateAcademicTermInput | null {
  const name = values.name.trim();
  const code = values.code.trim();
  const payload: UpdateAcademicTermInput = {};

  if (name !== (original.name ?? '').trim()) {
    payload.name = name;
  }
  if (code !== (original.code ?? '').trim()) {
    payload.code = code;
  }
  if (values.date_start !== (original.date_start ?? '')) {
    payload.date_start = values.date_start;
  }
  if (values.date_end !== (original.date_end ?? '')) {
    payload.date_end = values.date_end;
  }

  if (Object.keys(payload).length === 0) return null;
  return payload;
}
