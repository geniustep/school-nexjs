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
import './agreement-amendment-reason-preview.css';

const COPY = {
  ar: {
    title: 'المعاينة الحية',
    subtitle: 'النتيجة المالية المؤكدة من Odoo',
    waiting: 'اختر الخدمة والسعر والأشهر والسبب',
    updating: 'جاري تحديث المعاينة…',
    resultReady: 'نتيجة Odoo جاهزة',
    service: 'الخدمة',
    newPrice: 'السعر الجديد',
    selectedMonths: 'الأشهر المختارة',
    reason: 'السبب',
    financialImpact: 'الأثر المالي',
    monthDetails: 'تفاصيل الأشهر',
    amountBefore: 'قبل',
    amountAfter: 'بعد',
    delta: 'الفرق',
    applyAllowed: 'مسموح بالتطبيق',
    needsReview: 'يحتاج مراجعة',
    specialPrice: 'سعر خاص',
  },
  fr: {
    title: 'Aperçu en direct', subtitle: 'Résultat financier confirmé par Odoo', waiting: 'Choisissez le service, le prix, les mois et le motif', updating: 'Mise à jour…', resultReady: 'Résultat Odoo prêt', service: 'Service', newPrice: 'Nouveau prix', selectedMonths: 'Mois sélectionnés', reason: 'Motif', financialImpact: 'Impact financier', monthDetails: 'Détail des mois', amountBefore: 'Avant', amountAfter: 'Après', delta: 'Écart', applyAllowed: 'Application autorisée', needsReview: 'Révision nécessaire', specialPrice: 'Prix spécial',
  },
  en: {
    title: 'Live preview', subtitle: 'Financial result confirmed by Odoo', waiting: 'Choose the service, price, months and reason', updating: 'Updating…', resultReady: 'Odoo result ready', service: 'Service', newPrice: 'New price', selectedMonths: 'Selected months', reason: 'Reason', financialImpact: 'Financial impact', monthDetails: 'Month details', amountBefore: 'Before', amountAfter: 'After', delta: 'Difference', applyAllowed: 'Allowed to apply', needsReview: 'Needs review', specialPrice: 'Special price',
  },
  es: {
    title: 'Vista previa', subtitle: 'Resultado financiero confirmado por Odoo', waiting: 'Elija servicio, precio, meses y motivo', updating: 'Actualizando…', resultReady: 'Resultado Odoo listo', service: 'Servicio', newPrice: 'Nuevo precio', selectedMonths: 'Meses seleccionados', reason: 'Motivo', financialImpact: 'Impacto financiero', monthDetails: 'Detalle de meses', amountBefore: 'Antes', amountAfter: 'Después', delta: 'Diferencia', applyAllowed: 'Aplicación permitida', needsReview: 'Necesita revisión', specialPrice: 'Precio especial',
  },
} as const;

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
  const selectedPeriodIds = form.selectedPeriodIds ?? [];
  const periodImpacts = preview?.periodImpacts ?? [];
  const readyForBackend = canSubmitAgreementAmendmentForm(form, selectedLine);
  const selectedMonthLabels = selectedPeriodIds
    .map((periodId) => periods.find((period) => String(period.id) === periodId))
    .filter((period): period is AgreementAmendmentPeriodOption => Boolean(period))
    .map((period) => formatAmendmentEffectivePeriodLabel(period, t));

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
              : preview || readyForBackend
                ? 'student-finance-amendment-live-preview__status--ready'
                : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {previewLoading ? copy.updating : preview ? copy.resultReady : copy.waiting}
        </span>
      </header>

      <section className="student-finance-amendment-live-preview__section">
        <div className="student-finance-amendment-live-preview__readiness">
          <div className={selectedLine ? 'is-complete student-finance-amendment-live-preview__readiness-item' : 'is-pending student-finance-amendment-live-preview__readiness-item'}>
            <span className="tiny muted">{copy.service}</span>
            <strong dir="auto">{selectedLine?.label ?? '—'}</strong>
          </div>
          <div className={form.amount.trim() ? 'is-complete student-finance-amendment-live-preview__readiness-item' : 'is-pending student-finance-amendment-live-preview__readiness-item'}>
            <span className="tiny muted">{copy.newPrice}</span>
            <strong>{form.amount.trim() || '—'}</strong>
          </div>
          <div className={selectedPeriodIds.length ? 'is-complete student-finance-amendment-live-preview__readiness-item' : 'is-pending student-finance-amendment-live-preview__readiness-item'}>
            <span className="tiny muted">{copy.selectedMonths}</span>
            <strong>{selectedPeriodIds.length || '—'}</strong>
          </div>
          <div className={form.reason.trim() ? 'is-complete student-finance-amendment-live-preview__readiness-item' : 'is-pending student-finance-amendment-live-preview__readiness-item'}>
            <span className="tiny muted">{copy.reason}</span>
            <strong dir="auto">{form.reason || '—'}</strong>
          </div>
        </div>
        {selectedMonthLabels.length ? (
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
      </section>

      {preview ? (
        <>
          <section className="student-finance-amendment-live-preview__section">
            <div className="student-finance-amendment-live-preview__section-title-row">
              <h4>{copy.financialImpact}</h4>
              <span className={[
                'student-finance-amendment-live-preview__decision-badge',
                preview.canApply ? 'is-allowed' : 'is-blocked',
              ].join(' ')}>
                {preview.canApply ? copy.applyAllowed : copy.needsReview}
              </span>
            </div>

            {hasAgreementAmendmentPricingContract(preview.pricingContract) && preview.pricingContract ? (
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
            ) : null}
          </section>

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
