import { describe, expect, it } from 'vitest';

import { translateEntryRequirementsLegacyText } from './entry-requirements-localization-boundary';

describe('entry requirements French legacy localization', () => {
  it('translates the core admin entry-requirements surface', () => {
    expect(translateEntryRequirementsLegacyText('تجهيزات الدخول المدرسي')).toBe('Fournitures de rentrée');
    expect(translateEntryRequirementsLegacyText('لوائح السنة الدراسية')).toBe('Listes de l’année scolaire');
    expect(translateEntryRequirementsLegacyText('إضافة تجهيز إلى مادة')).toBe('Ajouter une fourniture à une matière');
    expect(translateEntryRequirementsLegacyText('مشاركة اللائحة')).toBe('Partager la liste');
    expect(translateEntryRequirementsLegacyText('ربط الكتاب بالمقرر')).toBe('Lier le livre au manuel');
  });

  it('translates dynamic counts and prompts without changing data values', () => {
    expect(translateEntryRequirementsLegacyText('3 كتب · 2 دفاتر · 5 أغلفة')).toBe('3 livres · 2 cahiers · 5 couvertures');
    expect(translateEntryRequirementsLegacyText('حذف «Cahier 96» من هذه المسودة؟')).toBe('Supprimer « Cahier 96 » de ce brouillon ?');
    expect(translateEntryRequirementsLegacyText('السنة الدراسية: 2026-2027')).toBe('Année scolaire : 2026-2027');
  });

  it('leaves unknown school data unchanged', () => {
    expect(translateEntryRequirementsLegacyText('Mathématiques')).toBe('Mathématiques');
    expect(translateEntryRequirementsLegacyText('PRE1-PRE1-1-2026')).toBe('PRE1-PRE1-1-2026');
  });
});
