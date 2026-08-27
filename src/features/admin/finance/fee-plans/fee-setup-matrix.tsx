'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import type { FeeType } from '@/types/finance';
import type { DraftFeePlanLine } from './fee-plan-types';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import {
  applyFeeToAllPlanLevels,
  feeAmountForLevel,
  feeInstallmentCountForLevel,
  resolveFeeSetupCoreTypes,
  setFeeForLevel,
} from './fee-setup-matrix-utils';
import './fee-setup-matrix.css';

let matrixLineCounter = 0;
function matrixClientId(prefix: string) {
  matrixLineCounter += 1;
  return `${prefix}-${Date.now()}-${matrixLineCounter}`;
}

const LABELS = {
  ar: {
    title: 'الرسوم الأساسية حسب المستوى',
    hint: 'التسجيل رسم لمرة واحدة، أما الواجب الشهري فيُحسب حسب عدد أشهر الأداء.',
    months: 'عدد أشهر الأداء',
    monthsHint: 'خاص بالواجب الشهري فقط.',
    bulkRegistration: 'التسجيل للجميع',
    registrationOnce: 'مرة واحدة',
    bulkMonthly: 'الواجب الشهري للجميع',
    monthlyPerMonth: 'لكل شهر',
    applyAll: 'تطبيق على الجميع',
    level: 'المستوى',
    registration: 'التسجيل',
    monthly: 'الواجب الشهري',
    amountPlaceholder: '0',
    selectLevels: 'اختر مستوى واحدًا على الأقل لعرض جدول الرسوم.',
    missingCore: 'تعذر ربط التسجيل أو التمدرس بكتالوج الخدمات بأمان. راجع «الخدمات» أولًا.',
    monthsRequired: 'حدّد عدد أشهر الأداء للواجب الشهري.',
  },
  fr: {
    title: 'Frais de base par niveau',
    hint: "L’inscription est facturée une seule fois ; la mensualité dépend du nombre de mois facturés.",
    months: 'Nombre de mois facturés',
    monthsHint: 'Concerne uniquement la mensualité.',
    bulkRegistration: 'Inscription pour tous',
    registrationOnce: 'Une seule fois',
    bulkMonthly: 'Mensualité pour tous',
    monthlyPerMonth: 'Par mois',
    applyAll: 'Appliquer à tous',
    level: 'Niveau',
    registration: 'Inscription',
    monthly: 'Mensualité',
    amountPlaceholder: '0',
    selectLevels: 'Sélectionnez au moins un niveau pour afficher le tableau des frais.',
    missingCore: "Impossible de relier l’inscription ou la scolarité au catalogue Services en toute sécurité.",
    monthsRequired: 'Indiquez le nombre de mois pour la mensualité.',
  },
  en: {
    title: 'Core fees by level',
    hint: 'Registration is charged once; monthly tuition uses the number of billing months.',
    months: 'Billing months',
    monthsHint: 'Applies to monthly tuition only.',
    bulkRegistration: 'Registration for all',
    registrationOnce: 'One time',
    bulkMonthly: 'Monthly tuition for all',
    monthlyPerMonth: 'Per month',
    applyAll: 'Apply to all',
    level: 'Level',
    registration: 'Registration',
    monthly: 'Monthly tuition',
    amountPlaceholder: '0',
    selectLevels: 'Select at least one level to display the fee table.',
    missingCore: 'Registration or tuition could not be mapped safely to the Services catalog.',
    monthsRequired: 'Set the billing months for monthly tuition.',
  },
  es: {
    title: 'Cuotas base por nivel',
    hint: 'La matrícula se cobra una vez; la mensualidad usa el número de meses de cobro.',
    months: 'Meses de cobro',
    monthsHint: 'Solo se aplica a la mensualidad.',
    bulkRegistration: 'Matrícula para todos',
    registrationOnce: 'Una vez',
    bulkMonthly: 'Mensualidad para todos',
    monthlyPerMonth: 'Por mes',
    applyAll: 'Aplicar a todos',
    level: 'Nivel',
    registration: 'Matrícula',
    monthly: 'Mensualidad',
    amountPlaceholder: '0',
    selectLevels: 'Selecciona al menos un nivel para mostrar la tabla de cuotas.',
    missingCore: 'No se pudo vincular de forma segura matrícula o escolaridad con el catálogo Servicios.',
    monthsRequired: 'Indica los meses de cobro para la mensualidad.',
  },
} as const;

function numberValue(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function FeeSetupMatrix({
  lines,
  feeTypes,
  planLevelIds,
  scopeGroups,
  readOnly = false,
  onChange,
}: {
  lines: DraftFeePlanLine[];
  feeTypes: FeeType[];
  planLevelIds: number[];
  scopeGroups: FeePlanScopeCycleGroup[];
  readOnly?: boolean;
  onChange: (lines: DraftFeePlanLine[]) => void;
}) {
  const { locale } = useLocale();
  const labels = LABELS[locale];
  const core = useMemo(() => resolveFeeSetupCoreTypes(feeTypes), [feeTypes]);
  const [bulkRegistration, setBulkRegistration] = useState('');
  const [bulkMonthly, setBulkMonthly] = useState('');
  const [months, setMonths] = useState('');

  const selectedGroups = useMemo(() => {
    const selected = new Set(planLevelIds);
    return scopeGroups
      .map((group) => ({ ...group, levels: group.levels.filter((level) => selected.has(level.schoolLevelId)) }))
      .filter((group) => group.levels.length > 0);
  }, [planLevelIds, scopeGroups]);

  useEffect(() => {
    if (months || !core.monthlyTuition) return;
    const counts = planLevelIds
      .map((levelId) =>
        feeInstallmentCountForLevel(lines, core.monthlyTuition!.id, levelId, planLevelIds),
      )
      .filter((value): value is number => Boolean(value && value > 0));
    if (counts.length > 0 && counts.every((value) => value === counts[0])) {
      setMonths(String(counts[0]));
    }
  }, [months, core.monthlyTuition, lines, planLevelIds]);

  function updateLevel(feeType: FeeType, levelId: number, raw: string, installmentCount: number) {
    onChange(
      setFeeForLevel({
        lines,
        feeType,
        planLevelIds,
        levelId,
        amount: numberValue(raw),
        installmentCount,
        clientId: matrixClientId(`fee-${feeType.id}-${levelId}`),
      }),
    );
  }

  function applyBulk() {
    let next = lines;
    const registrationAmount = numberValue(bulkRegistration);
    const monthlyAmount = numberValue(bulkMonthly);
    const monthCount = Number(months) > 0 ? Math.floor(Number(months)) : 0;

    if (core.registration && bulkRegistration.trim()) {
      next = applyFeeToAllPlanLevels({
        lines: next,
        feeType: core.registration,
        planLevelIds,
        amount: registrationAmount,
        installmentCount: 1,
        clientId: matrixClientId('registration-all'),
      });
    }
    if (core.monthlyTuition && bulkMonthly.trim() && monthCount > 0) {
      next = applyFeeToAllPlanLevels({
        lines: next,
        feeType: core.monthlyTuition,
        planLevelIds,
        amount: monthlyAmount,
        installmentCount: monthCount,
        clientId: matrixClientId('tuition-all'),
      });
    }
    onChange(next);
  }

  if (planLevelIds.length === 0) return <p className="muted">{labels.selectLevels}</p>;
  if (!core.registration || !core.monthlyTuition) {
    return <p className="fee-setup-matrix__warning">{labels.missingCore}</p>;
  }

  const monthCount = Number(months) > 0 ? Math.floor(Number(months)) : 0;
  const monthlyEnabled = monthCount > 0;

  return (
    <section className="fee-setup-matrix">
      <div className="fee-setup-matrix__intro">
        <div>
          <h4>{labels.title}</h4>
          <p className="muted">{labels.hint}</p>
        </div>
      </div>

      {!readOnly ? (
        <div className="card fee-setup-matrix__bulk">
          <div className="fee-setup-matrix__fee-block">
            <div className="fee-setup-matrix__fee-block-title">
              <strong>{labels.bulkRegistration}</strong>
              <span className="badge badge--slate">{labels.registrationOnce}</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={bulkRegistration}
              placeholder={labels.amountPlaceholder}
              onChange={(event) => setBulkRegistration(event.target.value)}
            />
          </div>

          <div className="fee-setup-matrix__fee-block">
            <div className="fee-setup-matrix__fee-block-title">
              <strong>{labels.bulkMonthly}</strong>
              <span className="badge badge--slate">{labels.monthlyPerMonth}</span>
            </div>
            <div className="fee-setup-matrix__monthly-controls">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={bulkMonthly}
                placeholder={labels.amountPlaceholder}
                disabled={!monthlyEnabled}
                title={!monthlyEnabled ? labels.monthsRequired : undefined}
                onChange={(event) => setBulkMonthly(event.target.value)}
              />
              <label className="fee-setup-matrix__months">
                <span>{labels.months}</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={months}
                  onChange={(event) => setMonths(event.target.value)}
                />
              </label>
            </div>
            <span className="tiny muted">{labels.monthsHint}</span>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!bulkRegistration.trim() && (!bulkMonthly.trim() || !monthlyEnabled)}
            onClick={applyBulk}
          >
            {labels.applyAll}
          </button>
        </div>
      ) : null}

      {!monthlyEnabled && !readOnly ? <p className="tiny muted">{labels.monthsRequired}</p> : null}

      <div className="fee-setup-matrix__table-wrap">
        <table className="fee-setup-matrix__table">
          <thead>
            <tr>
              <th>{labels.level}</th>
              <th>{labels.registration} · {labels.registrationOnce}</th>
              <th>
                {labels.monthly}
                {monthCount > 0 ? ` × ${monthCount}` : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {selectedGroups.map((group) => (
              <FragmentGroup key={group.cycle.id} name={group.cycle.name}>
                {group.levels.map((level) => {
                  const registrationAmount = feeAmountForLevel(lines, core.registration!.id, level.schoolLevelId, planLevelIds);
                  const monthlyAmount = feeAmountForLevel(lines, core.monthlyTuition!.id, level.schoolLevelId, planLevelIds);
                  const rowMonths = feeInstallmentCountForLevel(
                    lines,
                    core.monthlyTuition!.id,
                    level.schoolLevelId,
                    planLevelIds,
                  ) ?? monthCount;
                  return (
                    <tr key={level.schoolLevelId}>
                      <td className="fee-setup-matrix__level">{level.name}</td>
                      <td>
                        <input
                          className="input fee-setup-matrix__money-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={readOnly}
                          value={registrationAmount ?? ''}
                          placeholder={labels.amountPlaceholder}
                          onChange={(event) => updateLevel(core.registration!, level.schoolLevelId, event.target.value, 1)}
                        />
                      </td>
                      <td>
                        <input
                          className="input fee-setup-matrix__money-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={readOnly || (!monthlyEnabled && monthlyAmount == null)}
                          title={!monthlyEnabled && monthlyAmount == null ? labels.monthsRequired : undefined}
                          value={monthlyAmount ?? ''}
                          placeholder={labels.amountPlaceholder}
                          onChange={(event) =>
                            updateLevel(
                              core.monthlyTuition!,
                              level.schoolLevelId,
                              event.target.value,
                              Math.max(1, rowMonths || 1),
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </FragmentGroup>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FragmentGroup({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="fee-setup-matrix__cycle-row">
        <td colSpan={3}>{name}</td>
      </tr>
      {children}
    </>
  );
}
