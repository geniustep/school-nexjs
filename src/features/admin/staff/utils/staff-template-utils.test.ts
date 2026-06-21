import { describe, expect, it } from 'vitest';
import {
  buildStaffTemplateCreatePayload,
  buildStaffTemplatePreviewPayload,
  canSubmitStaffTemplateCreate,
  formatStaffTemplatePreviewWarning,
  formatStaffTemplateRequiredField,
  groupStaffTemplatesByMainPosition,
  normalizeStaffCreationTemplate,
  normalizeStaffCreationTemplates,
  normalizeStaffTemplateBundleSelection,
  normalizeStaffTemplateCreateResult,
  normalizeStaffTemplateMainPosition,
  normalizeStaffTemplatePreview,
  payloadContainsForbiddenClientFields,
  resolveAddableStaffTemplateBundleCodes,
  resolveInitialSelectedBundleCodes,
  resolveStaffTemplateBundleLabel,
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
    expect(payload.selected_bundle_codes).toEqual([
      'finance_collections',
      'finance_receipts',
      'cashdesk',
      'finance_cheques',
    ]);
    expect(payloadContainsForbiddenClientFields(payload)).toBe(false);
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
    const translate = (key: string) =>
      key === 'admin.staffCenter.smartCreate.subject' ? 'Subject' : key;
    expect(formatStaffTemplateRequiredField('subject_id', translate)).toBe('Subject');
    expect(
      formatStaffTemplatePreviewWarning(
        'blocked:Template subject_teacher requires assignments: subject_id',
        t,
      ),
    ).toBe('admin.staffCenter.smartCreate.warnings.blockedCreation');
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
});
