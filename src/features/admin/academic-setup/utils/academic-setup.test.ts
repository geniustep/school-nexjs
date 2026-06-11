import { describe, expect, it } from 'vitest';
import {
  filterAssignmentMissingIssues,
  filterIssuesByQuery,
  issueTargetHref,
  setupSectionHref,
} from '@/features/admin/academic-setup/utils/section-routes';
import { mapAcademicSetupApiError, mapSuggestionReason } from '@/features/admin/academic-setup/utils/api-errors';
import {
  readinessScoreLabel,
  readinessStatusLabel,
  isStaffDomainUnavailable,
} from '@/features/admin/academic-setup/utils/readiness-present';
import {
  quickActionLabel,
  readinessIssueDescription,
  readinessIssueTitle,
} from '@/features/admin/academic-setup/utils/readiness-i18n';
import { globalSetupSearch, buildHref } from '@/features/admin/academic-setup/utils/search';
import { translate } from '@/lib/i18n/messages';
import { buildClassPayload } from '@/features/admin/class-form-utils';
import {
  canManageStaff,
  canManageTeachingAssignments,
  canViewAcademicSetup,
  isAcademicSetupPath,
} from '@/lib/permissions/academic-setup';
import type { SetupReadinessIssue, SetupReadinessPayload } from '@/types/academic-setup';
import type { CurrentUser } from '@/types/user';

const t = (key: string, params?: Record<string, string | number>) => {
  const base = `tr:${key}`;
  return params ? `${base}:${JSON.stringify(params)}` : base;
};

function adminUser(perms: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: perms as CurrentUser['permissions'],
    admin_kind: 'school_manager',
    school: { id: 1, name: 'Test' },
  };
}

describe('setupSectionHref', () => {
  it('maps assignments section with query params', () => {
    expect(
      setupSectionHref('assignments', { class_id: 42, subject_id: 8, status: 'missing' }),
    ).toBe('/admin/settings/academic-setup/assignments?class_id=42&subject_id=8&status=missing');
  });

  it('builds issue target href', () => {
    const issue: Pick<SetupReadinessIssue, 'target'> = {
      target: { section: 'classes', query: { class_id: 5 } },
    };
    expect(issueTargetHref(issue)).toBe('/admin/settings/academic-setup/classes?class_id=5');
  });
});

describe('filterIssuesByQuery', () => {
  const issues: SetupReadinessIssue[] = [
    {
      id: '1',
      code: 'assignment_missing',
      severity: 'error',
      blocking: true,
      title: 'Missing',
      domain: 'assignments',
      target: { section: 'assignments', query: { class_id: 1, subject_id: 2 } },
    },
    {
      id: '2',
      code: 'assignment_missing',
      severity: 'error',
      blocking: true,
      title: 'Other',
      domain: 'assignments',
      target: { section: 'assignments', query: { class_id: 3 } },
    },
  ];

  it('filters by class_id from URL params', () => {
    const params = new URLSearchParams('class_id=1');
    expect(filterIssuesByQuery(issues, params)).toHaveLength(1);
  });

  it('returns assignment missing issues', () => {
    expect(filterAssignmentMissingIssues(issues)).toHaveLength(2);
  });
});

describe('readiness presentation', () => {
  const basePayload: SetupReadinessPayload = {
    school: { id: 1, name: 'School' },
    scope: { type: 'school', is_full_school: true },
    readiness: {
      score: 93,
      status: 'blocked',
      blocking_issues: 3,
      warnings: 1,
      information: 0,
      ready_for_timetable_setup: false,
    },
    domains: {},
    issues: [],
  };

  it('shows blocked score label when status is blocked', () => {
    expect(readinessScoreLabel(basePayload, t)).toContain('readinessScoreBlocked');
  });

  it('translates readiness status key', () => {
    expect(readinessStatusLabel('ready', t)).toBe('tr:admin.academicSetup.readinessStatus.ready');
  });

  it('detects unavailable staff domain', () => {
    expect(isStaffDomainUnavailable({})).toBe(true);
    expect(isStaffDomainUnavailable({ staff: { score: 0, status: 'incomplete', summary: {} } })).toBe(false);
  });
});

describe('readiness i18n', () => {
  const tAr = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

  it('translates known issue codes', () => {
    const issue: SetupReadinessIssue = {
      id: '1',
      code: 'no_active_levels',
      severity: 'error',
      blocking: true,
      title: 'No active levels',
      description: 'The school has no active educational levels in scope.',
      domain: 'levels',
      target: { section: 'classes' },
    };
    expect(readinessIssueTitle(issue, tAr)).toBe('لا توجد مستويات نشطة');
    expect(readinessIssueDescription(issue, tAr)).toBe(
      'لا توجد مستويات تعليمية نشطة ضمن نطاق المدرسة.',
    );
  });

  it('falls back to API text for unknown issue codes', () => {
    const issue: SetupReadinessIssue = {
      id: '2',
      code: 'custom_issue',
      severity: 'info',
      blocking: false,
      title: 'Custom title',
      description: 'Custom description',
      domain: 'other',
      target: { section: 'overview' },
    };
    expect(readinessIssueTitle(issue, tAr)).toBe('Custom title');
    expect(readinessIssueDescription(issue, tAr)).toBe('Custom description');
  });

  it('translates quick action codes', () => {
    expect(
      quickActionLabel({ code: 'level_without_classes', section: 'classes', count: 1 }, tAr),
    ).toBe('مستويات بدون أقسام (1)');
  });
});

describe('api error mapping', () => {
  it('maps assignment_in_use', () => {
    const msg = mapAcademicSetupApiError({ code: 'assignment_in_use', message: '', details: {} }, t, 'assignment');
    expect(msg).toBe('tr:admin.academicSetup.errors.assignmentInUse');
  });

  it('maps privilege_escalation for staff', () => {
    const msg = mapAcademicSetupApiError({ code: 'privilege_escalation', message: '', details: {} }, t, 'staff');
    expect(msg).toBe('tr:admin.academicSetup.errors.privilegeEscalation');
  });

  it('maps suggestion reason codes', () => {
    expect(mapSuggestionReason('teaches_subject', t)).toBe('tr:admin.academicSetup.suggestReasons.teaches_subject');
  });
});

describe('class track_id payload', () => {
  it('includes track_id when set', () => {
    const payload = buildClassPayload({
      name: 'Class A',
      levelId: '5',
      trackId: '12',
      academicYearId: '',
      capacity: '',
      room: '',
      teacherIds: [],
      subjectIds: [],
      creating: true,
    });
    expect(payload.track_id).toBe(12);
  });

  it('clears track_id on update when empty', () => {
    const payload = buildClassPayload({
      name: 'Class A',
      levelId: '5',
      trackId: '',
      academicYearId: '',
      capacity: '',
      room: '',
      teacherIds: [],
      subjectIds: [],
      creating: false,
    });
    expect(payload.track_id).toBeNull();
  });
});

describe('globalSetupSearch', () => {
  it('finds staff and builds href', () => {
    const results = globalSetupSearch(
      'ali',
      [],
      [],
      [],
      [],
      [{ id: 9, name: 'Ali Staff', email: null, phone: null, job_title: null, admin_kind: 'admin_staff', active: true, account_status: 'active', schools: [], default_school: null, permissions: [] }],
    );
    expect(results[0]?.type).toBe('staff');
    expect(buildHref(results[0]!.href, results[0]!.query)).toContain('staff');
  });
});

describe('academic-setup permissions', () => {
  it('allows view with view_classes', () => {
    expect(canViewAcademicSetup(adminUser(['view_classes']))).toBe(true);
  });

  it('denies teacher role', () => {
    expect(
      canViewAcademicSetup({
        ...adminUser([]),
        role: 'teacher',
      }),
    ).toBe(false);
  });

  it('requires both manage perms for assignments', () => {
    expect(canManageTeachingAssignments(adminUser(['manage_classes']))).toBe(false);
    expect(
      canManageTeachingAssignments(adminUser(['manage_classes', 'manage_teachers'])),
    ).toBe(true);
  });

  it('allows school_manager to manage staff', () => {
    expect(canManageStaff(adminUser([]))).toBe(true);
  });

  it('detects academic setup paths', () => {
    expect(isAcademicSetupPath('/admin/settings/academic-setup/classes')).toBe(true);
    expect(isAcademicSetupPath('/admin/classes')).toBe(false);
  });
});
