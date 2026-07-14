import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applicationStatusLabelKey,
  applicationStatusTone,
  resolveApplicationStatus,
  statusesForWorkspace,
} from './admission-modern-status';
import {
  filterDailyModernActions,
  hasModernContract,
  isModernActionAllowed,
  resolvePrimaryNextActionCode,
  resolveStudentNavigation,
} from './admission-modern-actions';
import { formatLastActionSummary } from './admission-last-action-display';
import { validateLogContact, validateReject, validateAccept } from './admission-action-validation';
import { mapAdmissionActionError } from './admission-action-errors';
import { endpoints } from '@/lib/api/endpoints';

describe('admission modern contract', () => {
  it('uses application_status as the only primary status source', () => {
    expect(resolveApplicationStatus({ application_status: 'accepted' })).toBe('accepted');
    expect(resolveApplicationStatus({ application_status: undefined })).toBeNull();
    expect(resolveApplicationStatus({} as { application_status?: unknown; state?: string })).toBeNull();
    // Extra legacy fields must not drive status; only application_status counts.
    expect(
      resolveApplicationStatus({
        application_status: 'accepted',
      }),
    ).toBe('accepted');
    expect(resolveApplicationStatus({ application_status: null })).toBeNull();
  });

  it('distinguishes accepted, ready_for_registration, and registered', () => {
    expect(applicationStatusTone('accepted')).not.toBe(applicationStatusTone('ready_for_registration'));
    expect(applicationStatusTone('ready_for_registration')).not.toBe(applicationStatusTone('registered'));
    expect(applicationStatusLabelKey('accepted')).toContain('accepted');
    expect(applicationStatusLabelKey('ready_for_registration')).toContain('ready_for_registration');
    expect(applicationStatusLabelKey('registered')).toContain('registered');
  });

  it('formats last_action with actor for list and header', () => {
    const summary = formatLastActionSummary({
      result: 'no_answer',
      result_label: 'لم يجب',
      actor_name: 'سلمى أمين',
      occurred_at: '2026-07-12T10:00:00Z',
    });
    expect(summary.parts).toContain('لم يجب');
    expect(summary.parts).toContain('سلمى أمين');
    expect(formatLastActionSummary(null).key).toBe('admin.admissions.lastAction.none');
  });

  it('resolves primary_next_action=log_contact', () => {
    expect(resolvePrimaryNextActionCode({ code: 'log_contact' })).toBe('log_contact');
    expect(resolvePrimaryNextActionCode('accept')).toBe('accept');
  });

  it('validates quick follow-up rules', () => {
    expect(validateLogContact({ result: 'no_answer' })).toBeNull();
    expect(validateLogContact({ result: 'call_later' })).not.toBeNull();
    expect(validateLogContact({ result: 'call_later', next_action_date: '2026-07-15' })).toBeNull();
    expect(validateLogContact({ result: 'appointment_scheduled' })).not.toBeNull();
    expect(
      validateLogContact({ result: 'appointment_scheduled', scheduled_at: '2026-07-15T10:00' }),
    ).toBeNull();
    expect(validateLogContact({ result: 'other' })).not.toBeNull();
    expect(validateLogContact({ result: 'other', note: 'ملاحظة' })).toBeNull();
  });

  it('accepts optional note and requires reject reason', () => {
    expect(validateAccept({})).toBeNull();
    expect(validateReject({})).not.toBeNull();
    expect(validateReject({ reason: 'لا مقاعد' })).toBeNull();
  });

  it('gates compounded family action on modern_allowed_actions only', () => {
    expect(
      isModernActionAllowed([{ code: 'accept_and_record_family_approval', allowed: true }], 'accept_and_record_family_approval'),
    ).toBe(true);
    expect(
      isModernActionAllowed([{ code: 'accept', allowed: true }], 'accept_and_record_family_approval'),
    ).toBe(false);
  });

  it('excludes start_registration and link_existing_student from daily actions', () => {
    expect(
      filterDailyModernActions([
        'start_registration',
        'link_existing_student',
        'convert_to_student',
        'accept',
      ]).map((a) => a.code),
    ).toEqual(['convert_to_student', 'accept']);
  });

  it('reads student navigation and treats registered as actionless', () => {
    expect(
      resolveStudentNavigation({ student: { available: true, id: 44, href: '/admin/students/44' } })
        ?.href,
    ).toBe('/admin/students/44');
    expect(filterDailyModernActions([])).toEqual([]);
    expect(hasModernContract({ application_status: 'registered', modern_allowed_actions: [] })).toBe(
      true,
    );
  });

  it('maps conflict and family-approval errors', () => {
    expect(mapAdmissionActionError({ code: 'FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION' })).toContain(
      'FAMILY_APPROVAL',
    );
    expect(mapAdmissionActionError({ status: 409 })).toContain('conflict');
    expect(
      mapAdmissionActionError({
        blocking_reasons: [{ message: 'بانتظار موافقة الأسرة' }],
      }),
    ).toContain('بانتظار موافقة الأسرة');
  });

  it('keeps assigned_user from blocking allowed modern actions', () => {
    const record = {
      assigned_user: null,
      application_status: 'follow_up',
      modern_allowed_actions: [{ code: 'log_contact', allowed: true }],
      primary_next_action: { code: 'log_contact' },
    };
    expect(hasModernContract(record)).toBe(true);
    expect(isModernActionAllowed(record.modern_allowed_actions, 'log_contact')).toBe(true);
  });

  it('never introduces attention_level and exposes /actions endpoint', () => {
    expect(endpoints.admin.admissionActions(9)).toBe('/admin/admissions/9/actions');
    const files = [
      'admission-modern-status.ts',
      'admission-primary-action-panel.tsx',
      'admission-list-actions-menu.tsx',
    ];
    for (const file of files) {
      const path = resolve(
        process.cwd(),
        file.endsWith('.tsx')
          ? `src/features/admin/admissions/components/${file}`
          : `src/features/admin/admissions/utils/${file}`,
      );
      const source = readFileSync(path, 'utf8');
      expect(source).not.toContain('attention_level');
    }
    const actionsUtil = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/utils/admission-modern-actions.ts'),
      'utf8',
    );
    expect(actionsUtil).not.toContain('attention_level');
    expect(actionsUtil).toContain("action.code !== 'start_registration'");
  });

  it('maps workspaces to application_status groups', () => {
    expect(statusesForWorkspace('follow_up')).toContain('follow_up');
    expect(statusesForWorkspace('post_acceptance')).toEqual([
      'accepted',
      'ready_for_registration',
    ]);
    expect(statusesForWorkspace('closed')).toContain('registered');
  });

  it('keeps kanban and list menus free of status picker and drag mutation', () => {
    const kanban = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    const listPage = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/components/admissions-list-page.tsx'),
      'utf8',
    );
    const menu = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/components/admission-list-actions-menu.tsx'),
      'utf8',
    );
    expect(kanban).toContain('allowDrag = false');
    expect(listPage).toContain('allowDrag={false}');
    expect(listPage).toContain('admissions-bulk-disabled');
    expect(menu).not.toContain('handleFollowUpState');
    expect(menu).not.toContain('changeFollowUp');
    expect(menu).toContain('executeAdmissionAction');
    expect(menu).toContain('AdmissionQuickFollowUpDialog');
  });
});
