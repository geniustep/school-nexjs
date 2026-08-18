import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import { mapWarningCode } from './api-errors';

describe('assignment warning localization', () => {
  it('maps assignment warning codes to Arabic user-facing messages', () => {
    const t = (key: string) => translate('ar', key);

    expect(mapWarningCode('teacher_target_hours_exceeded', t)).toBe(
      'تجاوز الأستاذ عدد الساعات المستهدف',
    );
    expect(mapWarningCode('teacher_subject_eligibility_unspecified', t)).toBe(
      'لم يتم تحديد أهلية الأستاذ لتدريس هذه المادة',
    );
    expect(mapWarningCode('weekly_load_target_exceeded', t)).toBe(
      'سيؤدي هذا الإسناد إلى تجاوز الحمولة الأسبوعية المستهدفة',
    );
  });

  it('keeps the same warning codes localized in French', () => {
    const t = (key: string) => translate('fr', key);

    expect(mapWarningCode('teacher_target_hours_exceeded', t)).toBe(
      'Le volume horaire cible de l’enseignant est dépassé.',
    );
    expect(mapWarningCode('teacher_subject_eligibility_unspecified', t)).toBe(
      'L’éligibilité de l’enseignant pour cette matière n’est pas définie.',
    );
    expect(mapWarningCode('weekly_load_target_exceeded', t)).toBe(
      'Cette affectation dépasse la charge hebdomadaire cible.',
    );
  });
});
