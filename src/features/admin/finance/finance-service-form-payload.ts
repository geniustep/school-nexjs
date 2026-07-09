export type FinanceServiceFormValues = {
  name: string;
  category: string;
  priorityLevel: string;
  active: boolean;
  code: string;
  description: string;
};

/** Visible service form fields only — hidden backend flags stay server-owned on create/update. */
export function buildFinanceServiceFormPayload(values: FinanceServiceFormValues): {
  name: string;
  category?: string;
  allocation_priority_level: string;
  active: boolean;
  code?: string;
  description?: string;
} {
  return {
    name: values.name.trim(),
    category: values.category || undefined,
    allocation_priority_level: values.priorityLevel,
    active: values.active,
    code: values.code.trim() || undefined,
    description: values.description.trim() || undefined,
  };
}
