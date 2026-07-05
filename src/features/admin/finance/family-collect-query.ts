export type FamilyCollectSource = 'arrears';

export type FamilyCollectQuery = {
  suggestedAmount: number | null;
  source: FamilyCollectSource | null;
};

export function parseFamilyCollectQuery(
  params: Pick<URLSearchParams, 'get'>,
): FamilyCollectQuery {
  const rawAmount = params.get('suggested_amount');
  const parsedAmount = rawAmount ? Number.parseFloat(rawAmount.replace(',', '.')) : Number.NaN;
  const suggestedAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;
  const source = params.get('source') === 'arrears' ? 'arrears' : null;
  return { suggestedAmount, source };
}

export function familyCollectQueryParamKeys(): string[] {
  return ['family_collect', 'suggested_amount', 'source'];
}
