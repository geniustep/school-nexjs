'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale } from '@/features/i18n/locale-context';
import type {
  AgreementAmendmentFormState,
  AgreementAmendmentPeriodOption,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from '../utils/resolve-amendment-form-options';
import { canSubmitAgreementAmendmentForm, usesPeriodRangeForForm } from '../utils/build-agreement-amendment-payload';
import {
  hasAgreementAmendmentPricingContract,
  isBlockedByOneTimeLineNotPeriodAmendable,
  resolveAgreementAmendmentPricingContractLabelMode,
  shouldShowAgreementAmendmentBlockingReasons,
  shouldShowAgreementAmendmentLegacyAmounts,
} from '../utils/agreement-amendment-pricing-contract';
import {
  resolveAgreementAmendmentBlockingMessage,
  resolveAgreementAmendmentWarningMessage,
} from '../utils/resolve-agreement-amendment-warning';
import { AgreementAmendmentPricingContractPreview } from './agreement-amendment-pricing-contract-preview';
import {
  isSingleMonthSelection,
  resolveAffectedMonthLabels,
} from './agreement-amendment-preview-model';
import { useT } from '@/features/i18n/locale-context';
import './agreement-amendment-reason-preview.css';

const COPY = {
  ar: {
    title: 'المعاينة الحية',
    subtitle: 'تتحدث تلقائيًا مع كل اختيار',
    decisionSummary: 'ملخص القرار',
    affectedMonths: 'الأشهر المتأثرة',
    financialImpact: 'الأثر المالي',
    monthDetails: 'تفاصيل الأشهر',
    ready: 'جاهزة للمعاينة',
    updating: 'جاري تحديث المعاينة…',
    waiting: 'أكمل الحقول التالية لتظهر النتيجة المالية',
    operation: 'العملية',
    line: 'البند',
    scope: 'النطاق',
    month: 'الشهر',
    reason: 'السبب',
    amount: 'المبلغ',
    complete: 'مكتمل',
    pending: 'متبقي',
    singleMonth: 'شهر واحد فقط',
    futureScope: 'هذا الشهر وما بعده',
    singleScope: 'هذا الشهر فقط',
    periodRange: 'فترة شهرية',
    amountOnly: 'تعديل المبلغ فقط',
    selected: 'ضمن التعديل',
    noMonth: 'اختر الشهر',
    notSelected: 'لم يحدد بعد',
    addLine: 'إضافة بند',
    cancelLine: 'إلغاء بند',
    modifyLine: 'تعديل بند',
    applyAllowed: 'مسموح بالتطبيق',
    needsReview: 'يحتاج مراجعة',
    resultReady: 'نتيجة Odoo جاهزة',
    previewError: 'تعذر تحديث المعاينة',
    amountBefore: 'المبلغ قبل',
    amountAfter: 'المبلغ بعد',
    delta: 'الفرق',
    lockedMonths: 'أشهر مقفلة',
  },
  fr: {
    title: 'Aperçu en direct', subtitle: 'Se met à jour automatiquement à chaque choix', decisionSummary: 'Résumé de la décision', affectedMonths: 'Mois concernés', financialImpact: 'Impact financier', monthDetails: 'Détail des mois', ready: 'Prêt pour l’aperçu', updating: 'Mise à jour de l’aperçu…', waiting: 'Complétez les champs suivants pour afficher le résultat financier', operation: 'Opération', line: 'Élément', scope: 'Portée', month: 'Mois', reason: 'Motif', amount: 'Montant', complete: 'Complet', pending: 'Manquant', singleMonth: 'Un seul mois', futureScope: 'Ce mois et les suivants', singleScope: 'Ce mois uniquement', periodRange: 'Période mensuelle', amountOnly: 'Montant uniquement', selected: 'Inclus dans la modification', noMonth: 'Choisissez le mois', notSelected: 'Non défini', addLine: 'Ajouter un élément', cancelLine: 'Annuler un élément', modifyLine: 'Modifier un élément', applyAllowed: 'Application autorisée', needsReview: 'Révision nécessaire', resultReady: 'Résultat Odoo prêt', previewError: 'Impossible de mettre à jour l’aperçu', amountBefore: 'Montant avant', amountAfter: 'Montant après', delta: 'Écart', lockedMonths: 'Mois verrouillés',
  },
  en: {
    title: 'Live preview', subtitle: 'Updates automatically with every selection', decisionSummary: 'Decision summary', affectedMonths: 'Affected months', financialImpact: 'Financial impact', monthDetails: 'Month details', ready: 'Ready for preview', updating: 'Updating preview…', waiting: 'Complete the following fields to show the financial result', operation: 'Operation', line: 'Item', scope: 'Scope', month: 'Month', reason: 'Reason', amount: 'Amount', complete: 'Complete', pending: 'Missing', singleMonth: 'One month only', futureScope: 'This month and later', singleScope: 'This month only', periodRange: 'Monthly period', amountOnly: 'Amount only', selected: 'Included in the change', noMonth: 'Choose a month', notSelected: 'Not selected', addLine: 'Add item', cancelLine: 'Cancel item', modifyLine: 'Modify item', applyAllowed: 'Allowed to apply', needsReview: 'Needs review', resultReady: 'Odoo result ready', previewError: 'Could not update preview', amountBefore: 'Amount before', amountAfter: 'Amount after', delta: 'Difference', lockedMonths: 'Locked months',
  },
  es: {
    title: 'Vista previa en vivo', subtitle: 'Se actualiza automáticamente con cada selección', decisionSummary: 'Resumen de la decisión', affectedMonths: 'Meses afectados', financialImpact: 'Impacto financiero', monthDetails: 'Detalle de meses', ready: 'Listo para vista previa', updating: 'Actualizando vista previa…', waiting: 'Complete los siguientes campos para mostrar el resultado financiero', operation: 'Operación', line: 'Elemento', scope: 'Alcance', month: 'Mes', reason: 'Motivo', amount: 'Importe', complete: 'Completo', pending: 'Falta', singleMonth: 'Un solo mes', futureScope: 'Este mes y siguientes', singleScope: 'Solo este mes', periodRange: 'Periodo mensual', amountOnly: 'Solo importe', selected: 'Incluido en el cambio', noMonth: 'Elija el mes', notSelected: 'Sin seleccionar', addLine: 'Añadir elemento', cancelLine: 'Cancelar elemento', modifyLine: 'Modificar elemento', applyAllowed: 'Aplicación permitida', needsReview: 'Necesita revisión', resultReady: 'Resultado Odoo listo', previewError: 'No se pudo actualizar la vista previa', amountBefore: 'Importe antes', amountAfter: 'Importe después', delta: 'Diferencia', lockedMonths: 'Meses bloqueados',
  },
} as const;

type ReadinessItem = { label: string; value: string; complete: boolean };

function amountReady(form: AgreementAmendmentFormState): boolean {
  if (form.operationType === 'cancel_line') return true;
  if (form.operationType === 'modify_line' || form.operationType === 'add_line') {
    return form.amount.trim() !== '' && Number.isFinite(Number(form.amount));
  }
  return true;
}

export function AgreementAmendmentLivePreviewPanel({
  form,
  selectedLine,
  periods,
  preview,
  previewLoading,
  error,
  currency,
}: {
  form: AgreementAmendmentFormState;
  selectedLine: AgreementAmendmentLineOption | null;
  periods: AgreementAmendmentPeriodOption[];
  preview: NormalizedAgreementAmendmentPreview | null;
  previewLoading: boolean;
  error?: string | null;
  currency: string | null;
}) {
  const { locale } = useLocale();
  const t = useT();
  const copy = COPY[locale] ?? COPY.en;
  const singleMonth = isSingleMonthSelection(form.effectivePeriodId, form.effectivePeriodEndId);
  const monthLabels = resolveAffectedMonthLabels({
    periods,
    affectedPeriods: preview?.affectedPeriods,
    effectivePeriodId: form.effectivePeriodId,
    effectivePeriodEndId: form.effectivePeriodEndId,
    locale,
  });
  const lockedMonthLabels = resolveAffectedMonthLabels({
    periods,
    affectedPeriods: preview?.lockedPeriods,
    effectivePeriodId: '',
    effectivePeriodEndId: '',
    locale,
  });
  const usesMonths = usesPeriodRangeForForm(form);
  const operationLabel =
    form.operationType === 'add_line'
      ? copy.addLine
      : form.operationType === 'cancel_line'
        ? copy.cancelLine
        : copy.modifyLine;
  const scopeLabel = usesMonths
    ? singleMonth
      ? copy.singleScope
      : copy.futureScope
    : copy.amountOnly;
  const lineValue =
    form.operationType === 'add_line'
      ? form.feeTypeId
        ? copy.complete
        : copy.notSelected
      : selectedLine?.label ?? copy.notSelected;

  const readiness: ReadinessItem[] = [
    { label: copy.operation, value: operationLabel, complete: true },
    {
      label: copy.line,
      value: lineValue,
      complete: form.operationType === 'add_line' ? Boolean(form.feeTypeId) : Boolean(selectedLine),
    },
    {
      label: copy.scope,
      value: scopeLabel,
      complete: form.operationType !== 'modify_line' || Boolean(form.amendmentPath),
    },
    ...(usesMonths
      ? [{ label: copy.month, value: monthLabels[0] ?? copy.noMonth, complete: Boolean(form.effectivePeriodId) }]
      : []),
    { label: copy.reason, value: form.reason || copy.notSelected, complete: Boolean(form.reason.trim()) },
    ...(form.operationType === 'cancel_line'
      ? []
      : [{ label: copy.amount, value: form.amount || copy.notSelected, complete: amountReady(form) }]),
  ];
  const pending = readiness.filter((item) => !item.complete);
  const readyForBackend = canSubmitAgreementAmendmentForm(form, selectedLine);

  return (
    <section className="student-finance-amendment-preview student-finance-amendment-live-preview" aria-live="polite">
      <header className="student-finance-amendment-live-preview__header">
        <div>
          <h3>{copy.title}</h3>
          <p className="tiny muted">{copy.subtitle}</p>
        </div>
        <span
          className={[
            'student-finance-amendment-live-preview__status',
            previewLoading
              ? 'student-finance-amendment-live-preview__status--loading'
              : preview
                ? 'student-finance-amendment-live-preview__status--ready'
                : readyForBackend
                  ? 'student-finance-amendment-live-preview__status--ready'
                  : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {previewLoading ? copy.updating : preview ? copy.resultReady : readyForBackend ? copy.ready : copy.waiting}
        </span>
      </header>

      <section className="student-finance-amendment-live-preview__section">
        <h4>{copy.decisionSummary}</h4>
        <div className="student-finance-amendment-live-preview__readiness">
          {readiness.map((item) => (
            <div
              key={item.label}
              className={[
                'student-finance-amendment-live-preview__readiness-item',
                item.complete ? 'is-complete' : 'is-pending',
              ].join(' ')}
            >
              <span className="tiny muted">{item.label}</span>
              <strong dir="auto">{item.value}</strong>
              <span className="tiny">{item.complete ? `✓ ${copy.complete}` : `○ ${copy.pending}`}</span>
            </div>
          ))}
        </div>
        {!preview && pending.length ? (
          <p className="student-finance-amendment-live-preview__pending-note">
            {copy.waiting}: <strong>{pending.map((item) => item.label).join('، ')}</strong>
          </p>
        ) : null}
        {error && !previewLoading ? (
          <p className="student-finance-amendment-live-preview__error" role="alert">
            <strong>{copy.previewError}:</strong> {error}
          </p>
        ) : null}
      </section>

      {usesMonths ? (
        <section className="student-finance-amendment-live-preview__section">
          <div className="student-finance-amendment-live-preview__section-title-row">
            <h4>{copy.affectedMonths}</h4>
            {monthLabels.length ? (
              <span className="student-finance-amendment-live-preview__count">
                {singleMonth ? copy.singleMonth : monthLabels.length}
              </span>
            ) : null}
          </div>
          {monthLabels.length ? (
            <div className="student-finance-amendment-live-preview__months">
              {monthLabels.map((label, index) => (
                <article
                  key={`${label}-${index}`}
                  className={[
                    'student-finance-amendment-live-preview__month',
                    singleMonth ? 'student-finance-amendment-live-preview__month--single' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="student-finance-amendment-live-preview__month-index">
                    {singleMonth ? '●' : index + 1}
                  </span>
                  <strong dir="auto">{label}</strong>
                  <span className="tiny muted">{singleMonth ? copy.singleMonth : copy.selected}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="student-finance-amendment-live-preview__empty-month">
              <span>◷</span>
              <strong>{copy.noMonth}</strong>
            </div>
          )}
          {lockedMonthLabels.length ? (
            <p className="student-finance-amendment-live-preview__locked" role="note">
              {copy.lockedMonths}: {lockedMonthLabels.join('، ')}
            </p>
          ) : null}
        </section>
      ) : null}

      {preview ? (
        <>
          <section className="student-finance-amendment-live-preview__section">
            <div className="student-finance-amendment-live-preview__section-title-row">
              <h4>{copy.financialImpact}</h4>
              <span
                className={[
                  'student-finance-amendment-live-preview__decision-badge',
                  preview.canApply ? 'is-allowed' : 'is-blocked',
                ].join(' ')}
              >
                {preview.canApply ? copy.applyAllowed : copy.needsReview}
              </span>
            </div>

            {hasAgreementAmendmentPricingContract(preview.pricingContract) && preview.pricingContract ? (
              <AgreementAmendmentPricingContractPreview
                contract={preview.pricingContract}
                currency={preview.currency}
                labelMode={resolveAgreementAmendmentPricingContractLabelMode(
                  form.operationType,
                  form.amendmentPath,
                )}
              />
            ) : shouldShowAgreementAmendmentLegacyAmounts(preview) ? (
              <dl className="student-finance-amendment-live-preview__money-grid">
                {preview.amountBefore != null ? (
                  <div>
                    <dt>{copy.amountBefore}</dt>
                    <dd><FinanceMoney amount={preview.amountBefore} currency={preview.currency ?? currency ?? undefined} /></dd>
                  </div>
                ) : null}
                {preview.amountAfter != null ? (
                  <div>
                    <dt>{copy.amountAfter}</dt>
                    <dd><FinanceMoney amount={preview.amountAfter} currency={preview.currency ?? currency ?? undefined} /></dd>
                  </div>
                ) : null}
                {preview.delta != null ? (
                  <div>
                    <dt>{copy.delta}</dt>
                    <dd><FinanceMoney amount={preview.delta} currency={preview.currency ?? currency ?? undefined} /></dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </section>

          {shouldShowAgreementAmendmentBlockingReasons(preview) ? (
            <section className="student-finance-amendment-live-preview__section student-finance-amendment-live-preview__section--danger" role="alert">
              {preview.blockingReasons.map((reason) => (
                <p key={reason.code}>{resolveAgreementAmendmentBlockingMessage(reason, t)}</p>
              ))}
              {isBlockedByOneTimeLineNotPeriodAmendable(preview) ? (
                <p>{t('admin.student360.financeWorkspace.agreementAmendment.oneTimeBlockedHint')}</p>
              ) : null}
            </section>
          ) : null}

          {preview.warnings.length ? (
            <section className="student-finance-amendment-live-preview__section student-finance-amendment-live-preview__section--warning">
              {preview.warnings.map((warning) => (
                <p key={`${warning.code}-${warning.message ?? ''}`}>
                  {resolveAgreementAmendmentWarningMessage(warning, t, preview.pricingContract)}
                </p>
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
