import { describe, expect, it } from 'vitest';
import { normalizeGuardianSummary } from './normalize-guardian';
import {
  extractGuardianAccountPresentationsFromCreateResponse,
  normalizeGuardianAccountPresentationStatus,
  resolveGuardianAccountPresentation,
} from './resolve-guardian-account-presentation';

describe('resolveGuardianAccountPresentation', () => {
  it('maps active status without implying password setup', () => {
    const presentation = resolveGuardianAccountPresentation({
      code: 'G-1001',
      account: { login: 'fatima.parent', status: 'active', has_user_account: true },
    });
    expect(presentation.status).toBe('active');
    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.active');
    expect(presentation.code).toBe('G-1001');
    expect(presentation.login).toBe('fatima.parent');
    expect(presentation.hasVisibleAccountInfo).toBe(true);
  });

  it('maps inactive and no_account statuses', () => {
    expect(
      resolveGuardianAccountPresentation({
        account: { status: 'inactive', has_user_account: true },
      }).statusLabelKey,
    ).toBe('admin.guardianAccount.status.inactive');

    expect(
      resolveGuardianAccountPresentation({
        has_user_account: false,
        account: { status: 'no_account', has_user_account: false },
      }).statusLabelKey,
    ).toBe('admin.guardianAccount.status.noAccount');
  });

  it('uses safe fallback for unknown status values', () => {
    const presentation = resolveGuardianAccountPresentation({
      code: 'G-9',
      account: { status: 'pending_review', has_user_account: true },
    });
    expect(presentation.status).toBe('unknown');
    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.unknown');
  });

  it('hides copy targets when code and login are missing', () => {
    const presentation = resolveGuardianAccountPresentation({
      has_user_account: false,
      account: { status: 'no_account', has_user_account: false },
    });
    expect(presentation.code).toBeNull();
    expect(presentation.login).toBeNull();
    expect(presentation.hasVisibleAccountInfo).toBe(true);
  });

  it('returns hidden presentation when no account fields exist', () => {
    expect(resolveGuardianAccountPresentation(null).hasVisibleAccountInfo).toBe(false);
    expect(resolveGuardianAccountPresentation({}).hasVisibleAccountInfo).toBe(false);
  });
});

describe('normalizeGuardianAccountPresentationStatus', () => {
  it('normalizes legacy not_created to no_account', () => {
    expect(normalizeGuardianAccountPresentationStatus('not_created')).toBe('no_account');
  });
});

describe('normalizeGuardianSummary account contract', () => {
  it('reads code and nested account fields from guardian payload', () => {
    const guardian = normalizeGuardianSummary({
      id: 12,
      guardian_id: 12,
      partner_id: 99,
      name: 'Hassan',
      code: 'G-7788',
      account: {
        login: 'hassan.guardian',
        status: 'active',
        has_user_account: true,
      },
    });
    expect(guardian?.code).toBe('G-7788');
    expect(guardian?.account).toMatchObject({
      login: 'hassan.guardian',
      status: 'active',
      has_user_account: true,
    });
  });

  it('reads password contract fields from nested account payload', () => {
    const guardian = normalizeGuardianSummary({
      id: 12,
      name: 'Hassan',
      account: {
        login: 'hassan.guardian',
        status: 'active',
        has_user_account: true,
        can_assign_password: true,
        password_was_set: true,
      },
    });
    expect(guardian?.account).toMatchObject({
      can_assign_password: true,
      password_was_set: true,
    });
  });
});

describe('extractGuardianAccountPresentationsFromCreateResponse', () => {
  it('extracts guardian login details from atomic create response', () => {
    const entries = extractGuardianAccountPresentationsFromCreateResponse({
      id: 501,
      guardian_relationships: [
        {
          relationship_id: 1,
          guardian: {
            name: 'Fatima',
            code: 'G-2002',
            account: { login: 'fatima.g', status: 'active', has_user_account: true },
          },
        },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Fatima');
    expect(entries[0].presentation.login).toBe('fatima.g');
  });

  it('maps access_account_created and access_account_exists provisioning metadata', () => {
    const created = extractGuardianAccountPresentationsFromCreateResponse({
      guardian_relationships: [
        {
          access_account_created: true,
          guardian: { name: 'Hassan', account: { status: 'active', has_user_account: true } },
        },
      ],
    });
    expect(created[0].presentation.accessProvisioning).toBe('created');
    expect(created[0].presentation.accessProvisioningLabelKey).toBe('admin.guardianAccount.accessCreated');

    const exists = extractGuardianAccountPresentationsFromCreateResponse({
      guardian_relationships: [
        {
          guardian: {
            name: 'Sara',
            access_account_exists: true,
            account: { login: 'sara.g', status: 'active', has_user_account: true },
          },
        },
      ],
    });
    expect(exists[0].presentation.accessProvisioning).toBe('exists');
    expect(exists[0].presentation.accessProvisioningLabelKey).toBe('admin.guardianAccount.accessExists');
  });
});

describe('guardian selection regression', () => {
  it('existing guardian search row keeps guardian_id separate from partner_id', () => {
    const guardian = normalizeGuardianSummary({
      id: 701,
      guardian_id: 701,
      partner_id: 900,
      name: 'Existing',
      code: 'G-701',
      account: { login: 'existing.guardian', status: 'active', has_user_account: true },
    });
    expect(guardian?.guardian_id).toBe(701);
    expect(guardian?.partner_id).toBe(900);
    expect(resolveGuardianAccountPresentation(guardian).code).toBe('G-701');
  });
});
