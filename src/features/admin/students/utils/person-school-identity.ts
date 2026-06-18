import type { TranslateFn } from '@/features/i18n/locale-context';
import { personHasTeacherRole } from './person-role-presentation';

export const STAFF_ROLE_CODES = [
  'staff',
  'admin',
  'employee',
  'school_manager',
  'general_supervisor',
  'admin_staff',
  'project_manager',
] as const;

export type StaffRoleCode = (typeof STAFF_ROLE_CODES)[number];

export interface PersonSchoolIdentityInput {
  existing_roles?: string[];
  role_labels?: string[];
  teacher_id?: number | null;
  staff_id?: number | null;
  guardian_id?: number | null;
  guardian_links_count?: number;
  linked_students_count?: number;
  children_count?: number;
  has_user?: boolean;
  has_user_account?: boolean;
  has_account?: boolean;
  user_id?: number | null;
}

export interface PersonSchoolIdentityBadge {
  id: string;
  label: string;
}

const TEACHER_LABEL_PATTERN = /أستاذ|prof|teacher|enseignant|profesor/i;
const GUARDIAN_LABEL_PATTERN = /ولي\s*أمر|guardian|tuteur|tutor|padre|madre/i;

export function personHasStaffRole(person: PersonSchoolIdentityInput): boolean {
  if (typeof person.staff_id === 'number' && person.staff_id > 0) return true;
  const roles = person.existing_roles ?? [];
  return roles.some((role) => STAFF_ROLE_CODES.includes(role as StaffRoleCode));
}

export function personHasLoginAccount(person: PersonSchoolIdentityInput): boolean {
  return (
    person.has_user === true ||
    person.has_user_account === true ||
    person.has_account === true ||
    (typeof person.user_id === 'number' && person.user_id > 0)
  );
}

export function personHasTeacherIdentity(person: PersonSchoolIdentityInput): boolean {
  return personHasTeacherRole(person) || (typeof person.teacher_id === 'number' && person.teacher_id > 0);
}

export function resolveTeacherBadgeLabel(
  t: TranslateFn,
  person: Pick<PersonSchoolIdentityInput, 'role_labels' | 'existing_roles' | 'teacher_id'>,
): string | null {
  if (!personHasTeacherIdentity(person)) return null;
  const teacherLabel = person.role_labels?.find((label) => TEACHER_LABEL_PATTERN.test(label));
  return teacherLabel ?? t('admin.student360.schoolRoleTeacher');
}

function linkedStudentsCount(person: PersonSchoolIdentityInput): number {
  if (typeof person.guardian_links_count === 'number') return person.guardian_links_count;
  if (typeof person.linked_students_count === 'number') return person.linked_students_count;
  if (typeof person.children_count === 'number') return person.children_count;
  return 0;
}

function hasFormerGuardianIdentity(person: PersonSchoolIdentityInput): boolean {
  return (
    person.guardian_id != null ||
    person.existing_roles?.includes('guardian') === true ||
    linkedStudentsCount(person) > 0
  );
}

export function buildPersonSchoolIdentityBadges(
  t: TranslateFn,
  person: PersonSchoolIdentityInput,
): PersonSchoolIdentityBadge[] {
  const badges: PersonSchoolIdentityBadge[] = [];

  const teacherLabel = resolveTeacherBadgeLabel(t, person);
  if (teacherLabel) badges.push({ id: 'teacher', label: teacherLabel });

  if (personHasStaffRole(person)) {
    badges.push({ id: 'staff', label: t('admin.student360.schoolRoleStaff') });
  }

  if (hasFormerGuardianIdentity(person)) {
    badges.push({ id: 'former-guardian', label: t('admin.student360.schoolRoleFormerGuardian') });
  }

  if (linkedStudentsCount(person) > 0) {
    badges.push({ id: 'linked-children', label: t('admin.student360.schoolRoleLinkedOtherChildren') });
  }

  if (personHasLoginAccount(person)) {
    badges.push({ id: 'login', label: t('admin.student360.schoolRoleHasLoginAccount') });
  }

  return badges;
}

/** School/work badges for an already-linked guardian card (excludes prior-guardian hints). */
export function buildGuardianCardSchoolBadges(
  t: TranslateFn,
  guardian: PersonSchoolIdentityInput & { role_labels?: string[] },
): PersonSchoolIdentityBadge[] {
  const roleLabels = guardian.role_labels?.filter(Boolean) ?? [];
  const workRoleLabels = roleLabels.filter((label) => !GUARDIAN_LABEL_PATTERN.test(label));

  if (workRoleLabels.length > 0) {
    const badges = workRoleLabels.map((label, index) => ({
      id: `role-label-${index}`,
      label,
    }));
    if (
      personHasLoginAccount(guardian) &&
      !badges.some((badge) => /login|حساب|compte|account|acceso/i.test(badge.label))
    ) {
      badges.push({ id: 'login', label: t('admin.student360.schoolRoleHasLoginAccount') });
    }
    return badges;
  }

  return buildPersonSchoolIdentityBadges(t, guardian).filter(
    (badge) => badge.id !== 'former-guardian' && badge.id !== 'linked-children',
  );
}
