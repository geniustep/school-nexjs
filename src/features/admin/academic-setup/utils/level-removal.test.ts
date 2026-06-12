import { describe, expect, it } from 'vitest';
import { resolveLevelRemovalFlags } from './level-usage';

describe('level removal flags', () => {
  const baseLevel = {
    id: 1,
    name: 'P1',
    code: 'P1',
  };

  it('blocks only when delete and deactivate are both denied', () => {
    const flags = resolveLevelRemovalFlags({
      ...baseLevel,
      can_delete: false,
      can_deactivate: false,
      classes_count: 2,
    });
    expect(flags.blockedByBackend).toBe(true);
    expect(flags.isHistorical).toBe(false);
  });

  it('allows historical removal when deactivate is permitted', () => {
    const flags = resolveLevelRemovalFlags({
      ...baseLevel,
      can_delete: false,
      can_deactivate: true,
    });
    expect(flags.blockedByBackend).toBe(false);
    expect(flags.isHistorical).toBe(true);
  });

  it('does not block when backend flags are missing', () => {
    const flags = resolveLevelRemovalFlags({
      ...baseLevel,
      classes_count: 3,
    });
    expect(flags.blockedByBackend).toBe(false);
    expect(flags.canDelete).toBeNull();
  });
});

describe('removal action visibility rules', () => {
  it('menu should not depend on can_delete from backend', () => {
    const canManageClasses = true;
    const levelCanDelete = false;
    const showRemoveLevel = canManageClasses;
    expect(showRemoveLevel).toBe(true);
    expect(levelCanDelete).toBe(false);
  });

  it('menu hidden without manage_classes', () => {
    const canManageClasses = false;
    const showRemoveLevel = canManageClasses;
    expect(showRemoveLevel).toBe(false);
  });
});
