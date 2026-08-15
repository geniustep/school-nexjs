import { describe, expect, it } from 'vitest';

import { textbookReferenceTitle } from './entry-requirements-display';

describe('textbookReferenceTitle', () => {
  it('prefers the API title when it is available', () => {
    expect(textbookReferenceTitle({ item_type: 'textbook', title: 'La classe des sciences', name: 'Fallback name' })).toBe('La classe des sciences');
  });

  it('falls back to the imported item name for unresolved textbooks', () => {
    expect(textbookReferenceTitle({ item_type: 'textbook', title: null, name: 'La classe des sciences' })).toBe('La classe des sciences');
  });

  it('does not produce a textbook reference label for other item types', () => {
    expect(textbookReferenceTitle({ item_type: 'notebook', title: null, name: 'دفتر' })).toBeNull();
  });
});
