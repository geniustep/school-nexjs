/** Resolve bilingual student names for the Student 360 header. */

function trimName(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function hasArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

export interface StudentHeaderBilingualNames {
  primary: string;
  secondary: string | null;
  primaryDir: 'rtl' | 'ltr';
  secondaryDir: 'ltr' | null;
  /** Best name for avatar initials / aria. */
  displayName: string;
}

export function resolveStudentHeaderBilingualNames(input: {
  nameAr?: string | null;
  nameLatin?: string | null;
  fallbackDisplay?: string | null;
}): StudentHeaderBilingualNames {
  const nameAr = trimName(input.nameAr);
  const nameLatin = trimName(input.nameLatin);
  const fallback = trimName(input.fallbackDisplay);

  if (nameAr && nameLatin && nameAr.localeCompare(nameLatin, undefined, { sensitivity: 'accent' }) !== 0) {
    return {
      primary: nameAr,
      secondary: nameLatin,
      primaryDir: 'rtl',
      secondaryDir: 'ltr',
      displayName: nameAr,
    };
  }

  if (nameAr) {
    return {
      primary: nameAr,
      secondary: null,
      primaryDir: 'rtl',
      secondaryDir: null,
      displayName: nameAr,
    };
  }

  if (nameLatin) {
    return {
      primary: nameLatin,
      secondary: null,
      primaryDir: 'ltr',
      secondaryDir: null,
      displayName: nameLatin,
    };
  }

  if (fallback) {
    return {
      primary: fallback,
      secondary: null,
      primaryDir: hasArabicScript(fallback) ? 'rtl' : 'ltr',
      secondaryDir: null,
      displayName: fallback,
    };
  }

  return {
    primary: '—',
    secondary: null,
    primaryDir: 'rtl',
    secondaryDir: null,
    displayName: '—',
  };
}
