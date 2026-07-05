import { describe, expect, it } from 'vitest';
import { parseFamilyCollectQuery } from '@/features/admin/finance/family-collect-query';

describe('parseFamilyCollectQuery', () => {
  it('reads suggested amount and arrears source', () => {
    const params = new URLSearchParams(
      'family_collect=1&source=arrears&suggested_amount=1500&returnTo=%2Fadmin%2Ffinance%2Farrears',
    );
    expect(parseFamilyCollectQuery(params)).toEqual({
      suggestedAmount: 1500,
      source: 'arrears',
    });
  });

  it('ignores invalid suggested amounts', () => {
    const params = new URLSearchParams('suggested_amount=abc&source=arrears');
    expect(parseFamilyCollectQuery(params)).toEqual({
      suggestedAmount: null,
      source: 'arrears',
    });
  });
});
