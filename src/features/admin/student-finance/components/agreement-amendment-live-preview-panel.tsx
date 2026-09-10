'use client';

import { useEffect, useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { fetchFinancialAgreement } from '../api/finance-admin-api';
import type {
  AgreementAmendmentFormState,
  AgreementAmendmentPeriodOption,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
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
import { AgreementAmendmentPricingContractPreview } from './agreement-amendment-pricing-contract-preview';
import {
  formatAmendmentPreviewPeriodLabel,
  resolveAffectedMonthLabels,
} from './agreement-amendment-preview-model';
import { buildAgreementAnnualSummary } from './agreement-amendment-annual-summary';
import './agreement-amendment-reason-preview.css';
import './agreement-amendment-annual-summary.css';

const COPY = {
  ar: {
    title: 'المعاينة', subtitle: 'النتيجة المالية المؤكدة من Odoo', waiting: 'أكمل الاختيارات لتظهر النتيجة', updating: 'جاري التحقق مع Odoo…', resultReady: 'تم التحقق من Odoo', operation: 'العملية', modify: 'تعديل خدمة', add: 'إضافة خدمة', remove: 'إزالة خدمة', service: 'الخدمة', newPrice: 'السعر', selectedMonths: 'الأشهر', effectiveFrom: 'ابتداءً من', reason: 'السبب', financialImpact: 'الأثر المالي', monthDetails: 'تفاصيل الأشهر', amountBefore: 'قبل', amountAfter: 'بعد', delta: 'الفرق', applyAllowed: 'جاهز للتفعيل', needsReview: 'غير جاهز للتفعيل', specialPrice: 'سعر خاص', backendAffected: 'الأشهر التي أكدها Odoo', backendChanges: 'التغييرات التي سينفذها Odoo', created: 'إنشاء', updated: 'تعديل', cancelled: 'إزالة', noBackendResult: 'لم تصل نتيجة مالية بعد.', annualTitle: 'الخلاصة السنوية', annualSubtitle: 'القيم الحالية المؤكدة من Odoo', annualTotal: 'المجموع السنوي الحالي', annualImpact: 'أثر التعديل المعاين', servicesTitle: 'تفصيل الخدمات', annualUnavailable: 'المجموع السنوي غير متاح من Odoo.', serviceTotalUnavailable: 'غير متاح', unitPrice: 'السعر', periodCount: 'عدد الفترات', annualLoading: 'جاري تحميل الخلاصة السنوية…',
  },
  fr: {
    title: 'Aperçu', subtitle: 'Résultat financier confirmé par Odoo', waiting: 'Complétez les choix pour afficher le résultat', updating: 'Vérification avec Odoo…', resultReady: 'Vérifié par Odoo', operation: 'Opération', modify: 'Modifier un service', add: 'Ajouter un service', remove: 'Retirer un service', service: 'Service', newPrice: 'Prix', selectedMonths: 'Mois', effectiveFrom: 'À partir de', reason: 'Motif', financialImpact: 'Impact financier', monthDetails: 'Détail des mois', amountBefore: 'Avant', amountAfter: 'Après', delta: 'Écart', applyAllowed: 'Prêt à appliquer', needsReview: 'Non prêt à appliquer', specialPrice: 'Prix spécial', backendAffected: 'Mois confirmés par Odoo', backendChanges: 'Modifications qui seront appliquées par Odoo', created: 'Création', updated: 'Modification', cancelled: 'Retrait', noBackendResult: 'Aucun résultat financier reçu pour le moment.', annualTitle: 'Résumé annuel', annualSubtitle: 'Valeurs actuelles confirmées par Odoo', annualTotal: 'Total annuel actuel', annualImpact: 'Impact de la modification prévisualisée', servicesTitle: 'Détail par service', annualUnavailable: 'Total annuel non fourni par Odoo.', serviceTotalUnavailable: 'Indisponible', unitPrice: 'Prix', periodCount: 'Nombre de périodes', annualLoading: 'Chargement du résumé annuel…',
  },
  en: {
    title: 'Preview', subtitle: 'Financial result confirmed by Odoo', waiting: 'Complete the choices to show the result', updating: 'Checking with Odoo…', resultReady: 'Verified by Odoo', operation: 'Operation', modify: 'Modify service', add: 'Add service', remove: 'Remove service', service: 'Service', newPrice: 'Price', selectedMonths: 'Months', effectiveFrom: 'Starting', reason: 'Reason', financialImpact: 'Financial impact', monthDetails: 'Month details', amountBefore: 'Before', amountAfter: 'After', delta: 'Difference', applyAllowed: 'Ready to apply', needsReview: 'Not ready to apply', specialPrice: 'Special price', backendAffected: 'Months confirmed by Odoo', backendChanges: 'Changes Odoo will apply', created: 'Create', updated: 'Update', cancelled: 'Remove', noBackendResult: 'No financial result has been received yet.', annualTitle: 'Annual summary', annualSubtitle: 'Current values confirmed by Odoo', annualTotal: 'Current annual total', annualImpact: 'Previewed amendment impact', servicesTitle: 'Service breakdown', annualUnavailable: 'Annual total is not available from Odoo.', serviceTotalUnavailable: 'Unavailable', unitPrice: 'Price', periodCount: 'Period count', annualLoading: 'Loading annual summary…',
  },
  es: {
    title: 'Vista previa', subtitle: 'Resultado financiero confirmado por Odoo', waiting: 'Complete las opciones para mostrar el resultado', updating: 'Verificando con Odoo…', resultReady: 'Verificado por Odoo', operation: 'Operación', modify: 'Modificar servicio', add: 'Añadir servicio', remove: 'Eliminar servicio', service: 'Servicio', newPrice: 'Precio', selectedMonths: 'Meses', effectiveFrom: 'Desde', reason: 'Motivo', financialImpact: 'Impacto financiero', monthDetails: 'Detalle de meses', amountBefore: 'Antes', amountAfter: 'Después', delta: 'Diferencia', applyAllowed: 'Listo para aplicar', needsReview: 'No listo para aplicar', specialPrice: 'Precio especial', backendAffected: 'Meses confirmados por Odoo', backendChanges: 'Cambios que aplicará Odoo', created: 'Crear', updated: 'Modificar', cancelled: 'Eliminar', noBackendResult: 'Aún no se recibió un resultado financiero.', annualTitle: 'Resumen anual', annualSubtitle: 'Valores actuales confirmados por Odoo', annualTotal: 'Total anual actual', annualImpact: 'Impacto de la modificación previsualizada', servicesTitle: 'Detalle por servicio', annualUnavailable: 'El total anual no está disponible desde Odoo.', serviceTotalUnavailable: 'No disponible', unitPrice: 'Precio', periodCount: 'Número de períodos', annualLoading: 'Cargando resumen anual…',
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
  const [annualAgreement, setAnnualAgreement] = useState<FinancialAgreement | null>(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const annualAgreementId = preview?.currentAgreement?.id ?? null;

  useEffect(() => {
    if (annualAgreementId == null) {
      setAnnualAgreement(null);
      setAnnualLoading(false);
      return;
    }
    let cancelled = false;
    setAnnualLoading(true);
    void fetchFinancialAgreement(annualAgreementId).then((res) => {
      if (cancelled) return;
      setAnnualLoading(false);
      setAnnualAgreement(res.success && res.data ? res.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [annualAgreementId]);

  const annualSummary = useMemo(
    () => buildAgreementAnnualSummary(annualAgreement),
    [annualAgreement],
  );
  const annualTotal = annualSummary.total ?? preview?.currentAgreement?.netAmount ?? null;
  const annualCurrency = annualAgreement?.currency?.name ?? preview?.currency ?? currency ?? undefined;

  const operationLabel =
    form.operationType === 'add_line'
      ? copy.add
      : form.operationType === 'cancel_line'
        ? copy.remove
        : copy.modify;
  const selectedMonthLabels = selectedPeriodIds
    .map((periodId) => periods.find((period) => String(period.id) === periodId))
    .filter((period): period is AgreementAmendmentPeriodOption => Boolean(period))
    .map((period) => formatAmendmentPreviewPeriodLabel(period, locale));
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
                ? formatAmendmentPreviewPeriodLabel(effectivePeriod, locale)
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

          <section className="student-finance-amendment-annual-summary">
            <div className="student-finance-amendment-annual-summary__head">
              <div>
                <h4>{copy.annualTitle}</h4>
                <p className="tiny muted">{copy.annualSubtitle}</p>
              </div>
            </div>

            {annualLoading ? <p className="tiny muted">{copy.annualLoading}</p> : null}

            <div className="student-finance-amendment-annual-summary__total">
              <span>{copy.annualTotal}</span>
              <strong>
                {annualTotal != null ? (
                  <FinanceMoney amount={annualTotal} currency={annualCurrency} />
                ) : copy.annualUnavailable}
              </strong>
            </div>

            {preview.delta != null ? (
              <div className="student-finance-amendment-annual-summary__impact">
                <span>{copy.annualImpact}</span>
                <strong><FinanceMoney amount={preview.delta} currency={annualCurrency} /></strong>
              </div>
            ) : null}

            {annualSummary.services.length ? (
              <div className="student-finance-amendment-annual-summary__services">
                <h5 className="student-finance-amendment-annual-summary__services-title">{copy.servicesTitle}</h5>
                {annualSummary.services.map((service) => (
                  <div key={service.key} className="student-finance-amendment-annual-summary__service">
                    <div className="student-finance-amendment-annual-summary__service-info">
                      <strong dir="auto">{service.label}</strong>
                      {(service.unitPrice != null || service.periodCount != null) ? (
                        <span className="student-finance-amendment-annual-summary__service-meta">
                          {service.unitPrice != null ? (
                            <>{copy.unitPrice}: <FinanceMoney amount={service.unitPrice} currency={annualCurrency} /></>
                          ) : null}
                          {service.unitPrice != null && service.periodCount != null ? ' · ' : null}
                          {service.periodCount != null ? `${copy.periodCount}: ${service.periodCount}` : null}
                        </span>
                      ) : null}
                    </div>
                    <strong className="student-finance-amendment-annual-summary__service-total">
                      {service.total != null ? (
                        <FinanceMoney amount={service.total} currency={annualCurrency} />
                      ) : copy.serviceTotalUnavailable}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
}
