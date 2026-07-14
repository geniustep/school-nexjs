export type FinanceServiceFormValues = {
  name: string;
  category: string;
  priorityLevel: string;
  active: boolean;
  code: string;
  description: string;
  selectableInAdmissions: boolean;
};

/**
 * Create payload — full visible service fields.
 * Update payload — Runtime write surface currently accepts only
 * `selectable_in_admissions` (other keys return unsupported-field 422).
 */
export function buildFinanceServiceFormPayload(
  values: FinanceServiceFormValues,
  mode: 'create' | 'update' = 'create',
): Record<string, unknown> {
  if (mode === 'update') {
    return {
      selectable_in_admissions: Boolean(values.selectableInAdmissions),
    };
  }
  return {
    name: values.name.trim(),
    category: values.category || undefined,
    allocation_priority_level: values.priorityLevel,
    active: values.active,
    code: values.code.trim() || undefined,
    description: values.description.trim() || undefined,
    selectable_in_admissions: Boolean(values.selectableInAdmissions),
  };
}
