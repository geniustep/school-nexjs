import { describe, expect, it } from 'vitest';
import {
  buildParentUpdatePayload,
  parentToFormValues,
  type ParentPersonFormValues,
} from './build-parent-update-payload';
import type { Parent } from '@/types/parent';

const identityDocument = {
  type: '',
  number: '',
  country: '',
  clear: false,
} as const;

function values(overrides: Partial<ParentPersonFormValues> = {}): ParentPersonFormValues {
  return {
    name: 'Operational Name',
    name_ar: 'الاسم العربي',
    name_fr: 'Nom français',
    phone: '0611111111',
    mobile: '',
    email: 'parent@example.com',
    street: 'Rue 1',
    street2: 'Appartement 2',
    city: 'Tanger',
    zip: '90000',
    preferred_language: 'fr',
    notification_opt_in: true,
    identityDocument: { ...identityDocument },
    ...overrides,
  };
}

describe('buildParentUpdatePayload', () => {
  it('omits every unchanged person field', () => {
    const initial = values();
    expect(buildParentUpdatePayload(values(), initial)).toEqual({});
  });

  it('sends only the changed guardian field', () => {
    const initial = values();
    expect(buildParentUpdatePayload(values({ city: 'Rabat' }), initial)).toEqual({
      city: 'Rabat',
    });
  });

  it('preserves intentional clearing without clearing untouched fields', () => {
    const initial = values();
    expect(buildParentUpdatePayload(values({ street2: '' }), initial)).toEqual({
      street2: '',
    });
  });

  it('trims and sends bilingual identity changes without resending operational name', () => {
    const initial = values();
    expect(
      buildParentUpdatePayload(
        values({ name_ar: '  اسم عربي جديد  ', name_fr: '  Nouveau nom  ' }),
        initial,
      ),
    ).toEqual({
      name_ar: 'اسم عربي جديد',
      name_fr: 'Nouveau nom',
    });
  });
});

describe('parentToFormValues', () => {
  it('hydrates bilingual names and the complete address contract', () => {
    const parent = {
      id: 44,
      name: 'Operational Name',
      name_ar: 'الاسم العربي',
      name_fr: 'Nom français',
      phone: '0611111111',
      mobile: null,
      email: 'parent@example.com',
      street: 'Rue 1',
      street2: 'Appartement 2',
      city: 'Tanger',
      zip: '90000',
      preferred_language: 'fr',
      notification_opt_in: true,
      relation: null,
      status: 'active',
    } satisfies Parent;

    expect(parentToFormValues(parent)).toMatchObject({
      name: 'Operational Name',
      name_ar: 'الاسم العربي',
      name_fr: 'Nom français',
      street: 'Rue 1',
      street2: 'Appartement 2',
      city: 'Tanger',
      zip: '90000',
      preferred_language: 'fr',
    });
  });
});
