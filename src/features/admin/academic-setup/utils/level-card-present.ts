export type LevelPrimaryCtaKey = 'createFirstClass' | 'addClasses';

export function levelPrimaryCtaKey(classCount: number): LevelPrimaryCtaKey {
  return classCount > 0 ? 'addClasses' : 'createFirstClass';
}

export function levelCtaI18nKey(classCount: number): string {
  return `admin.academicSetup.${levelPrimaryCtaKey(classCount)}`;
}

export function shouldShowDuplicateLevelCtas(classCount: number): boolean {
  return false;
}
