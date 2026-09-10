'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  AgreementAmendmentFormState,
  AgreementAmendmentPeriodOption,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from '../utils/resolve-amendment-form-options';
import { canSubmitAgreementAmendmentForm } from '../utils/build-agreement-amendment-payload';
import {
  hasAgreementAmendmentPricingContract,
  resolveAgreementAmendmentPricingContractLabelMode,
  shouldShowAgreementAmendmentBlockingReasons,
  shouldShowAgreementAmendmentLegacyAmounts,
} from '../utils/agreement-amendment-pricing-contract';
import {
  resolveAgreementAmendmentBlockingMessage,
  resolveAgreementAmendmentWarningMessage,
} from '../utils/resolve-agreement-amendment-warning';
import { formatAmendmentEffectivePeriodLabel } from '../utils/agreement-amendment-period-labels';
import { AgreementAmendmentPricingContractPreview } from './agreement-amendment-pricing-contract-preview';
import { resolveAffectedMonthLabels } from './agreement-amendment-preview-model';
import './agreement-amendment-reason-preview.css';

const COPY = {
  ar: {
    title: 'المعاينة',
    subtitle: 'النتيجة المالية المؤكدة من Odoo',
    waiting: 'أكمل الاختيارات لتظهر النتيجة',
    updating: 'جاري التحقق مع Odoo…',
    resultReady: 'تم التحقق من Odoo',
    operation: 'العملية',
    modify: 'تعديل خدمة',
    add: 'إضافة خدمة',
    remove: 'إزالة خدمة',
    service: 'الخدمة',
    newPrice: 'السعر',
    selectedMonths: 'الأشهر',
    effectiveFrom: 'ابتداءً من',
    reason: 'السبب',
    financialImpact: 'الأثر المالي',
    monthDetails: 'تفاصيل الأشهر',
    amountBefore: 'قبل',
    amountAfter: 'بعد',
    delta: 'الفرق',
    applyAllowed: 'جاهز للتفعيل',
    needsReview: 'غير جاهز للتفعيل',
    specialPrice: 'سعر خاص',
    backendAffected: 'الأشهر التي أكدها Odoo',
    backendChanges: 'التغييرات التي سينفذها Odoo',
    created: 'إنشاء',
    updated: 'تعديل',
    cancelled: 'إزالة',
    noBackendResult: 'لم تصل نتيجة مالية بعد.',
  },
  fr: {
    title: 'Aperçu', subtitle: 'Résultat financier confirmé par Odoo', waiting: 'Complétez les choix pour afficher le résultat', updating: 'Vérification avec Odoo…', resultReady: 'Vérifié par Odoo', operation: 'Opération', modify: 'Modifier un service', add: 'Ajouter un service', remove: 'Retirer un service', service: 'Service', newPrice: 'Prix', selectedMonths: 'Mois', effectiveFrom: 'À partir de', reason: 'Motif', financialImpact: 'Impact financier', monthDetails: 'Détail des mois', amountBefore: 'Avant', amountAfter: 'Après', delta: 'Écart', applyAllowed: 'Prêt à appliquer', needsReview: 'Non prêt à appliquer', specialPrice: 'Prix spécial', backendAffected: 'Mois confirmés par Odoo', backendChanges: 'Modifications qui seront appliquées par Odoo', created: 'Création', updated: 'Modification', cancelled: 'Retrait', noBackendResult: 'Aucun résultat financier reçu pour le moment.',
  },
  en: {
    title: 'Preview', subtitle: 'Financial result confirmed by Odoo', waiting: 'Complete the choices to show the result', updating: 'Checking with Odoo…', resultReady: 'Verified by Odoo', operation: 'Operation', modify: 'Modify service', add: 'Add service', remove: 'Remove service', service: 'Service', newPrice: 'Price', selectedMonths: 'Months', effectiveFrom: 'Starting', reason: 'Reason', financialImpact: 'Financial impact', monthDetails: 'Month details', amountBefore: 'Before', amountAfter: 'After', delta: 'Difference', applyAllowed: 'Ready to apply', needsReview: 'Not ready to apply', specialPrice: 'Special price', backendAffected: 'Months confirmed by Odoo', backendChanges: 'Changes Odoo will apply', created: 'Create', updated: 'Update', cancelled: 'Remove', noBackendResult: 'No financial result has been received yet.',
  },
  es: {
    title: 'Vista previa', subtitle: 'Resultado financiero confirmado por Odoo', waiting: 'Complete las opciones para mostrar el resultado', updating: 'Verificando con Odoo…', resultReady: 'Verificado por Odoo', operation: 'Operación', modify: 'Modificar servicio', add: 'Añadir servicio', remove: 'Eliminar servicio', service: 'Servicio', newPrice: 'Precio', selectedMonths: 'Meses', effectiveFrom: 'Desde', reason: 'Motivo', financialImpact: 'Impacto financiero', monthDetails: 'Detalle de meses', amountBefore: 'Antes', amountAfter: 'Después', delta: 'Diferencia', applyAllowed: 'Listo para aplicar', needsReview: 'No listo para aplicar', specialPrice: 'Precio especial', backendAffected: 'Meses confirmados por Odoo', backendChanges: 'Cambios que aplicará Odoo', created: 'Crear', updated: 'Modificar', cancelled: 'Eliminar', noBackendResult: 'Aún no se recibió un resultado financiero.',
  },
} as const;

export function AgreementAmendmentLivePreviewPanel({
  form,
  selectedLine,
  serviceLabel,
  periods,
  preview,
  previewLoading,
  error,
  currency,
}: {
  form: AgreementAmendmentFormState;
  selectedLine: AgreementAmendmentLineOption | null;
  serviceLabel?: string | null;
  periods: AgreementAmendmentPeriodOption[];
  preview: NormalizedAgreementAmendmentPreview | null;
  previewLoading: boolean;
  error?: string | null;
  currency: string | null;
}) {
  const { locale } = useLocale();
  const t = useT();
  const copy = COPY[locale] ?? COPY.en;
  const selectedPeriodIds = form.selectedPeriodIds ?? [];
  const periodImpacts = preview?.periodImpacts ?? [];
  const readyForBackend = canSubmitAgreementAmendmentForm(form, selectedLine);
  const operationLabel =
    form.operationType === 'add_line'
      ? copy.add
      : form.operationType === 'cancel_line'
        ? copy.remove
        : copy.modify;
  const selectedMonthLabels = selectedPeriodIds
    .map((periodId) => periods.find((period) => String(period.id) === periodId))
    .filter((period): period is AgreementAmendmentPeriodOption => Boolean(period))
    .map((period) => formatAmendmentEffectivePeriodLabel(period, t));
  const effectivePeriod = periods.find((period) => String(period.id) === form.effectivePeriodId) ?? null;
  const backendAffectedMonths = preview
    ? resolveAffectedMonthLabels({
        periods,
        affectedPeriods: preview.affectedPeriods,
        effectivePeriodId: form.effectivePeriodId,
        effectivePeriodEndId: form.effectivePeriodEndId,
        locale,
      })
    : [];
  const displayPrice = form.operationType === 'cancel_line' ? null : form.amount.trim();

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
              : preview?.canApply
                ? 'student-finance-amendment-live-preview__status--ready'
                : preview
                  ? 'student-finance-amendment-live-preview__status--blocked'
                  : readyForBackend
                    ? 'student-finance-amendment-live-preview__status--ready'
                    : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {previewLoading ? copy.updating : preview ? copy.resultReady : copy.waiting}
        </span>
      </header>

      <section className="student-finance-amendment-live-preview__hero">
        <div className="student-finance-amendment-live-preview__hero-row">
          <span className="tiny muted">{copy.operation}</span>
          <strong>{operationLabel}</strong>
        </div>
        <div className="student-finance-amendment-live-preview__hero-row">
          <span className="tiny muted">{copy.service}</span>
          <strong dir="auto">{serviceLabel ?? '—'}</strong>
        </div>
        <div className="student-finance-amendment-live-preview__hero-row">
          <span className="tiny muted">{copy.reason}</span>
          <strong dir="auto">{form.reason || '—'}</strong>
        </div>
        {displayPrice != null ? (
          <div className="student-finance-amendment-live-preview__hero-row">
            <span className="tiny muted">{copy.newPrice}</span>
            <strong>{displayPrice || '—'}</strong>
          </div>
        ) : null}
        <div className="student-finance-amendment-live-preview__hero-row">
          <span className="tiny muted">
            {form.operationType === 'modify_line' ? copy.selectedMonths : copy.effectiveFrom}
          </span>
          <strong dir="auto">
            {form.operationType === 'modify_line'
              ? selectedMonthLabels.length || '—'
              : effectivePeriod
                ? formatAmendmentEffectivePeriodLabel(effectivePeriod, t)
                : '—'}
          </strong>
        </div>
      </section>

      {form.operationType === 'modify_line' && selectedMonthLabels.length ? (
        <div className="student-finance-amendment-live-preview__months">
          {selectedMonthLabels.map((label) => (
            <span key={label} className="student-finance-amendment-live-preview__month">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {error && !previewLoading ? (
        <p className="student-finance-amendment-live-preview__error" role="alert">{error}</p>
      ) : null}

      {preview ? (
        <>
          <section className="student-finance-amendment-live-preview__section student-finance-amendment-live-preview__section--result">
            <div className="student-finance-amendment-live-preview__section-title-row">
              <h4>{copy.financialImpact}</h4>
              <span className={[
                'student-finance-amendment-live-preview__decision-badge',
                preview.canApply ? 'is-allowed' : 'is-blocked',
              ].join(' ')}>
                {preview.canApply ? copy.applyAllowed : copy.needsReview}
              </span>
            </div>

            {hasAgreementAmendmentPricingContract(preview.pricingContract) && preview.pricingContract && form.operationType === 'modify_line' ? (
              <AgreementAmendmentPricingContractPreview
                contract={preview.pricingContract}
                currency={preview.currency}
                labelMode={resolveAgreementAmendmentPricingContractLabelMode('modify_line', 'period_range')}
              />
            ) : shouldShowAgreementAmendmentLegacyAmounts(preview) ? (
              <dl className="student-finance-amendment-live-preview__money-grid">
                {preview.amountBefore != null ? (
                  <div><dt>{copy.amountBefore}</dt><dd><FinanceMoney amount={preview.amountBefore} currency={preview.currency ?? currency ?? undefined} /></dd></div>
                ) : null}
                {preview.amountAfter != null ? (
                  <div><dt>{copy.amountAfter}</dt><dd><FinanceMoney amount={preview.amountAfter} currency={preview.currency ?? currency ?? undefined} /></dd></div>
                ) : null}
                {preview.delta != null ? (
                  <div><dt>{copy.delta}</dt><dd><FinanceMoney amount={preview.delta} currency={preview.currency ?? currency ?? undefined} /></dd></div>
                ) : null}
              </dl>
            ) : (
              <p className="tiny muted">{copy.noBackendResult}</p>
            )}
          </section>

          {backendAffectedMonths.length ? (
            <section className="student-finance-amendment-live-preview__section">
              <h4>{copy.backendAffected}</h4>
              <div className="student-finance-amendment-live-preview__months">
                {backendAffectedMonths.map((label) => (
                  <span key={label} className="student-finance-amendment-live-preview__month student-finance-amendment-live-preview__month--confirmed">
                    {label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {(preview.createdInstallments.length || preview.updatedInstallments.length || preview.cancelledInstallments.length) ? (
            <section className="student-finance-amendment-live-preview__section">
              <h4>{copy.backendChanges}</h4>
              <div className="student-finance-amendment-live-preview__change-counts">
                <div><span>{copy.created}</span><strong>{preview.createdInstallments.length}</strong></div>
                <div><span>{copy.updated}</span><strong>{preview.updatedInstallments.length}</strong></div>
                <div><span>{copy.cancelled}</span><strong>{preview.cancelledInstallments.length}</strong></div>
              </div>
            </section>
          ) : null}

          {periodImpacts.length ? (
            <section className="student-finance-amendment-live-preview__section">
              <h4>{copy.monthDetails}</h4>
              <div className="student-finance-amendment-live-preview__period-impacts">
                {periodImpacts.map((impact, index) => (
                  <article key={`${impact.effectivePeriodId ?? 'period'}-${impact.periodKey ?? index}`} className="student-finance-amendment-live-preview__period-impact">
                    <strong dir="auto">{impact.label ?? impact.periodKey ?? '—'}</strong>
                    <div className="student-finance-amendment-live-preview__period-impact-money">
                      {impact.currentAmount != null ? <FinanceMoney amount={impact.currentAmount} currency={preview.currency ?? currency ?? undefined} /> : <span>—</span>}
                      <span aria-hidden>→</span>
                      {impact.proposedAmount != null ? <FinanceMoney amount={impact.proposedAmount} currency={preview.currency ?? currency ?? undefined} /> : <span>—</span>}
                    </div>
                    {impact.delta != null ? (
                      <span className="tiny muted">
                        {copy.delta}: <FinanceMoney amount={impact.delta} currency={preview.currency ?? currency ?? undefined} />
                      </span>
                    ) : null}
                    {impact.overrideApplied ? <span className="student-finance-amendment-live-preview__special-badge">{copy.specialPrice}</span> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {shouldShowAgreementAmendmentBlockingReasons(preview) ? (
            <section className="student-finance-amendment-live-preview__section student-finance-amendment-live-preview__section--danger" role="alert">
              {preview.blockingReasons.map((reason) => (
                <p key={reason.code}>{resolveAgreementAmendmentBlockingMessage(reason, t)}</p>
              ))}
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
