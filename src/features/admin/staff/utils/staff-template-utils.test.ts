import { describe, expect, it } from 'vitest';
import {
  buildStaffTemplateCreatePayload,
  buildStaffTemplatePreviewPayload,
  buildClientCatalogStaffMemberPayload,
  resolveStaffSmartCreateSaveStrategy,
  staffMemberToTemplateCreateResult,
  buildStaffAssignmentClassOptions,
  buildStaffAssignmentLevelOptions,
  buildStaffAssignmentSubjectOptions,
  formatStaffAssignmentSubjectLabel,
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
  normalizeStaffTemplateAssignments,
  normalizeStaffTemplateClassIds,
  addStaffTemplateClassId,
  removeStaffTemplateClassId,
  toggleStaffTemplateClassId,
  addStaffTemplateSubjectId,
  removeStaffTemplateSubjectId,
  toggleStaffTemplateSubjectId,
  pruneStaffTemplateClassIds,
  assignmentsSatisfyTemplateRequirements,
  isStaffTemplateBundleRemovable,
  resolveStaffTemplateAddBundleActionLabel,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateForBundleEditor,
  unionStaffTemplateBundleSelection,
  resolveStaffTemplateCapabilityItems,
  resolveStaffTemplateCapabilityLabel,
  collectStaffSmartCreateFormIssues,
  resolveStaffTemplateCreateBlockMessageKey,
  splitStaffTemplateDisplayList,
  STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT,
  templateAllowsCreate,
  isValidStaffContactEmail,
  staffTemplatePersonRequiresEmail,
  validateStaffTemplateAssignments,
  validateStaffTemplatePersonForm,
} from './staff-template-utils';
import { PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE } from './staff-creation-template-catalog';
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
      person: {
        name: 'Math teacher',
        name_ar: 'أستاذ الرياضيات',
        name_fr: 'Professeur de mathématiques',
        account_activation_language: 'ar',
        phone: '0600000000',
        email: 'teacher@example.com',
      },
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
    expect(payload.person).toMatchObject({
      name_ar: 'أستاذ الرياضيات',
      name_fr: 'Professeur de mathématiques',
      account_activation_language: 'ar',
    });
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
      if (key === 'admin.staffCenter.smartCreate.subjects') return 'Subject';
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

  it('normalizes class_ids to numeric arrays and treats filled assignments as complete', () => {
    expect(normalizeStaffTemplateClassIds(['2053', 2054, 'bad', 0])).toEqual([2053, 2054]);
    expect(normalizeStaffTemplateClassIds([])).toEqual([]);

    const normalized = normalizeStaffTemplateAssignments({
      subject_id: '1885' as unknown as number,
      class_ids: ['2053'] as unknown as number[],
      academic_year_id: '1387' as unknown as number,
    });
    expect(normalized).toEqual({
      subject_ids: [1885],
      subject_id: 1885,
      class_ids: [2053],
      academic_year_id: 1387,
    });

    const multiSubjects = normalizeStaffTemplateAssignments({
      subject_ids: [1885, 1900],
      class_ids: [2053],
      academic_year_id: 1387,
    });
    expect(multiSubjects.subject_ids).toEqual([1885, 1900]);
    expect(multiSubjects.subject_id).toBe(1885);

    const preview: StaffTemplatePreview = {
      allowed_to_create: false,
      required_fields: ['subject_id', 'class_ids', 'academic_year_id'],
    };
    expect(resolvePreviewMissingAssignmentFields(preview, normalized)).toEqual([]);

    const template = {
      code: 'subject_teacher',
      name: 'Teacher',
      required_assignments: ['subject_id', 'class_ids', 'academic_year_id'],
    };
    expect(assignmentsSatisfyTemplateRequirements(template, normalized)).toBe(true);
    expect(assignmentsSatisfyTemplateRequirements(template, multiSubjects)).toBe(true);
  });

  it('adds multiple subject_ids and includes them in preview payload', () => {
    let subjectIds = addStaffTemplateSubjectId([], 1885);
    subjectIds = addStaffTemplateSubjectId(subjectIds, 1900);
    expect(subjectIds).toEqual([1885, 1900]);

    const payload = buildStaffTemplatePreviewPayload('subject_teacher', 3, {
      subject_ids: subjectIds,
      class_ids: [2053],
      academic_year_id: 1387,
    });
    expect(payload.assignments.subject_ids).toEqual([1885, 1900]);
    expect(payload.assignments.subject_id).toBe(1885);
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
  });

  it('adds and removes class_ids without dropping prior selections', () => {
    expect(addStaffTemplateClassId([], 2053)).toEqual([2053]);
    expect(addStaffTemplateClassId([2053], 2054)).toEqual([2053, 2054]);
    expect(addStaffTemplateClassId([2053], 2053)).toEqual([2053]);
    expect(addStaffTemplateClassId([2053], 2054)).not.toEqual([2054]);

    expect(removeStaffTemplateClassId([2053, 2054], 2053)).toEqual([2054]);
    expect(removeStaffTemplateClassId([2054], 2053)).toEqual([2054]);

    expect(toggleStaffTemplateClassId([], 2053)).toEqual([2053]);
    expect(toggleStaffTemplateClassId([2053], 2054)).toEqual([2053, 2054]);
    expect(toggleStaffTemplateClassId([2053, 2054], 2053)).toEqual([2054]);
  });

  it('prunes class_ids only when explicitly filtered against a catalog', () => {
    expect(pruneStaffTemplateClassIds([2053, 2054, 2099], [2053, 2054])).toEqual([2053, 2054]);
    expect(pruneStaffTemplateClassIds([2053], [2054])).toEqual([]);
    expect(pruneStaffTemplateClassIds(['2053'] as unknown as number[], [2053])).toEqual([2053]);
  });

  it('keeps cross-level class_ids when adding from different levels', () => {
    const levelSixA = addStaffTemplateClassId([], 2053);
    const multiLevel = addStaffTemplateClassId(levelSixA, 3050);
    expect(multiLevel).toEqual([2053, 3050]);
    expect(removeStaffTemplateClassId(multiLevel, 2053)).toEqual([3050]);
  });

  it('treats empty class_ids as missing and multi-class arrays as complete', () => {
    const preview: StaffTemplatePreview = {
      allowed_to_create: false,
      required_fields: ['class_ids'],
    };
    expect(resolvePreviewMissingAssignmentFields(preview, { class_ids: [] })).toEqual(['class_ids']);
    expect(resolvePreviewMissingAssignmentFields(preview, { class_ids: [2053] })).toEqual([]);
    expect(resolvePreviewMissingAssignmentFields(preview, { class_ids: [2053, 2054] })).toEqual([]);

    const payload = buildStaffTemplatePreviewPayload('subject_teacher', 3, {
      subject_id: 1885,
      class_ids: [2053, 2054],
      academic_year_id: 1387,
    });
    expect(payload.assignments.class_ids).toEqual([2053, 2054]);
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
  });

  it('ignores unknown required_fields tokens from preview', () => {
    const preview: StaffTemplatePreview = {
      allowed_to_create: false,
      required_fields: ['subject_id', 'mystery_field'],
    };
    expect(
      resolvePreviewMissingAssignmentFields(preview, {
        subject_id: 1,
        class_ids: [2],
        academic_year_id: 3,
      }),
    ).toEqual([]);
  });

  it('filters assignment options by cycle, level, and year when metadata exists', () => {
    const levels = buildStaffAssignmentLevelOptions([
      { id: 1, name: 'First primary', cycle: { code: 'primary' } },
      { id: 2, name: 'First middle', cycle: { code: 'college' } },
    ]);
    expect(filterStaffAssignmentLevels(levels, 'primary').map((item) => item.id)).toEqual([1]);

    const subjects = buildStaffAssignmentSubjectOptions(
      [
        { id: 10, name: 'Arabic', level_ids: [1] },
        { id: 11, name: 'Physics', level_ids: [2] },
      ],
      [
        { id: 1, name: 'First primary', cycleCode: 'primary' },
        { id: 2, name: 'First middle', cycleCode: 'college' },
      ],
    );
    expect(subjects[0]?.label).toBe('Arabic (First primary)');
    expect(subjects[1]?.label).toBe('Physics (First middle)');
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

  it('formats subject labels with level names for duplicate subject UX', () => {
    const levelNameById = new Map<number, string>([
      [1, 'السنة الأولى'],
      [2, 'السنة الثانية'],
    ]);
    expect(formatStaffAssignmentSubjectLabel('اللغة العربية', [1], levelNameById)).toBe(
      'اللغة العربية (السنة الأولى)',
    );
    expect(formatStaffAssignmentSubjectLabel('اللغة العربية', [1, 2], levelNameById)).toBe(
      'اللغة العربية (السنة الأولى، السنة الثانية)',
    );
    expect(formatStaffAssignmentSubjectLabel('الرياضيات', [], levelNameById)).toBe('الرياضيات');
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

  it('smartCreate success i18n keys are human-readable labels', async () => {
    const ar = (await import('../../../../../messages/ar.json')).default;
    const smartCreate = ar.admin.staffCenter.smartCreate;
    const keys = [
      'successTitle',
      'createSuccess',
      'openTeacherProfile',
      'openStaffProfile',
      'manageAccountPermissions',
      'createAnother',
    ] as const;

    for (const key of keys) {
      const value = smartCreate[key];
      expect(typeof value).toBe('string');
      expect(value).toBeTruthy();
      expect(value).not.toMatch(/^admin\.staffCenter\./);
      expect(value).not.toContain('smartCreate.');
    }

    expect(smartCreate.openTeacherProfile).toBe('فتح ملف الأستاذ');
  });

  it('resolves create block reasons for preview and form validation', () => {
    const template: StaffCreationTemplate = {
      code: 'pedagogical_director',
      name: 'Pedagogical Director',
      requires_user_account: true,
    };
    const passwordPolicy = {
      min_length: 8,
      requires_letter: true,
      requires_number: true,
    };
    const emptyForm: StaffSmartCreateFormState = {
      templateCode: 'pedagogical_director',
      person: { name: '', phone: '', email: '' },
      createAccount: true,
      assignPasswordNow: true,
      login: '',
      useDifferentLogin: false,
      password: '',
      confirmPassword: '',
      selectedBundleCodes: [],
      assignments: {},
    };

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: null,
        previewLoading: true,
        form: emptyForm,
        passwordPolicy,
      }),
    ).toBe('admin.staffCenter.smartCreate.errors.createBlockedPreviewLoading');

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: { allowed_to_create: false },
        form: emptyForm,
        passwordPolicy,
      }),
    ).toBe('admin.staffCenter.smartCreate.errors.createBlockedNotAllowed');

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: { allowed_to_create: true },
        form: emptyForm,
        passwordPolicy,
      }),
    ).toBe('admin.staffCenter.smartCreate.errors.nameRequired');

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: { allowed_to_create: true },
        form: {
          ...emptyForm,
          person: { name: 'Test User', phone: '', email: 'test@example.com' },
          password: 'Secret123!',
          confirmPassword: 'Secret123!',
        },
        passwordPolicy,
      }),
    ).toBeNull();
  });

  it('collects live form validation issues for details step', () => {
    const template: StaffCreationTemplate = {
      code: 'pedagogical_director',
      name: 'Pedagogical Director',
      requires_user_account: true,
    };
    const issues = collectStaffSmartCreateFormIssues({
      template,
      form: {
        templateCode: 'pedagogical_director',
        person: { name: '', phone: '', email: '' },
        createAccount: true,
        assignPasswordNow: false,
        login: '',
        useDifferentLogin: false,
        password: '',
        confirmPassword: '',
        selectedBundleCodes: [],
        assignments: {},
      },
      passwordPolicy: { min_length: 8, requires_letter: true, requires_number: true },
      preview: null,
      previewLoading: true,
      previewError: false,
      needsAssignments: false,
    });

    expect(issues.find((item) => item.id === 'identity_name')?.ok).toBe(false);
    expect(issues.find((item) => item.id === 'account_password')?.ok).toBe(false);
    expect(issues.find((item) => item.id === 'preview_ready')?.ok).toBe(false);
  });

  it('routes backend templates to from-template and local catalog to staff member create', () => {
    expect(
      resolveStaffSmartCreateSaveStrategy({
        code: 'subject_teacher',
        name: 'Subject teacher',
      }),
    ).toBe('from_template');

    expect(
      resolveStaffSmartCreateSaveStrategy({
        code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
        name: 'Pedagogical director',
        client_catalog: true,
        admin_kind: 'pedagogical_director',
      }),
    ).toBe('staff_member');
  });

  it('builds staff member payload for local pedagogical_director without template_code', () => {
    const template: StaffCreationTemplate = {
      code: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
      name: 'مدير تربوي',
      client_catalog: true,
      admin_kind: 'pedagogical_director',
      main_position: { code: 'senior_administration', name: 'الإدارة العليا' },
      requires_user_account: true,
    };
    const form: StaffSmartCreateFormState = {
      templateCode: PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE,
      selectedBundleCodes: [],
      person: {
        name: 'أحمد',
        name_ar: 'أحمد العلوي',
        name_fr: 'Ahmed Alaoui',
        account_activation_language: 'fr',
        phone: '0600000000',
        email: 'ahmed@school.test',
      },
      createAccount: true,
      assignPasswordNow: true,
      login: '',
      useDifferentLogin: false,
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
      assignments: {},
    };

    const memberPayload = buildClientCatalogStaffMemberPayload(form, template);
    const templatePayload = buildStaffTemplateCreatePayload(form, 3, template);

    expect(memberPayload.admin_kind).toBe('pedagogical_director');
    expect(memberPayload.name).toBe('أحمد');
    expect(memberPayload.email).toBe('ahmed@school.test');
    expect(memberPayload.name_ar).toBe('أحمد العلوي');
    expect(memberPayload.name_fr).toBe('Ahmed Alaoui');
    expect(memberPayload.account_activation_language).toBe('fr');
    expect(memberPayload.job_title).toBe('الإدارة العليا');
    expect(memberPayload.template_code).toBeUndefined();
    expect(memberPayload.selected_bundle_codes).toBeUndefined();
    expect(memberPayload.capability_ids).toBeUndefined();
    expect(memberPayload.account).toEqual({
      create: true,
      login: 'ahmed@school.test',
      password: 'Secret123!',
      password_confirm: 'Secret123!',
    });

    expect(templatePayload.template_code).toBe(PEDAGOGICAL_DIRECTOR_TEMPLATE_CODE);
  });

  it('maps staff member create response into smart-create success result', () => {
    const result = staffMemberToTemplateCreateResult({
      id: 99,
      user_id: 4706,
      name: 'أحمد',
      email: 'ahmed@school.test',
      phone: null,
      job_title: 'الإدارة العليا',
      admin_kind: 'pedagogical_director',
      active: true,
      account_status: 'active',
      schools: [],
      default_school: null,
      permissions: [],
    });

    expect(result.user_id).toBe(4706);
    expect(result.name).toBe('أحمد');
    expect(result.login).toBe('ahmed@school.test');
    expect(result.template_code).toBeUndefined();
  });

  it('validates email on details step when account creation uses email as login', () => {
    const template: StaffCreationTemplate = {
      code: 'pedagogical_director',
      name: 'Pedagogical Director',
      requires_user_account: true,
      client_catalog: true,
      admin_kind: 'pedagogical_director',
    };
    const form: StaffSmartCreateFormState = {
      templateCode: 'pedagogical_director',
      selectedBundleCodes: [],
      person: { name: 'Test User', phone: '', email: 'not-an-email' },
      createAccount: true,
      assignPasswordNow: true,
      login: '',
      useDifferentLogin: false,
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
      assignments: {},
    };

    expect(staffTemplatePersonRequiresEmail(template, form)).toBe(true);
    expect(isValidStaffContactEmail('not-an-email')).toBe(false);

    const validation = validateStaffTemplatePersonForm(form.person, t, { requireEmail: true });
    expect(validation.valid).toBe(false);
    expect(validation.errors.email).toBe('admin.staffCenter.smartCreate.errors.invalidEmail');

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: { allowed_to_create: true },
        form,
        passwordPolicy: { min_length: 8, requires_letter: true, requires_number: true },
      }),
    ).toBe('admin.staffCenter.smartCreate.errors.invalidEmail');
  });

  it('blocks review/create when email is missing for account creation', () => {
    const template: StaffCreationTemplate = {
      code: 'pedagogical_director',
      name: 'Pedagogical Director',
      requires_user_account: true,
    };
    const form: StaffSmartCreateFormState = {
      templateCode: 'pedagogical_director',
      selectedBundleCodes: [],
      person: { name: 'Test User', phone: '', email: '' },
      createAccount: true,
      assignPasswordNow: true,
      login: '',
      useDifferentLogin: false,
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
      assignments: {},
    };

    expect(
      resolveStaffTemplateCreateBlockMessageKey({
        template,
        preview: { allowed_to_create: true },
        form,
        passwordPolicy: { min_length: 8, requires_letter: true, requires_number: true },
      }),
    ).toBe('admin.staffCenter.smartCreate.errors.emailRequired');
  });
});
