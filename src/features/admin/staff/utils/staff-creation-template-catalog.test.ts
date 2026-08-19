import { describe, expect, it } from 'vitest';
import type { StaffOptions } from '@/types/academic-setup';
import {
  buildCatalogStaffCreationTemplate,
  buildClientCatalogTemplatePreview,
  isAdminKindAvailableInStaffOptions,
  mergeStaffCreationTemplatesWithCatalog,
  PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
  prepareStaffCreationTemplatesForDisplay,
} from './staff-creation-template-catalog';

const t = (key: string) => {
  const labels: Record<string, string> = {
    'admin.staffCenter.creationTemplates.pedagogical_director': 'مدير تربوي',
    'admin.staffCenter.smartCreate.templates.pedagogical_director.description':
      'مسؤول أكاديمي وتربوي يتابع الأساتذة، الأقسام، المواد، الحضور، استعمال الزمن، والنتائج دون صلاحيات مالية افتراضية.',
    'admin.staffCenter.smartCreate.mainPositions.senior_administration': 'الإدارة العليا',
  };
  return labels[key] ?? key;
};

const optionsWithPedagogicalDirector: StaffOptions = {
  admin_kinds: [
    { value: 'school_manager', label: 'School manager' },
    { value: 'pedagogical_director', label: 'مدير تربوي' },
  ],
  schools: [],
  capabilities: [],
};

describe('staff-creation-template-catalog', () => {
  it('hides retired create-page templates by code and renames general supervisor in Arabic', () => {
    const templates = prepareStaffCreationTemplatesForDisplay(
      [
        { code: 'homeroom_teacher', name: 'أستاذ قسم مسؤولية' },
        { code: 'subject_teacher', name: 'أستاذ مادة' },
        { code: 'school_principal_basic', name: 'مدير مدرسة (أساسي)' },
        {
          code: 'general_supervisor_basic',
          name: 'مشرف عام (أساسي)',
          main_position: { code: 'general_supervisor', name: 'مشرف عام' },
        },
        { code: 'receptionist_admissions', name: 'استقبال وتسجيل' },
      ],
      'ar',
    );

    expect(templates.map((template) => template.code)).toEqual([
      'general_supervisor_basic',
      'receptionist_admissions',
    ]);
    expect(templates[0]?.name).toBe('حارس عام (أساسي)');
    expect(templates[0]?.main_position?.name).toBe('حارس عام');
  });

  it('keeps the general supervisor server label unchanged outside Arabic', () => {
    const templates = prepareStaffCreationTemplatesForDisplay(
      [
        {
          code: 'general_supervisor_basic',
          name: 'General supervisor (basic)',
          main_position: { code: 'general_supervisor', name: 'General supervisor' },
        },
      ],
      'fr',
    );

    expect(templates[0]?.name).toBe('General supervisor (basic)');
    expect(templates[0]?.main_position?.name).toBe('General supervisor');
  });

  it('detects pedagogical_director in staff options', () => {
    expect(isAdminKindAvailableInStaffOptions('pedagogical_director', optionsWithPedagogicalDirector)).toBe(
      true,
    );
    expect(isAdminKindAvailableInStaffOptions('pedagogical_director', { ...optionsWithPedagogicalDirector, admin_kinds: [] })).toBe(
      false,
    );
  });

  it('builds pedagogical director template without finance bundles', () => {
    const template = buildCatalogStaffCreationTemplate(
      {
        code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
        admin_kind: 'pedagogical_director',
        nameKey: 'admin.staffCenter.creationTemplates.pedagogical_director',
        descriptionKey: 'admin.staffCenter.smartCreate.templates.pedagogical_director.description',
        mainPositionCode: 'senior_administration',
        mainPositionKey: 'admin.staffCenter.smartCreate.mainPositions.senior_administration',
        requires_user_account: true,
        bundle_codes: [],
        bundle_selection: {
          forbidden_bundle_codes: ['finance_collections', 'cashdesk'],
        },
      },
      t,
    );

    expect(template.code).toBe('pedagogical_director');
    expect(template.client_catalog).toBe(true);
    expect(template.admin_kind).toBe('pedagogical_director');
    expect(template.name).toBe('مدير تربوي');
    expect(template.bundle_codes).toEqual([]);
    expect(template.bundle_selection?.forbidden_bundle_codes).toEqual([
      'finance_collections',
      'cashdesk',
    ]);
    expect(template.requires_user_account).toBe(true);
  });

  it('merges catalog template when API list omits pedagogical_director', () => {
    const merged = mergeStaffCreationTemplatesWithCatalog(
      [{ code: 'subject_teacher', name: 'Subject teacher' }],
      optionsWithPedagogicalDirector,
      t,
    );

    expect(merged).toHaveLength(2);
    expect(merged.some((item) => item.code === PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE)).toBe(true);
  });

  it('prefers API template when pedagogical_director already exists', () => {
    const merged = mergeStaffCreationTemplatesWithCatalog(
      [{ code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE, name: 'From API' }],
      optionsWithPedagogicalDirector,
      t,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('From API');
  });

  it('hides catalog template when pedagogical_director is missing from staff options', () => {
    const merged = mergeStaffCreationTemplatesWithCatalog(
      [],
      {
        admin_kinds: [{ value: 'school_manager', label: 'School manager' }],
        schools: [],
        capabilities: [],
      },
      t,
    );

    expect(merged).toHaveLength(0);
  });

  it('builds local preview for client catalog templates without backend template', () => {
    const template = buildCatalogStaffCreationTemplate(
      {
        code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
        admin_kind: 'pedagogical_director',
        nameKey: 'admin.staffCenter.creationTemplates.pedagogical_director',
        descriptionKey: 'admin.staffCenter.smartCreate.templates.pedagogical_director.description',
        mainPositionCode: 'senior_administration',
        mainPositionKey: 'admin.staffCenter.smartCreate.mainPositions.senior_administration',
        requires_user_account: true,
      },
      t,
    );
    const preview = buildClientCatalogTemplatePreview({
      template,
      options: {
        ...optionsWithPedagogicalDirector,
        capabilities: [
          { id: 1, code: 'view_teachers', label: 'View teachers', category: 'teachers', grantable: true },
          { id: 2, code: 'finance.collect_payments', label: 'Collect', category: 'finance', grantable: true },
        ],
      },
      selectedBundleCodes: [],
      t: (key) => {
        if (key === 'admin.academicSetup.roleCapabilities.pedagogical_director.highlight1') {
          return 'الإشراف على الأساتذة والأقسام';
        }
        return key;
      },
    });

    expect(preview.allowed_to_create).toBe(true);
    expect(preview.effective_capability_items?.length).toBeGreaterThan(0);
    expect(preview.forbidden_capability_items?.some((item) => item.code.includes('finance'))).toBe(
      true,
    );
  });
});
