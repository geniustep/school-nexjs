import { describe, expect, it } from 'vitest';
import { FRENCH_VALUE_REPLACEMENTS } from './fr-value-replacements';
import { translate } from './messages';

describe('French admin translation integrity', () => {
  it('does not expose raw keys or English copy on the audited admin journeys', () => {
    expect(translate('fr', 'admin.createClass')).toBe('Ajouter une classe');
    expect(translate('fr', 'common.more')).toBe('Plus');
    expect(translate('fr', 'admin.academicSetup.guided.category.middle_school')).toBe('Collège');
    expect(translate('fr', 'admin.academicSetup.guided.category.secondary')).toBe('Lycée');
    expect(translate('fr', 'communication.general.scopeTitle')).toBe(
      'Périmètre des bénéficiaires',
    );
    expect(translate('fr', 'communication.general.beneficiary.studentsAndGuardians')).toBe(
      'Élèves et parents',
    );
    expect(translate('fr', 'communication.general.previewAction')).toBe(
      'Aperçu des destinataires',
    );
    expect(translate('fr', 'communication.general.incompleteSelection')).toBe(
      'Terminez la sélection des bénéficiaires avant l’aperçu.',
    );
  });

  it('covers the additional French-only English pockets found during the audit', () => {
    expect(FRENCH_VALUE_REPLACEMENTS['Record payment']).toBe('Enregistrer un encaissement');
    expect(FRENCH_VALUE_REPLACEMENTS['Create special agreement']).toBe('Créer un accord spécial');
    expect(FRENCH_VALUE_REPLACEMENTS['Official version history']).toBe(
      'Historique des versions officielles',
    );
  });

  it('provides localized labels for standard student financial-service categories', () => {
    expect(translate('fr', 'admin.studentsList.serviceCategory.registration')).toBe('Inscription');
    expect(translate('fr', 'admin.studentsList.serviceCategory.tuition')).toBe('Scolarité');
    expect(translate('fr', 'admin.studentsList.serviceCategory.transport')).toBe('Transport');
    expect(translate('fr', 'admin.studentsList.serviceCategory.canteen')).toBe('Cantine');
  });

  it('provides the student-registration headings without exposing raw keys', () => {
    expect(translate('fr', 'admin.student360.create.pageTitle')).toBe(
      'Inscrire un nouvel élève',
    );
    expect(translate('fr', 'admin.student360.create.groups.basic')).toBe(
      'Informations de base',
    );
    expect(translate('fr', 'admin.student360.create.billing.summaryTitle')).toBe(
      'Résumé des responsables',
    );
    expect(translate('en', 'admin.student360.create.billing.summaryTitle')).toBe(
      'Résumé des responsables',
    );
  });
});

