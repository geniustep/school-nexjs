import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function flatten(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${key}` : key;
      Object.assign(out, flatten(value, next));
    }
    return out;
  }
  return { [prefix]: obj };
}

describe('teachingPlanning i18n parity', () => {
  const locales = ['ar', 'en', 'fr', 'es'] as const;
  const namespaces = locales.map((locale) => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), `messages/${locale}.json`), 'utf8'),
    ) as {
      admin: { teachingPlanning: Record<string, unknown>; teachingPlanningHubDesc?: string };
      nav: { teachingPlanning?: string };
      states: { approved?: string };
    };
    return {
      locale,
      keys: new Set(Object.keys(flatten(raw.admin.teachingPlanning))),
      hubDesc: raw.admin.teachingPlanningHubDesc,
      nav: raw.nav.teachingPlanning,
      approved: raw.states.approved,
      flat: flatten(raw.admin.teachingPlanning),
    };
  });

  it('keeps identical key sets across ar/en/fr/es', () => {
    const base = namespaces.find((n) => n.locale === 'en')!;
    for (const ns of namespaces) {
      expect([...ns.keys].sort()).toEqual([...base.keys].sort());
    }
  });

  it('requires nav, states.approved, hub desc, and lifecycle/states namespaces', () => {
    for (const ns of namespaces) {
      expect(ns.nav).toBeTruthy();
      expect(ns.approved).toBeTruthy();
      expect(ns.hubDesc).toBeTruthy();
      expect(ns.flat['lifecycle.submitSuccess']).toBeTruthy();
      expect(ns.flat['lifecycle.duplicateVersionSuccess']).toBeTruthy();
      expect(ns.flat['states.draft']).toBeTruthy();
      expect(ns.flat['states.approved']).toBeTruthy();
      expect(ns.flat['blockers.annual_distribution_required']).toBeTruthy();
      expect(ns.flat['references.detailSubtitle']).toContain('{level}');
      expect(ns.flat['offerings.detailSubtitle']).toContain('{year}');
    }
  });

  it('does not leave Spanish as English fallback for core UX copy', () => {
    const en = namespaces.find((n) => n.locale === 'en')!;
    const es = namespaces.find((n) => n.locale === 'es')!;
    const critical = [
      'hub.subtitle',
      'hub.offeringsTitle',
      'hub.referencesTitle',
      'hub.distributionTitle',
      'hub.sequencesTitle',
      'hub.manageHint',
      'lifecycle.approve',
      'offerings.title',
      'offerings.distributionRequiredTitle',
      'references.title',
      'assignments.linkHint',
      'validation.requiredFields',
      'columns.readiness',
      'fields.reference',
    ];
    for (const key of critical) {
      expect(es.flat[key]).toBeTruthy();
      expect(es.flat[key]).not.toEqual(en.flat[key]);
    }
    const allowSame = new Set([
      'fields.isbn',
      'offerings.detailSubtitle',
      'references.detailSubtitle',
      // Proper noun / shared tokens — identical across locales by design.
      'hub.jathathaTitle',
      'jathatha.minutes',
      'jathatha.detailLevels.standard',
      'jathatha.activityTypes.situation',
      'jathatha.activityTypes.discussion',
      'jathatha.activityTypes.project',
      'jathatha.phaseTypes.action',
      'jathatha.phaseTypes.discussion',
      'jathatha.phaseTypes.validation',
      'jathatha.phaseTypes.practice',
      'jathatha.phaseTypes.assessment',
      'jathatha.phaseTypes.support',
      'jathatha.phaseTypes.formulation',
      // Placeholder-only strings and a universal status token.
      'sequences.detailSubtitle',
      'batch.rowOk',
    ]);
    const identical = Object.keys(en.flat).filter(
      (key) =>
        typeof en.flat[key] === 'string' &&
        es.flat[key] === en.flat[key] &&
        !allowSame.has(key),
    );
    expect(identical).toEqual([]);
  });
});
