import { describe, expect, it } from 'vitest';
import {
  countHiddenGuardianOnlyFamilies,
  filterParentFamilies,
} from '@/features/admin/parents/utils/filter-parent-families';
import { resolveMaskedIdentityDocument } from '@/features/admin/parents/utils/identity-document';
import type { ParentFamilyGroup } from '@/features/admin/parents/utils/group-parents-by-family';
import type { Parent } from '@/types/parent';

function makeFamily(
  children: Array<{ id: number; name: string }>,
  guardianNames: string[],
  guardianExtras: Partial<Parent>[] = [],
): ParentFamilyGroup {
  return {
    id: children.map((c) => c.id).join('-') || 'solo',
    children: children.map((c) => ({ id: c.id, name: c.name, relationship: null })),
    guardians: guardianNames.map((name, index) => ({
      parent: {
        id: index + 1,
        name,
        phone: null,
        email: null,
        relation: null,
        status: 'active',
        ...guardianExtras[index],
      } satisfies Parent,
      relationshipType: 'other',
    })),
  };
}

describe('filterParentFamilies hideWithoutChildren', () => {
  const withChildren = makeFamily([{ id: 10, name: 'ياسر' }], ['محمد']);
  const withoutChildren = makeFamily([], ['ولي بدون تلميذ']);

  it('hides guardian-only families by default', () => {
    const result = filterParentFamilies([withChildren, withoutChildren], {}, '');
    expect(result).toEqual([withChildren]);
  });

  it('shows guardian-only families when search matches', () => {
    const result = filterParentFamilies([withChildren, withoutChildren], {}, 'بدون');
    expect(result).toEqual([withoutChildren]);
  });

  it('shows guardian-only families when hideWithoutChildren is disabled', () => {
    const result = filterParentFamilies(
      [withChildren, withoutChildren],
      { hideWithoutChildren: false },
      '',
    );
    expect(result).toEqual([withChildren, withoutChildren]);
  });

  it('does not override explicit childrenFilter none', () => {
    const result = filterParentFamilies(
      [withChildren, withoutChildren],
      { childrenFilter: 'none' },
      '',
    );
    expect(result).toEqual([withoutChildren]);
  });
});

describe('countHiddenGuardianOnlyFamilies', () => {
  const withChildren = makeFamily([{ id: 10, name: 'ياسر' }], ['محمد']);
  const withoutChildren = makeFamily([], ['ولي بدون تلميذ']);

  it('counts guardian-only families hidden by default toggle', () => {
    expect(countHiddenGuardianOnlyFamilies([withChildren, withoutChildren], {}, '')).toBe(1);
  });

  it('returns zero when search reveals guardian-only families', () => {
    expect(countHiddenGuardianOnlyFamilies([withChildren, withoutChildren], {}, 'بدون')).toBe(0);
  });
});

describe('filterParentFamilies serverSearchAuthoritative', () => {
  const identityQuery = 'QAIDRAW999001';
  const identityMatched = makeFamily([{ id: 20, name: 'تلميذ' }], ['ولي هوية'], [
    {
      identity_document_type: 'national_id',
      identity_document_number_masked: 'QA****01',
      national_id_masked: 'QA****01',
      // list DTO must not carry raw identity for matching
      identity_document_number: null,
      national_id: null,
      phone: '0612000000',
      email: 'guardian@example.com',
    },
  ]);
  const nameMatched = makeFamily([{ id: 21, name: 'سارة' }], ['أحمد بنعلي']);
  const phoneMatched = makeFamily([{ id: 22, name: 'يوسف' }], ['فاطمة'], [
    { phone: '0612345678' },
  ]);
  const unrelated = makeFamily([{ id: 23, name: 'آخر' }], ['شخص آخر'], [
    { phone: '0699999999', email: 'other@example.com' },
  ]);

  it('keeps server identity match visible even when local name/phone/email do not match query', () => {
    const result = filterParentFamilies(
      [identityMatched, unrelated],
      {},
      identityQuery,
      { serverSearchAuthoritative: true },
    );
    expect(result).toEqual([identityMatched, unrelated]);
    expect(result).toHaveLength(2);
  });

  it('keeps server name match visible under authoritative mode', () => {
    const result = filterParentFamilies([nameMatched], {}, 'أحمد', {
      serverSearchAuthoritative: true,
    });
    expect(result).toEqual([nameMatched]);
  });

  it('keeps server phone match visible under authoritative mode', () => {
    const result = filterParentFamilies([phoneMatched], {}, '0612345678', {
      serverSearchAuthoritative: true,
    });
    expect(result).toEqual([phoneMatched]);
  });

  it('returns empty when server returned zero families', () => {
    const result = filterParentFamilies([], {}, identityQuery, {
      serverSearchAuthoritative: true,
    });
    expect(result).toEqual([]);
  });

  it('does not reduce server result count via local refiltering', () => {
    const page = [identityMatched, nameMatched, phoneMatched];
    const result = filterParentFamilies(page, {}, identityQuery, {
      serverSearchAuthoritative: true,
    });
    expect(result).toHaveLength(page.length);
  });

  it('local-only mode still filters by name/phone/email', () => {
    expect(
      filterParentFamilies([identityMatched, nameMatched], {}, 'أحمد'),
    ).toEqual([nameMatched]);
    expect(
      filterParentFamilies([identityMatched, phoneMatched], {}, '0612345678'),
    ).toEqual([phoneMatched]);
    expect(
      filterParentFamilies([identityMatched], {}, identityQuery),
    ).toEqual([]);
  });

  it('keeps masked identity on list parent and does not expose raw query as document number', () => {
    const parent = identityMatched.guardians[0]?.parent;
    expect(parent).toBeTruthy();
    const masked = resolveMaskedIdentityDocument(parent!);
    expect(masked).toBe('QA****01');
    expect(masked).not.toBe(identityQuery);
    expect(parent!.identity_document_number).toBeNull();
    expect(parent!.national_id).toBeNull();
  });
});
