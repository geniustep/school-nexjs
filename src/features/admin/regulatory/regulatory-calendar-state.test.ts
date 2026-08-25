import { describe, expect, it } from 'vitest';
import { regulatoryCalendarState } from './regulatory-calendar-state';

describe('regulatory calendar state', () => {
  it('reports no calendar when projection has no calendar id', () => {
    expect(regulatoryCalendarState(null, 'published')).toBe('not_created');
  });

  it('preserves the published state for an existing projected calendar', () => {
    expect(regulatoryCalendarState(106, 'published')).toBe('published');
  });

  it('supports the expected workflow states', () => {
    expect(regulatoryCalendarState(106, 'draft')).toBe('draft');
    expect(regulatoryCalendarState(106, 'under_review')).toBe('under_review');
    expect(regulatoryCalendarState(106, 'archived')).toBe('archived');
  });

  it('defaults an existing projection without a state to draft', () => {
    expect(regulatoryCalendarState(106, null)).toBe('draft');
  });

  it('does not mislabel an unknown future workflow state', () => {
    expect(regulatoryCalendarState(106, 'future_state')).toBe('other');
  });
});
