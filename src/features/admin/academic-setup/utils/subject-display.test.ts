import { describe, expect, it } from 'vitest';
import {
  buildLevelsById,
  buildSubjectDisplayLabel,
  countSubjectsByName,
} from './subject-display';
import type { Subject } from '@/types/class';

const t = (key: 'admin.academicSetup.subjectScopePrimary' | 'admin.academicSetup.subjectScopeMiddle') =>
  key === 'admin.academicSetup.subjectScopePrimary' ? 'ابتدائي' : 'إعدادي';

function subject(partial: Partial<Subject> & Pick<Subject, 'id' | 'name'>): Subject {
  return {
    code: null,
    ...partial,
  };
}

describe('buildSubjectDisplayLabel', () => {
  const levels = buildLevelsById([
    { id: 77, name: 'الأولى ابتدائي', code: 'P1' },
    { id: 176, name: 'الأولى إعدادي', code: 'M1' },
    { id: 2442, name: 'الثانية ابتدائي', code: 'P2' },
  ]);

  it('keeps unique subject names unchanged', () => {
    const subjects = [subject({ id: 1, name: 'الفيزياء', code: 'PHY' })];
    const counts = countSubjectsByName(subjects);
    expect(buildSubjectDisplayLabel(subjects[0], levels, counts, t)).toBe('الفيزياء');
  });

  it('distinguishes same-name subjects using primary scope', () => {
    const subjects = [
      subject({ id: 1886, name: 'الرياضيات', code: 'MATH_PRIM', level_ids: [77, 2442] }),
      subject({ id: 1894, name: 'الرياضيات', code: 'MATH_MID', level_ids: [176] }),
    ];
    const counts = countSubjectsByName(subjects);
    expect(buildSubjectDisplayLabel(subjects[0], levels, counts, t)).toBe('الرياضيات — ابتدائي');
    expect(buildSubjectDisplayLabel(subjects[1], levels, counts, t)).toBe('الرياضيات — M1');
  });

  it('does not collapse different ids with the same name', () => {
    const subjects = [
      subject({ id: 59, name: 'اللغة العربية', code: 'AR' }),
      subject({ id: 211, name: 'اللغة العربية', code: 'AR_PRIM', level_ids: [77] }),
      subject({ id: 1889, name: 'اللغة العربية', code: 'AR_MID', level_ids: [176] }),
    ];
    const counts = countSubjectsByName(subjects);
    const labels = subjects.map((item) => buildSubjectDisplayLabel(item, levels, counts, t));
    expect(new Set(labels).size).toBe(3);
    expect(labels).toContain('اللغة العربية — P1');
  });
});

describe('countSubjectsByName', () => {
  it('counts duplicate names without merging ids', () => {
    const counts = countSubjectsByName([
      subject({ id: 1, name: 'الرياضيات' }),
      subject({ id: 2, name: 'الرياضيات' }),
      subject({ id: 3, name: 'العلوم' }),
    ]);
    expect(counts.get('الرياضيات')).toBe(2);
    expect(counts.get('العلوم')).toBe(1);
  });
});
