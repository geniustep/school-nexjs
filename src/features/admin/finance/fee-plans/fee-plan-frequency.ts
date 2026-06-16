/** UI frequency value → Odoo fee plan line frequency. */
export function feePlanFrequencyToApi(frequency: string): string {
  const trimmed = frequency.trim();
  if (trimmed === 'once') return 'one_time';
  return trimmed;
}

/** Odoo fee plan line frequency → UI select value. */
export function feePlanFrequencyFromApi(frequency: string | undefined): string {
  if (!frequency?.trim()) return 'once';
  if (frequency === 'one_time') return 'once';
  return frequency;
}
