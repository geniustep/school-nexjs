export function feeTypeCategoryLabel(
  category: string | undefined,
  t: (key: string) => string,
): string {
  if (!category) return t('common.dash');
  const key = `admin.finance.feeTypesWorkspace.categories.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

export function feeTypeFrequencyLabel(
  frequency: string | undefined,
  t: (key: string) => string,
): string {
  if (!frequency) return t('common.dash');
  const uiKey = frequency === 'one_time' ? 'once' : frequency;
  const key = `admin.finance.feeTypesWorkspace.frequencies.${uiKey}`;
  const translated = t(key);
  return translated === key ? frequency : translated;
}
