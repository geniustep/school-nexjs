import type {
  BehaviorCategory,
  BehaviorEventType,
  BehaviorSeverity,
} from '@/types/student-behavior';

export const BEHAVIOR_CATEGORY_ORDER: readonly BehaviorCategory[] = [
  'discipline',
  'uniform',
  'homework',
  'attendance',
  'respect',
  'violence',
  'property_safety',
  'integrity',
] as const;

const CATEGORY_SET = new Set<string>(BEHAVIOR_CATEGORY_ORDER);

export function isBehaviorCategory(value: string): value is BehaviorCategory {
  return CATEGORY_SET.has(value);
}

export function groupBehaviorEventTypes(items: readonly BehaviorEventType[]) {
  const groups = new Map<BehaviorCategory, BehaviorEventType[]>();
  for (const category of BEHAVIOR_CATEGORY_ORDER) groups.set(category, []);
  for (const item of items) {
    if (!groups.has(item.category)) continue;
    groups.get(item.category)!.push(item);
  }
  return groups;
}

export function behaviorSeverityRank(severity: BehaviorSeverity): number {
  switch (severity) {
    case 'critical':
      return 4;
    case 'serious':
      return 3;
    case 'moderate':
      return 2;
    default:
      return 1;
  }
}

export function formatBehaviorDelta(delta: number): string {
  return delta > 0 ? '+' + delta : String(delta);
}
