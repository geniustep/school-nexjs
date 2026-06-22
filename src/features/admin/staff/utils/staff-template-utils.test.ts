import { describe, expect, it } from 'vitest';
import {
  buildStaffTemplateCreatePayload,
  buildStaffTemplatePreviewPayload,
  buildStaffAssignmentClassOptions,
  buildStaffAssignmentLevelOptions,
  buildStaffAssignmentSubjectOptions,
  canSubmitStaffTemplateCreate,
  filterStaffAssignmentClasses,
  filterStaffAssignmentLevels,
  filterStaffAssignmentSubjects,
  formatStaffTemplatePreviewWarning,
  formatStaffTemplateRequiredField,
  groupStaffTemplatesByMainPosition,
  normalizeStaffTemplateRequiredFieldKey,
  normalizeStaffCreationTemplate,
  normalizeStaffCreationTemplates,
  normalizeStaffTemplateBundleSelection,
  normalizeStaffTemplateCreateResult,
  normalizeStaffTemplateMainPosition,
  normalizeStaffTemplatePreview,
  payloadContainsForbiddenClientFields,
  resolveAddableStaffTemplateBundleCodes,
  resolveInitialSelectedBundleCodes,
  resolvePreviewMissingAssignmentFields,
  isStaffTemplateBundleRemovable,
  resolveStaffTemplateAddBundleActionLabel,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateForBundleEditor,
  unionStaffTemplateBundleSelection,
  resolveStaffTemplateCapabilityItems,
  resolveStaffTemplateCapabilityLabel,
  splitStaffTemplateDisplayList,
  STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT,
  templateAllowsCreate,
  validateStaffTemplateAssignments,
} from './staff-template-utils';
import type { StaffCreationTemplate, StaffSmartCreateFormState, StaffTemplatePreview } from '@/types/staff-templates';

const t = (key: string) => key;

describe('staff-template-utils', () => {
  it('normalizes templates from array or envelope', () => {
    const raw = [
      {
        code: 'subject_teacher',
        name: 'Subject teacher',
        main_position: 'Teacher',
        required_assignments: ['subject_id', 'class_ids'],
      },
    ];
    expect(normalizeStaffCreationTemplates(raw)).toHaveLength(1);
    expect(normalizeStaffCreationTemplates({ templates: raw })).toHaveLength(1);
  });

  it('normalizes bundle_selection on template', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_selection: {
        default_bundle_codes: ['finance_collections', 'finance_receipts', 'cashdesk'],
        required_bundle_codes: ['finance_collections'],
        optional_bundle_codes: ['finance_cheques'],
        removable_bundle_codes: ['finance_cheques', 'cashdesk'],
        available_bundle_codes: ['finance_cheques'],
        forbidden_bundle_codes: ['payroll'],
      },
    });
    expect(template?.bundle_selection?.required_bundle_codes).toEqual(['finance_collections']);
    expect(template?.bundle_selection?.forbidden_bundle_codes).toEqual(['payroll']);
    expect(resolveInitialSelectedBundleCodes(template!)).toEqual([
      'finance_collections',
      'finance_receipts',
      'cashdesk',
    ]);
  });

  it('reads available bundles from bundle_policy and forbidden object codes', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_policy: {
        default_bundle_codes: ['finance_collections', 'finance_receipts', 'cashdesk'],
        optional_bundle_codes: ['finance_cheques'],
        available_bundle_codes: ['finance_cheques'],
        forbidden_bundle_codes: [{ code: 'hr_payroll', reason: 'Not allowed' }],
      },
    })!;
    expect(template.bundle_selection?.available_bundle_codes).toEqual(['finance_cheques']);
    expect(template.bundle_selection?.optional_bundle_codes).toEqual(['finance_cheques']);
    expect(template.bundle_selection?.forbidden_bundle_codes).toEqual(['hr_payroll']);
    expect(
      resolveAddableStaffTemplateBundleCodes(template, [
        'finance_collections',
        'finance_receipts',
        'cashdesk',
      ]),
    ).toEqual(['finance_cheques']);
  });

  it('shows localized add action label without raw bundle code', () => {
    const translate = (key: string, params?: Record<string, string | number>) => {
      if (key === 'admin.staffCenter.smartCreate.bundles.finance_cheques') return 'الشيكات';
      if (key === 'admin.staffCenter.smartCreate.addBundleNamedAction') return `إضافة ${params?.name ?? ''}`;
      return key;
    };
    expect(resolveStaffTemplateAddBundleActionLabel('finance_cheques', translate)).toBe('إضافة الشيكات');
    expect(resolveStaffTemplateAddBundleActionLabel('finance_cheques', translate)).not.toContain('finance_cheques');
  });

  it('returns removed optional bundle to addable pool', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_selection: {
        available_bundle_codes: ['finance_cheques'],
        optional_bundle_codes: ['finance_cheques'],
        removable_bundle_codes: ['cashdesk'],
      },
    })!;
    const withCheques = ['finance_collections', 'finance_receipts', 'cashdesk', 'finance_cheques'];
    const withoutCheques = ['finance_collections', 'finance_receipts', 'cashdesk'];
    expect(isStaffTemplateBundleRemovable(template, 'finance_cheques')).toBe(true);
    expect(resolveAddableStaffTemplateBundleCodes(template, withCheques)).toEqual([]);
    expect(resolveAddableStaffTemplateBundleCodes(template, withoutCheques)).toEqual(['finance_cheques']);
  });

  it('groups templates by main position', () => {
    const templates: StaffCreationTemplate[] = [
      { code: 'a', name: 'A', main_position: { code: 'finance_officer', name: 'Finance' } },
      { code: 'b', name: 'B', main_position: { code: 'teacher', name: 'Teacher' } },
      { code: 'c', name: 'C', main_position: { code: 'finance_officer', name: 'Finance' } },
    ];
    const groups = groupStaffTemplatesByMainPosition(templates);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === 'finance_officer')?.templates).toHaveLength(2);
  });

  it('normalizes main_position object from API', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'finance_manager_small_school',
      name: 'Finance manager',
      main_position: { code: 'finance_officer', name: 'مسؤول مالي' },
    });
    expect(template?.main_position?.name).toBe('مسؤول مالي');
  });

  it('builds preview payload with selected_bundle_codes and without capability_codes', () => {
    const payload = buildStaffTemplatePreviewPayload(
      'accountant_collections',
      3,
      { subject_id: null, class_ids: [], academic_year_id: null },
      ['finance_collections', 'finance_receipts', 'cashdesk', 'finance_cheques'],
    );
    expect(payload.template_code).toBe('accountant_collections');
    expect(payload.selected_bundle_codes).toEqual([
      'finance_collections',
      'finance_receipts',
      'cashdesk',
      'finance_cheques',
    ]);
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
  });

  it('builds preview payload for a template code without depending on another selected template', () => {
    const teacherPreview = buildStaffTemplatePreviewPayload('subject_teacher', 3, {}, ['teaching']);
    const accountantPreview = buildStaffTemplatePreviewPayload('accountant_collections', 3, {}, [
      'finance_collections',
    ]);
    expect(teacherPreview.template_code).toBe('subject_teacher');
    expect(accountantPreview.template_code).toBe('accountant_collections');
    expect(payloadContainsForbiddenClientFields(teacherPreview)).toBe(false);
    expect(payloadContainsForbiddenClientFields(accountantPreview)).toBe(false);
  });

  it('builds create payload with selected_bundle_codes', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'subject_teacher',
      name: 'Subject teacher',
      requires_user_account: true,
    })!;
    const form: StaffSmartCreateFormState = {
      templateCode: 'subject_teacher',
      selectedBundleCodes: ['teaching', 'attendance_limited'],
      person: { name: 'Math teacher', phone: '0600000000', email: 'teacher@example.com' },
      createAccount: true,
      assignPasswordNow: true,
      login: '',
      useDifferentLogin: false,
      password: 'Secret123',
      confirmPassword: 'Secret123',
      assignments: { subject_id: 12, class_ids: [5, 6], academic_year_id: 2 },
    };
    const payload = buildStaffTemplateCreatePayload(form, 3, template);
    expect(payload.selected_bundle_codes).toEqual(['teaching', 'attendance_limited']);
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
    expect(payload.account).toEqual({
      create: true,
      login: 'teacher@example.com',
      password: 'Secret123',
      password_confirm: 'Secret123',
    });
  });

  it('omits account block when assignPasswordNow is false', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'subject_teacher',
      name: 'Subject teacher',
      requires_user_account: true,
    })!;
    const form: StaffSmartCreateFormState = {
      templateCode: 'subject_teacher',
      selectedBundleCodes: ['teaching'],
      person: { name: 'Math teacher', phone: '0600000000', email: 'teacher@example.com' },
      createAccount: true,
      assignPasswordNow: false,
      login: '',
      useDifferentLogin: false,
      password: '',
      confirmPassword: '',
      assignments: { subject_id: 12, class_ids: [5], academic_year_id: 2 },
    };
    const payload = buildStaffTemplateCreatePayload(form, 3, template);
    expect(payload.account).toBeUndefined();
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
  });

  it('normalizes teacher create result with creation metadata', () => {
    const result = normalizeStaffTemplateCreateResult({
      user_id: 4706,
      teacher_id: 1306,
      template_code: 'subject_teacher',
      creation_template_code: 'subject_teacher',
      role_display_name: 'أستاذ مادة',
    });
    expect(result.teacher_id).toBe(1306);
    expect(result.creation_template_code).toBe('subject_teacher');
    expect(result.role_display_name).toBe('أستاذ مادة');
  });

  it('normalizes effective_capability_items and falls back to strings', () => {
    const preview = normalizeStaffTemplatePreview({
      allowed_to_create: true,
      effective_capability_items: [
        { code: 'finance.manage_cheques', label: 'إدارة الشيكات' },
      ],
      effective_capabilities: ['finance.collect_payments'],
    });
    expect(preview?.effective_capability_items?.[0]?.label).toBe('إدارة الشيكات');
    const allowed = resolveStaffTemplateCapabilityItems(preview, 'allowed');
    expect(allowed[0]?.label).toBe('إدارة الشيكات');
    const fallbackPreview: StaffTemplatePreview = {
      allowed_to_create: true,
      effective_capabilities: ['finance.collect_payments'],
    };
    expect(resolveStaffTemplateCapabilityItems(fallbackPreview, 'allowed')).toEqual([
      { code: 'finance.collect_payments' },
    ]);
  });

  it('prefers server label then local capability resolver', () => {
    const fromServer = resolveStaffTemplateCapabilityLabel(
      { code: 'finance.manage_cheques', label: 'إدارة الشيكات' },
      'ar',
      t,
    );
    expect(fromServer).toBe('إدارة الشيكات');
    const translate = (key: string) =>
      key === 'admin.staffCenter.smartCreate.capabilities.finance_collect_payments'
        ? 'تسجيل التحصيلات'
        : key;
    const local = resolveStaffTemplateCapabilityLabel(
      { code: 'finance.collect_payments' },
      'ar',
      translate,
    );
    expect(local).toBe('تسجيل التحصيلات');
  });

  it('disables create when allowed_to_create is false even with capabilities', () => {
    const template: StaffCreationTemplate = { code: 'subject_teacher', name: 'Teacher' };
    const preview: StaffTemplatePreview = {
      allowed_to_create: false,
      effective_capability_items: [{ code: 'finance.collect_payments', label: 'تحصيل' }],
    };
    const form: StaffSmartCreateFormState = {
      templateCode: 'subject_teacher',
      selectedBundleCodes: ['teaching', 'finance_collections'],
      person: { name: 'Teacher', phone: '', email: 't@example.com' },
      createAccount: true,
      assignPasswordNow: false,
      login: '',
      useDifferentLogin: false,
      password: '',
      confirmPassword: '',
      assignments: { subject_id: 1, class_ids: [2], academic_year_id: 3 },
    };
    expect(
      canSubmitStaffTemplateCreate({
        template,
        preview,
        form,
        passwordPolicy: {
          min_length: 8,
          requires_letter: true,
          requires_number: true,
        },
        t,
      }),
    ).toBe(false);
  });

  it('validates required assignments for subject teacher', () => {
    const template: StaffCreationTemplate = {
      code: 'subject_teacher',
      name: 'Subject teacher',
      required_assignments: ['subject_id', 'class_ids', 'academic_year_id'],
    };
    expect(
      validateStaffTemplateAssignments(
        template,
        { subject_id: null, class_ids: [], academic_year_id: null },
        t,
      ).valid,
    ).toBe(false);
  });

  it('formats required fields and preview warnings for display', () => {
    const translate = (key: string) => {
      if (key === 'admin.staffCenter.smartCreate.subject') return 'Subject';
      if (key === 'admin.staffCenter.smartCreate.classes') return 'Class';
      if (key === 'admin.staffCenter.smartCreate.academicYear') return 'Academic year';
      return key;
    };
    expect(formatStaffTemplateRequiredField('subject_id', translate)).toBe('Subject');
    expect(formatStaffTemplateRequiredField('class id', translate)).toBe('Class');
    expect(formatStaffTemplateRequiredField('class_id', translate)).toBe('Class');
    expect(formatStaffTemplateRequiredField('academic_year_id', translate)).toBe('Academic year');
    expect(
      formatStaffTemplatePreviewWarning(
        'blocked:Template subject_teacher requires assignments: subject_id',
        t,
      ),
    ).toBe('admin.staffCenter.smartCreate.warnings.blockedCreation');
  });

  it('normalizes required field keys and hides filled assignment fields from preview gaps', () => {
    expect(normalizeStaffTemplateRequiredFieldKey('class id')).toBe('class_ids');
    expect(normalizeStaffTemplateRequiredFieldKey('class_id')).toBe('class_ids');
    const preview: StaffTemplatePreview = {
      allowed_to_create: false,
      required_fields: ['subject_id', 'class_ids', 'academic_year_id'],
    };
    expect(
      resolvePreviewMissingAssignmentFields(preview, {
        subject_id: 10,
        class_ids: [20],
        academic_year_id: 30,
      }),
    ).toEqual([]);
  });

  it('filters assignment options by cycle, level, and year when metadata exists', () => {
    const levels = buildStaffAssignmentLevelOptions([
      { id: 1, name: 'First primary', cycle: { code: 'primary' } },
      { id: 2, name: 'First middle', cycle: { code: 'college' } },
    ]);
    expect(filterStaffAssignmentLevels(levels, 'primary').map((item) => item.id)).toEqual([1]);

    const subjects = buildStaffAssignmentSubjectOptions([
      { id: 10, name: 'Arabic', level_ids: [1] },
      { id: 11, name: 'Physics', level_ids: [2] },
    ]);
    expect(filterStaffAssignmentSubjects(subjects, 1).map((item) => item.id)).toEqual([10]);

    const classes = buildStaffAssignmentClassOptions(
      [
        { id: 100, name: '1A', level: { id: 1 } },
        { id: 101, name: '2B', level: { id: 2 } },
      ],
      [
        { id: 100, academic_year_id: 5 },
        { id: 101, academic_year_id: 6 },
      ],
    );
    expect(filterStaffAssignmentClasses(classes, 1, 5).map((item) => item.id)).toEqual([100]);
  });

  it('resolves addable bundle codes excluding selected and forbidden', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_selection: {
        available_bundle_codes: ['finance_cheques', 'payroll'],
        forbidden_bundle_codes: ['payroll'],
      },
    })!;
    expect(
      resolveAddableStaffTemplateBundleCodes(template, [
        'finance_collections',
        'finance_receipts',
        'cashdesk',
      ]),
    ).toEqual(['finance_cheques']);
  });

  it('normalizes create result staff.user_id', () => {
    expect(
      normalizeStaffTemplateCreateResult({
        staff: { user_id: 42, name: 'QA Staff' },
      }).user_id,
    ).toBe(42);
  });

  it('detects forbidden capability_codes in payload', () => {
    expect(payloadContainsForbiddenClientFields({ capability_codes: ['x'] })).toBe(true);
  });

  it('splits display lists with overflow count', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const split = splitStaffTemplateDisplayList(items, STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT);
    expect(split.visible).toHaveLength(STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT);
    expect(split.overflowCount).toBe(1);
  });

  it('normalizes standalone bundle selection helper', () => {
    expect(
      normalizeStaffTemplateBundleSelection({
        required_bundle_codes: ['teaching'],
      })?.required_bundle_codes,
    ).toEqual(['teaching']);
  });

  it('treats optional bundles as removable even when missing from removable_bundle_codes', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_selection: {
        required_bundle_codes: ['finance_collections'],
        optional_bundle_codes: ['finance_cheques'],
        available_bundle_codes: ['finance_cheques'],
        removable_bundle_codes: ['finance_receipts', 'cashdesk'],
      },
    })!;
    expect(isStaffTemplateBundleRemovable(template, 'finance_cheques')).toBe(true);
    expect(isStaffTemplateBundleRemovable(template, 'finance_collections')).toBe(false);
    expect(isStaffTemplateBundleRemovable(template, 'cashdesk')).toBe(true);
  });

  it('blocks default bundles not marked optional or removable when removable list exists', () => {
    const template = normalizeStaffCreationTemplate({
      code: 'custom',
      name: 'Custom',
      bundle_selection: {
        required_bundle_codes: ['core'],
        default_bundle_codes: ['core', 'extra_default'],
        removable_bundle_codes: ['other'],
      },
    })!;
    expect(isStaffTemplateBundleRemovable(template, 'extra_default')).toBe(false);
    expect(isStaffTemplateBundleRemovable(template, 'other')).toBe(true);
  });

  it('preserves base optional bundles when merging preview bundle policy', () => {
    const base = normalizeStaffCreationTemplate({
      code: 'accountant_collections',
      name: 'Accountant',
      bundle_selection: {
        optional_bundle_codes: ['finance_cheques'],
        available_bundle_codes: ['finance_cheques'],
      },
    })!;
    const preview: StaffTemplatePreview = {
      allowed_to_create: true,
      bundle_selection: {
        removable_bundle_codes: ['cashdesk'],
      },
    };
    const merged = resolveStaffTemplateForBundleEditor(base, preview)!;
    expect(merged.bundle_selection?.optional_bundle_codes).toEqual(['finance_cheques']);
    expect(isStaffTemplateBundleRemovable(merged, 'finance_cheques')).toBe(true);
    expect(
      unionStaffTemplateBundleSelection(base.bundle_selection, preview.bundle_selection)
        ?.optional_bundle_codes,
    ).toEqual(['finance_cheques']);
  });

  it('normalizes preview bundle_policy without dropping optional metadata', () => {
    const preview = normalizeStaffTemplatePreview({
      allowed_to_create: true,
      bundle_policy: {
        removable_bundle_codes: ['cashdesk'],
      },
    });
    expect(preview?.bundle_selection?.removable_bundle_codes).toEqual(['cashdesk']);
  });
});
