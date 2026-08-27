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
    hint: 'أدخل رسم التسجيل والواجب الشهري مباشرة. يمكنك تطبيق نفس القيمة على كل المستويات ثم تعديل مستوى واحد فقط عند الحاجة.',
    months: 'عدد أشهر الأداء',
    monthsHint: 'يُستعمل للواجب الشهري فقط. لا يفترض رقيم عدد الأشهر تلقائيًا.',
    bulkRegistration: 'التسجيل للجميع',
    bulkMonthly: 'الواجب الشهري للجميع',
    applyAll: 'تطبيق على الجميع',
    level: 'المستوى',
    registration: 'التسجيل',
    monthly: 'الواجب الشهري',
    amountPlaceholder: '0',
    selectLevels: 'اختر مستوى واحدًا على الأقل لعرض جدول الرسوم.',
    missingCore: 'تعذر تحديد رسم التسجيل أو الواجب الشهري من كتالوج الخدمات بأمان. راجع «الخدمات والرسوم» أولًا؛ لن يخمّن رقيم نوع الرسم.',
    monthsRequired: 'حدّد عدد أشهر الأداء أولًا لإدخال الواجب الشهري.',
  },
  fr: {
    title: 'Frais de base par niveau',
    hint: "Saisissez directement l’inscription et la mensualité. Appliquez une valeur à tous les niveaux puis ajustez un niveau si nécessaire.",
    months: 'Nombre de mois facturés',
    monthsHint: "Utilisé uniquement pour la mensualité. Raqeem ne suppose pas automatiquement le nombre de mois.",
    bulkRegistration: 'Inscription pour tous',
    bulkMonthly: 'Mensualité pour tous',
    applyAll: 'Appliquer à tous',
    level: 'Niveau',
    registration: 'Inscription',
    monthly: 'Mensualité',
    amountPlaceholder: '0',
    selectLevels: 'Sélectionnez au moins un niveau pour afficher le tableau des frais.',
    missingCore: "Impossible d’identifier sans ambiguïté l’inscription ou la mensualité dans le catalogue. Vérifiez d’abord « Services et frais ».",
    monthsRequired: 'Indiquez d’abord le nombre de mois facturés.',
  },
  en: {
    title: 'Core fees by level',
    hint: 'Enter registration and monthly tuition directly. Apply one value to all levels, then adjust a single level when needed.',
    months: 'Billing months',
    monthsHint: 'Used for monthly tuition only. Raqeem does not assume the number of months.',
    bulkRegistration: 'Registration for all',
    bulkMonthly: 'Monthly tuition for all',
    applyAll: 'Apply to all',
    level: 'Level',
    registration: 'Registration',
    monthly: 'Monthly tuition',
    amountPlaceholder: '0',
    selectLevels: 'Select at least one level to display the fee table.',
    missingCore: 'Registration or monthly tuition could not be identified safely from the catalog. Review Services and fees first.',
    monthsRequired: 'Set the number of billing months before entering monthly tuition.',
  },
  es: {
    title: 'Cuotas base por nivel',
    hint: 'Introduce matrícula y mensualidad directamente. Aplica un valor a todos los niveles y ajusta uno cuando sea necesario.',
    months: 'Meses de cobro',
    monthsHint: 'Se usa solo para la mensualidad. Raqeem no supone automáticamente el número de meses.',
    bulkRegistration: 'Matrícula para todos',
    bulkMonthly: 'Mensualidad para todos',
    applyAll: 'Aplicar a todos',
    level: 'Nivel',
    registration: 'Matrícula',
    monthly: 'Mensualidad',
    amountPlaceholder: '0',
    selectLevels: 'Selecciona al menos un nivel para mostrar la tabla de cuotas.',
    missingCore: 'No se pudo identificar con seguridad la matrícula o la mensualidad. Revisa primero Servicios y cuotas.',
    monthsRequired: 'Indica primero el número de meses de cobro.',
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

  function handleMonthsChange(raw: string) {
    // This is UI input only until a monthly amount is created or edited.
    // Existing installment schedules remain untouched merely by changing the field.
    setMonths(raw);
  }

  function updateLevel(
    feeType: FeeType,
    levelId: number,
    raw: string,
    installmentCount: number,
  ) {
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
    const monthCount = Math.max(1, Number(months) || 0);

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

  if (planLevelIds.length === 0) {
    return <p className="muted">{labels.selectLevels}</p>;
  }

  if (!core.registration || !core.monthlyTuition) {
    return <p className="fee-setup-matrix__warning">{labels.missingCore}</p>;
  }

  const monthCount = Math.max(1, Number(months) || 0);
  const monthlyEnabled = monthCount > 0;

  return (
    <section className="fee-setup-matrix">
      <div className="fee-setup-matrix__intro">
        <div>
          <h4>{labels.title}</h4>
          <p className="muted">{labels.hint}</p>
        </div>
        <label className="fee-setup-matrix__months">
          <span>{labels.months}</span>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={months}
            disabled={readOnly}
            onChange={(event) => handleMonthsChange(event.target.value)}
          />
          <span className="tiny muted">{labels.monthsHint}</span>
        </label>
      </div>

      {!readOnly ? (
        <div className="card fee-setup-matrix__bulk">
          <label>
            <span>{labels.bulkRegistration}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={bulkRegistration}
              placeholder={labels.amountPlaceholder}
              onChange={(event) => setBulkRegistration(event.target.value)}
            />
          </label>
          <label>
            <span>{labels.bulkMonthly}</span>
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
          </label>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!bulkRegistration.trim() && !bulkMonthly.trim()}
            onClick={applyBulk}
          >
            {labels.applyAll}
          </button>
        </div>
      ) : null}

      {!monthlyEnabled ? <p className="tiny muted">{labels.monthsRequired}</p> : null}

      <div className="fee-setup-matrix__table-wrap">
        <table className="fee-setup-matrix__table">
          <thead>
            <tr>
              <th>{labels.level}</th>
              <th>{labels.registration}</th>
              <th>{labels.monthly}</th>
            </tr>
          </thead>
          <tbody>
            {selectedGroups.map((group) => (
              <FragmentGroup key={group.cycle.id} name={group.cycle.name}>
                {group.levels.map((level) => {
                  const registrationAmount = feeAmountForLevel(
                    lines,
                    core.registration!.id,
                    level.schoolLevelId,
                    planLevelIds,
                  );
                  const monthlyAmount = feeAmountForLevel(
                    lines,
                    core.monthlyTuition!.id,
                    level.schoolLevelId,
                    planLevelIds,
                  );
                  const rowMonths =
                    feeInstallmentCountForLevel(
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
                          onChange={(event) =>
                            updateLevel(core.registration!, level.schoolLevelId, event.target.value, 1)
                          }
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

function FragmentGroup({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="fee-setup-matrix__cycle-row">
        <td colSpan={3}>{name}</td>
      </tr>
      {children}
    </>
  );
}
