import { describe, expect, it } from 'vitest';
import { edgeBellCopyFor } from './copy';

describe('Raqeem Edge bell copy', () => {
  it('provides the Arabic product wording without claiming device activation', () => {
    const copy = edgeBellCopyFor('ar');
    expect(copy.title).toBe('الجرس المدرسي');
    expect(copy.saved).toContain('المزامنة التالية');
    expect(copy.saved).not.toContain('تم تطبيقه على الجهاز');
  });

  it('provides the French product wording', () => {
    const copy = edgeBellCopyFor('fr');
    expect(copy.title).toBe('Sonnerie scolaire');
    expect(copy.save).toBe('Enregistrer et activer');
    expect(copy.saved).toContain('prochaine synchronisation');
  });
});
