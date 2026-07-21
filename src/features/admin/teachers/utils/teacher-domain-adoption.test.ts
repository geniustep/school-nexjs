import { describe, expect, it } from 'vitest';
import {
  assertBffRoutePolicy,
  BFF_ADMIN_FAMILIES,
  shouldBindActiveSchoolInBody,
} from '@/lib/api/bff-route-policy';
import { endpoints } from '@/lib/api/endpoints';
import { TEACHER_DOMAIN_BACKEND_CONTRACT } from '@/config/backend-contract';
import { TEACHER_DOMAIN_CONTRACT_VERSION } from '@/types/teacher-domain';
import ar from '../../../../../messages/ar.json';
import en from '../../../../../messages/en.json';
import fr from '../../../../../messages/fr.json';
import es from '../../../../../messages/es.json';

describe('teacher-domain adoption gates', () => {
  it('registers Teacher Domain contract metadata SSC-API-2026.07.001', () => {
    expect(TEACHER_DOMAIN_BACKEND_CONTRACT.contractId).toBe('SSC-API-2026.07.001');
    expect(TEACHER_DOMAIN_CONTRACT_VERSION).toBe('SSC-API-2026.07.001');
  });

  it('exposes typed endpoints without raw ORM bridges', () => {
    expect(endpoints.admin.teacherDomainContract).toBe('/admin/teacher-domain/contract');
    expect(endpoints.admin.teacherAcademicProfile(12)).toBe('/admin/teachers/12/academic-profile');
    expect(endpoints.admin.teacherTerminate(12)).toBe('/admin/teachers/12/terminate');
    expect(endpoints.admin.teachingAssignmentSuspend(4)).toBe(
      '/admin/teaching-assignments/4/suspend',
    );
    expect(JSON.stringify(endpoints.admin)).not.toMatch(/call_kw|search_read|execute_kw/);
  });

  it('allows teacher-domain family in BFF policy and binds active school', () => {
    expect(BFF_ADMIN_FAMILIES).toContain('teacher-domain');
    expect(assertBffRoutePolicy('/admin/teacher-domain/contract', 'GET')).toEqual({ ok: true });
    expect(assertBffRoutePolicy('/admin/teachers/1/academic-profile', 'GET')).toEqual({
      ok: true,
    });
    expect(assertBffRoutePolicy('/admin/teaching-assignments/1/end', 'POST')).toEqual({
      ok: true,
    });
    expect(shouldBindActiveSchoolInBody('/admin/teachers/1/archive', 'POST')).toBe(true);
    expect(shouldBindActiveSchoolInBody('/admin/teacher-domain/contract', 'GET')).toBe(false);
  });

  it('provides teacher domain i18n keys in ar/fr/en/es', () => {
    for (const messages of [ar, fr, en, es]) {
      expect(messages.nav.teachingAssignments).toBeTruthy();
      expect(messages.admin.teacherDomain.tabs.academic).toBeTruthy();
      expect(messages.admin.teacherDomain.errors.assignmentOverlap).toBeTruthy();
      expect(messages.admin.teachingPlanning.offerings.list.noData.title).toMatch(
        /فعال|active|actif|activos/i,
      );
    }
    expect(ar.admin.teacherDomain.academic.eligibleSubjects).toBe('المواد المؤهل لها');
    expect(ar.admin.teacherDomain.academic.eligibleCycles).toBe('الأسلاك المؤهل لها');
    expect(ar.admin.teacherDomain.academic.eligibleCyclesUnset).toBe(
      'لم تُحدّد الأسلاك المؤهل لها بعد',
    );
    expect(ar.admin.teachingPlanning.offerings.list.noData.title).toContain(
      'لا توجد مسارات تدريس فعالة',
    );
  });
});
