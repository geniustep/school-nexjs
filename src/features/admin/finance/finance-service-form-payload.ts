export type FinanceServiceFormValues = {
  nameAr: string;
  nameFr: string;
  paymentNature: 'free' | 'paid' | '';
  category: string;
  priorityLevel: string;
  active: boolean;
  code: string;
  description: string;
  selectableInAdmissions: boolean;
};

/**
 * Create/update payload for the canonical service catalog.
 * Pricing remains authoritative on fee-plan lines; paymentNature is
 * catalog classification only.
 */
export function buildFinanceServiceFormPayload(
  values: FinanceServiceFormValues,
  mode: 'create' | 'update' = 'create',
): Record<string, unknown> {
  const nameAr = values.nameAr.trim();
  const nameFr = values.nameFr.trim();
  const base = {
    name: nameAr,
    name_ar: nameAr,
    name_fr: nameFr || null,
    payment_nature: values.paymentNature || null,
    category: values.category || undefined,
    allocation_priority_level: values.priorityLevel,
    code: values.code.trim() || undefined,
    description: values.description.trim() || null,
    selectable_in_admissions: Boolean(values.selectableInAdmissions),
  };
  if (mode === 'update') {
    return base;
  }
  return {
    ...base,
    active: values.active,
  };
}
