import { describe, expect, it } from 'vitest';
import { resolveSiblingsPanelView } from './siblings-panel-view';
import type { SiblingsFieldsSource } from '@/types/sibling-line';

describe('resolveSiblingsPanelView', () => {
  it('marks empty when has_siblings is false and count is zero', () => {
    const view = resolveSiblingsPanelView({
      has_siblings: false,
      sibling_count: 0,
    } as SiblingsFieldsSource);

    expect(view.isEmpty).toBe(true);
    expect(view.registeredCount).toBeNull();
    expect(view.declaredHasSiblings).toBe(false);
  });

  it('marks empty when no sibling fields are provided at all', () => {
    const view = resolveSiblingsPanelView({} as SiblingsFieldsSource);
    expect(view.isEmpty).toBe(true);
    expect(view.flagOnly).toBe(false);
  });

  it('does not surface a zero count as a registered count', () => {
    const view = resolveSiblingsPanelView({
      has_siblings: true,
      sibling_count: 0,
    } as SiblingsFieldsSource);

    expect(view.registeredCount).toBeNull();
    // declared true keeps it out of the empty state
    expect(view.isEmpty).toBe(false);
    expect(view.flagOnly).toBe(true);
  });

  it('surfaces a positive registered count and is not empty', () => {
    const view = resolveSiblingsPanelView({
      has_siblings: true,
      sibling_count: 3,
    } as SiblingsFieldsSource);

    expect(view.isEmpty).toBe(false);
    expect(view.registeredCount).toBe(3);
  });

  it('is not empty when structured sibling lines exist even without flags', () => {
    const view = resolveSiblingsPanelView({
      sibling_lines: [{ name: 'Sara', linked_student_id: 12 }],
    } as SiblingsFieldsSource);

    expect(view.isEmpty).toBe(false);
    expect(view.lineCount).toBe(1);
  });

  it('is not empty when legacy free-text fields carry content', () => {
    const view = resolveSiblingsPanelView({
      siblings_raw_text: 'أخ في نفس المدرسة',
    } as SiblingsFieldsSource);

    expect(view.isEmpty).toBe(false);
    expect(view.hasLegacyText).toBe(true);
  });
});
