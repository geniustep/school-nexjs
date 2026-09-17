import { describe, expect, it } from 'vitest';
import {
  buildStaffTemplateCreateScope,
  normalizeStaffTemplateScopeSelection,
  normalizeStaffTemplateScopeType,
  resetStaffTemplateScopeSelectionForType,
  validateStaffTemplateScope,
} from './staff-template-scope-contract';

describe('staff-template-scope-contract', () => {
  it('accepts only canonical scope types', () => {
    expect(normalizeStaffTemplateScopeType('school')).toBe('school');
    expect(normalizeStaffTemplateScopeType('levels')).toBe('levels');
    expect(normalizeStaffTemplateScopeType('classes')).toBe('classes');
    expect(normalizeStaffTemplateScopeType('sections')).toBeNull();
  });

  it('requires level ids for levels scope and class ids for classes scope', () => {
    const empty = { level_ids: [], class_ids: [] };
    expect(validateStaffTemplateScope('levels', empty, 1)).toEqual({
      valid: false,
      error: 'levels_required',
    });
    expect(validateStaffTemplateScope('classes', empty, 1)).toEqual({
      valid: false,
      error: 'classes_required',
    });
    expect(validateStaffTemplateScope('school', empty, 1)).toEqual({
      valid: true,
      error: null,
    });
  });

  it('removes stale ids when scope type changes', () => {
    const selection = normalizeStaffTemplateScopeSelection({
      level_ids: [2, 2, 3],
      class_ids: [8, 9],
    });
    expect(resetStaffTemplateScopeSelectionForType(selection, 'levels')).toEqual({
      level_ids: [2, 3],
      class_ids: [],
    });
    expect(resetStaffTemplateScopeSelectionForType(selection, 'classes')).toEqual({
      level_ids: [],
      class_ids: [8, 9],
    });
    expect(resetStaffTemplateScopeSelectionForType(selection, 'school')).toEqual({
      level_ids: [],
      class_ids: [],
    });
  });

  it('builds canonical create payloads without stale scope ids', () => {
    const selection = { level_ids: [2, 3], class_ids: [8, 9] };
    expect(buildStaffTemplateCreateScope(1, 'levels', selection)).toEqual({
      school_id: 1,
      scope_type: 'levels',
      level_ids: [2, 3],
    });
    expect(buildStaffTemplateCreateScope(1, 'classes', selection)).toEqual({
      school_id: 1,
      scope_type: 'classes',
      class_ids: [8, 9],
    });
    expect(buildStaffTemplateCreateScope(1, 'school', selection)).toEqual({
      school_id: 1,
      scope_type: 'school',
    });
  });
});
