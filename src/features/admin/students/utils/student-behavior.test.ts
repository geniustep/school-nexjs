import { describe, expect, it } from 'vitest';
import {
  BEHAVIOR_CATEGORY_ORDER,
  behaviorSeverityRank,
  formatBehaviorDelta,
  groupBehaviorEventTypes,
  isBehaviorCategory,
} from './student-behavior';
import type { BehaviorEventType } from '@/types/student-behavior';

const event = (
  code: string,
  category: BehaviorEventType['category'],
  delta: number,
): BehaviorEventType => ({
  id: Math.abs(code.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)),
  code,
  name: code,
  category,
  default_delta: delta,
  severity: delta <= -6 ? 'serious' : 'minor',
  note_required: false,
  incident_required: false,
});

describe('student behavior utilities', () => {
  it('keeps the governed category order', () => {
    expect(BEHAVIOR_CATEGORY_ORDER).toEqual([
      'discipline',
      'uniform',
      'homework',
      'attendance',
      'respect',
      'violence',
      'property_safety',
      'integrity',
    ]);
  });

  it('groups event types without inventing categories', () => {
    const grouped = groupBehaviorEventTypes([
      event('fight', 'violence', -6),
      event('uniform', 'uniform', -1),
      event('late', 'attendance', -1),
    ]);
    expect(grouped.get('violence')?.map((item) => item.code)).toEqual(['fight']);
    expect(grouped.get('uniform')?.map((item) => item.code)).toEqual(['uniform']);
    expect(grouped.get('discipline')).toEqual([]);
  });

  it('recognizes governed categories only', () => {
    expect(isBehaviorCategory('respect')).toBe(true);
    expect(isBehaviorCategory('reward')).toBe(false);
  });

  it('formats effects and ranks severity predictably', () => {
    expect(formatBehaviorDelta(-3)).toBe('-3');
    expect(formatBehaviorDelta(2)).toBe('+2');
    expect(behaviorSeverityRank('critical')).toBeGreaterThan(
      behaviorSeverityRank('moderate'),
    );
  });
});
