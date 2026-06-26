import { describe, expect, it } from 'vitest';
import {
  classifyActorDisplayName,
  FINANCE_PERFORMED_BY_MANAGER_KEY,
  isOdooAutomationActor,
} from './actor-display-name';

describe('classifyActorDisplayName', () => {
  it('maps OdooBot to manager actor', () => {
    expect(classifyActorDisplayName('OdooBot')).toEqual({ kind: 'manager', displayName: null });
    expect(classifyActorDisplayName('odoo bot')).toEqual({ kind: 'manager', displayName: null });
    expect(isOdooAutomationActor('OdooBot')).toBe(true);
  });

  it('maps system actors to system kind', () => {
    expect(classifyActorDisplayName('system')).toEqual({ kind: 'system', displayName: null });
    expect(classifyActorDisplayName('odoo')).toEqual({ kind: 'system', displayName: null });
  });

  it('keeps real user names unchanged', () => {
    expect(classifyActorDisplayName('Administrator')).toEqual({
      kind: 'user',
      displayName: 'Administrator',
    });
    expect(classifyActorDisplayName('sara')).toEqual({ kind: 'user', displayName: 'sara' });
  });
});

describe('FINANCE_PERFORMED_BY_MANAGER_KEY', () => {
  it('points to agreementContext performedByManager i18n', () => {
    expect(FINANCE_PERFORMED_BY_MANAGER_KEY).toContain('performedByManager');
  });
});
