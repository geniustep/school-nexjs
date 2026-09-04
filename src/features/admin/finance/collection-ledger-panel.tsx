'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review
 *
 * Unified read-only collection ledger. Historical rows are projections over
 * Historical Settlement and never imply a new treasury event.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFinanceReferenceData, useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { exportCollectionLedger } from '@/features/admin/finance/utils/collection-ledger-export';
import {
  buildCollectionLedgerAggregationsQuery,
  buildCollectionLedgerQuery,
  collectionLedgerDisplayDate,
  collectionLedgerEndpoints,
  collectionLedgerReceiptProxyUrl,
  collectionLedgerServiceSummary,
  defaultCollectionLedgerFilters,
  normalizeCollectionLedgerDetailPayload,
  normalizeCollectionLedgerListPayload,
  normalizeCollectionLedgerSummary,
  type CollectionLedgerFilters,
  type CollectionLedgerRecord,
  type CollectionLedgerRecordTypeFilter,
} from '@/features/admin/finance/utils/collection-ledger-present';
import '@/features/admin/finance/collection-ledger.css';

const COPY = {
  ar: {
    all: 'الكل',
    operational: 'تشغيلي',
    historical: 'تاريخي',
    historicalBadge: 'أداء تاريخي مستورد',
    operationalBadge: 'تحصيل تشغيلي',
    search: 'بحث',
    searchPlaceholder: 'التلميذ أو المرجع',
    academicYear: 'السنة الدراسية',
    allYears: 'كل السنوات',
    service: 'الخدمة',
    allServices: 'كل الخدمات',
    recognizedFrom: 'الاعتراف من',
    recognizedTo: 'إلى',
    clear: 'مسح',
    operationalTotal: 'تحصيلات تشغيلية',
    historicalTotal: 'أداءات تاريخية',
    recognizedTotal: 'إجمالي مؤدى معترف به',
    reference: 'المرجع',
    student: 'التلميذ',
    school: 'المدرسة',
    type: 'النوع',
    date: 'التاريخ',
    recognizedDate: 'تاريخ الاعتراف في رقيم',
    paymentDate: 'تاريخ الأداء',
    method: 'وسيلة الأداء',
    amount: 'المبلغ',
    status: 'الحالة',
    actions: 'إجراء',
    open: 'فتح',
    services: 'الخدمات',
    unavailable: 'غير متوفر',
    sourceUnavailable: 'غير متوفرة في المصدر',
    originalPaymentDate: 'تاريخ الأداء الأصلي',
    originalPaymentMethod: 'وسيلة الأداء الأصلية',
    migrationCutoff: 'تاريخ قطع الترحيل',
    source: 'المصدر',
    receipt: 'إيصال أداء تاريخي',
    printReceipt: 'طباعة الإيصال',
    close: 'إغلاق',
    reversed: 'ملغى / معكوس',
    noDataTitle: 'لا توجد عمليات في هذا النطاق',
    noDataDesc: 'غيّر الفلاتر أو اختر نطاقاً آخر.',
    analysis: 'التحليل التشغيلي',
    excel: 'Excel',
    pdf: 'PDF',
    exportError: 'تعذر تصدير الدفتر. أعد المحاولة.',
    receiptError: 'تعذر فتح الإيصال التاريخي.',
    dateError: 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.',
    backendSemantics: 'الأداء التاريخي معترف به في الرصيد، ولا يمثل حركة صندوق أو بنك جديدة.',
    records: 'السجلات',
  },
  en: {
    all: 'All', operational: 'Operational', historical: 'Historical', historicalBadge: 'Imported historical payment', operationalBadge: 'Operational collection',
    search: 'Search', searchPlaceholder: 'Student or reference', academicYear: 'Academic year', allYears: 'All years', service: 'Service', allServices: 'All services', recognizedFrom: 'Recognized from', recognizedTo: 'to', clear: 'Clear',
    operationalTotal: 'Operational collected', historicalTotal: 'Historical paid', recognizedTotal: 'Total recognized paid', reference: 'Reference', student: 'Student', school: 'School', type: 'Type', date: 'Date', recognizedDate: 'Recognized in Raqeem', paymentDate: 'Payment date', method: 'Payment method', amount: 'Amount', status: 'Status', actions: 'Action', open: 'Open', services: 'Services', unavailable: 'Unavailable', sourceUnavailable: 'Unavailable in source', originalPaymentDate: 'Original payment date', originalPaymentMethod: 'Original payment method', migrationCutoff: 'Migration cutoff', source: 'Source', receipt: 'Historical payment receipt', printReceipt: 'Print receipt', close: 'Close', reversed: 'Reversed / cancelled', noDataTitle: 'No records in this scope', noDataDesc: 'Change the filters or choose another scope.', analysis: 'Operational analysis', excel: 'Excel', pdf: 'PDF', exportError: 'Could not export the ledger. Try again.', receiptError: 'Could not open the historical receipt.', dateError: 'Start date must be before or equal to end date.', backendSemantics: 'Historical paid amounts affect recognized balances but are not new cash or bank movements.', records: 'Records',
  },
  fr: {
    all: 'Tout', operational: 'Opérationnel', historical: 'Historique', historicalBadge: 'Paiement historique importé', operationalBadge: 'Encaissement opérationnel',
    search: 'Recherche', searchPlaceholder: 'Élève ou référence', academicYear: 'Année scolaire', allYears: 'Toutes les années', service: 'Service', allServices: 'Tous les services', recognizedFrom: 'Reconnu du', recognizedTo: 'au', clear: 'Effacer',
    operationalTotal: 'Encaissements opérationnels', historicalTotal: 'Paiements historiques', recognizedTotal: 'Total payé reconnu', reference: 'Référence', student: 'Élève', school: 'École', type: 'Type', date: 'Date', recognizedDate: 'Reconnu dans Raqeem', paymentDate: 'Date de paiement', method: 'Mode de paiement', amount: 'Montant', status: 'Statut', actions: 'Action', open: 'Ouvrir', services: 'Services', unavailable: 'Indisponible', sourceUnavailable: 'Indisponible dans la source', originalPaymentDate: 'Date de paiement originale', originalPaymentMethod: 'Mode de paiement original', migrationCutoff: 'Date de coupure migration', source: 'Source', receipt: 'Reçu de paiement historique', printReceipt: 'Imprimer le reçu', close: 'Fermer', reversed: 'Annulé / inversé', noDataTitle: 'Aucune opération dans ce périmètre', noDataDesc: 'Modifiez les filtres ou choisissez un autre périmètre.', analysis: 'Analyse opérationnelle', excel: 'Excel', pdf: 'PDF', exportError: "Impossible d’exporter le registre. Réessayez.", receiptError: "Impossible d’ouvrir le reçu historique.", dateError: 'La date de début doit précéder ou être égale à la date de fin.', backendSemantics: 'Les paiements historiques affectent le solde reconnu sans créer un nouveau mouvement de caisse ou de banque.', records: 'Enregistrements',
  },
  es: {
    all: 'Todo', operational: 'Operativo', historical: 'Histórico', historicalBadge: 'Pago histórico importado', operationalBadge: 'Cobro operativo',
    search: 'Buscar', searchPlaceholder: 'Alumno o referencia', academicYear: 'Año académico', allYears: 'Todos los años', service: 'Servicio', allServices: 'Todos los servicios', recognizedFrom: 'Reconocido desde', recognizedTo: 'hasta', clear: 'Limpiar',
    operationalTotal: 'Cobros operativos', historicalTotal: 'Pagos históricos', recognizedTotal: 'Total pagado reconocido', reference: 'Referencia', student: 'Alumno', school: 'Escuela', type: 'Tipo', date: 'Fecha', recognizedDate: 'Reconocido en Raqeem', paymentDate: 'Fecha de pago', method: 'Método de pago', amount: 'Importe', status: 'Estado', actions: 'Acción', open: 'Abrir', services: 'Servicios', unavailable: 'No disponible', sourceUnavailable: 'No disponible en la fuente', originalPaymentDate: 'Fecha de pago original', originalPaymentMethod: 'Método de pago original', migrationCutoff: 'Corte de migración', source: 'Fuente', receipt: 'Recibo de pago histórico', printReceipt: 'Imprimir recibo', close: 'Cerrar', reversed: 'Anulado / revertido', noDataTitle: 'No hay operaciones en este ámbito', noDataDesc: 'Cambie los filtros o elija otro ámbito.', analysis: 'Análisis operativo', excel: 'Excel', pdf: 'PDF', exportError: 'No se pudo exportar el registro. Inténtelo de nuevo.', receiptError: 'No se pudo abrir el recibo histórico.', dateError: 'La fecha inicial debe ser anterior o igual a la final.', backendSemantics: 'Los pagos históricos afectan al saldo reconocido sin crear un nuevo movimiento de caja o banco.', records: 'Registros',
  },
} as const;

type LedgerBadgeCopy = {
  historicalBadge: string;
  operationalBadge: string;
};

function LedgerKpi({ label, amount, currency }: { label: string; amount: number; currency: unknown }) {
  return (
    <div className="collection-ledger__kpi">
      <span>{label}</span>
      <strong><FinanceMoney amount={amount} currency={currency} /></strong>
    </div>
  );
}

function RecordTypeBadge({ record, copy }: { record: CollectionLedgerRecord; copy: LedgerBadgeCopy }) {
  const historical = record.record_type === 'historical';
  return (
    <span className={`collection-ledger__type-badge ${historical ? 'is-historical' : 'is-operational'}`}>
      {historical ? copy.historicalBadge : copy.operationalBadge}
    </span>
  );
}

export function CollectionLedgerPanel({ onOpenOperationalAnalysis }: { onOpenOperationalAnalysis: () => void }) {
  const t = useT();
  const { locale, dir } = useLocale();
  const copy = COPY[locale];
  const { formatDate, formatDateTime } = useFormat();
  const [filters, setFilters] = useState<CollectionLedgerFilters>(() => defaultCollectionLedgerFilters());
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const { academicYears } = useFinanceReferenceData();
  const { feeTypes } = useFeeTypeOptions();

  const query = useMemo(() => buildCollectionLedgerQuery(filters), [filters]);
  const aggregationsQuery = useMemo(() => buildCollectionLedgerAggregationsQuery(filters), [filters]);
  const state = useAdminResource<unknown>(collectionLedgerEndpoints.list, query);
  const aggregationsState = useAdminResource<unknown>(collectionLedgerEndpoints.aggregations, aggregationsQuery);
  const detailState = useAdminResource<unknown>(
    selectedUid ? collectionLedgerEndpoints.detail(selectedUid) : null,
  );

  const payload = useMemo(() => normalizeCollectionLedgerListPayload(state.data), [state.data]);
  const summary = useMemo(
    () => normalizeCollectionLedgerSummary(aggregationsState.data) ?? payload?.summary ?? null,
    [aggregationsState.data, payload?.summary],
  );
  const detail = useMemo(
    () => normalizeCollectionLedgerDetailPayload(detailState.data),
    [detailState.data],
  );
  const currency = summary?.currency_name ?? summary?.currency_id;
  const dateRangeInvalid = Boolean(
    filters.recognizedDateFrom &&
      filters.recognizedDateTo &&
      filters.recognizedDateFrom > filters.recognizedDateTo,
  );

  function updateFilters(updates: Partial<CollectionLedgerFilters>) {
    setFilters((current) => ({ ...current, ...updates, page: updates.page ?? 1 }));
  }

  function resetFilters() {
    setFilters(defaultCollectionLedgerFilters());
    setSearchDraft('');
  }

  function typeLabel(type: CollectionLedgerRecordTypeFilter) {
    if (type === 'historical') return copy.historical;
    if (type === 'operational') return copy.operational;
    return copy.all;
  }

  function methodLabel(record: CollectionLedgerRecord) {
    if (record.record_type === 'historical') {
      return record.original_payment_method ?? copy.sourceUnavailable;
    }
    return record.payment_method ? paymentMethodLabel(record.payment_method, t) : copy.unavailable;
  }

  function statusLabel(record: CollectionLedgerRecord) {
    if (record.status === 'reversed' || record.status === 'cancelled') return copy.reversed;
    return record.status ?? t('common.dash');
  }

  function displayDate(record: CollectionLedgerRecord) {
    const value = collectionLedgerDisplayDate(record);
    if (!value) return copy.unavailable;
    return record.record_type === 'historical' ? formatDateTime(value) : formatDate(value);
  }

  const columns: Column<CollectionLedgerRecord>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: copy.reference,
        render: (row) => <span className="mono" dir="ltr">{row.reference ?? row.receipt_ref ?? row.uid}</span>,
      },
      {
        key: 'student',
        header: copy.student,
        render: (row) => (
          <span className="collection-ledger__stack" dir="auto">
            <strong>{row.student?.name ?? t('common.dash')}</strong>
            {row.student?.code ? <span className="muted mono" dir="ltr">{row.student.code}</span> : null}
          </span>
        ),
      },
      {
        key: 'services',
        header: copy.services,
        render: (row) => <span dir="auto">{collectionLedgerServiceSummary(row) || t('common.dash')}</span>,
      },
      {
        key: 'type',
        header: copy.type,
        render: (row) => <RecordTypeBadge record={row} copy={copy} />,
      },
      {
        key: 'date',
        header: copy.date,
        render: (row) => (
          <span className="collection-ledger__stack">
            <span dir="ltr">{displayDate(row)}</span>
            <span className="muted">{row.record_type === 'historical' ? copy.recognizedDate : copy.paymentDate}</span>
          </span>
        ),
      },
      {
        key: 'method',
        header: copy.method,
        render: (row) => <span dir="auto">{methodLabel(row)}</span>,
      },
      {
        key: 'amount',
        header: copy.amount,
        render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'status',
        header: copy.status,
        render: (row) => <span dir="auto">{statusLabel(row)}</span>,
      },
      {
        key: 'actions',
        header: copy.actions,
        render: (row) => (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedUid(row.uid)}>
            {copy.open}
          </button>
        ),
      },
    ],
    [copy, currency, formatDate, formatDateTime, t],
  );

  async function runExport(kind: 'excel' | 'pdf') {
    if (exporting) return;
    const popup = kind === 'pdf' ? window.open('', '_blank', 'width=1200,height=800') : null;
    if (kind === 'pdf' && !popup) return;
    setExporting(kind);
    try {
      await exportCollectionLedger({
        kind,
        filters,
        labels: {
          title: t('admin.finance.collectionReports.pageTitle'),
          reference: copy.reference,
          type: copy.type,
          student: copy.student,
          school: copy.school,
          academicYear: copy.academicYear,
          services: copy.services,
          displayDate: copy.date,
          originalDate: copy.originalPaymentDate,
          paymentMethod: copy.method,
          amount: copy.amount,
          status: copy.status,
          operational: copy.operational,
          historical: copy.historical,
          unavailable: copy.sourceUnavailable,
          operationalTotal: copy.operationalTotal,
          historicalTotal: copy.historicalTotal,
          recognizedTotal: copy.recognizedTotal,
        },
        locale,
        dir,
        popup,
      });
    } catch {
      popup?.close();
      window.alert(copy.exportError);
    } finally {
      setExporting(null);
    }
  }

  function openHistoricalReceipt(uid: string) {
    const popup = window.open(collectionLedgerReceiptProxyUrl(uid), '_blank');
    if (!popup) window.alert(copy.receiptError);
    else popup.opener = null;
  }

  if (state.initialLoading || aggregationsState.initialLoading) return <LoadingState />;
  if (state.error) return <ApiErrorView error={state.error} onRetry={state.reload} />;
  if (aggregationsState.error) {
    return <ApiErrorView error={aggregationsState.error} onRetry={aggregationsState.reload} />;
  }

  const records = payload?.items ?? [];
  const pagination = state.meta?.pagination;

  return (
    <div className="collection-ledger">
      <div className="collection-ledger__notice" role="note">
        {copy.backendSemantics}
      </div>

      <div className="collection-ledger__topbar">
        <div className="collection-ledger__segments" role="group" aria-label={copy.type}>
          {(['all', 'operational', 'historical'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`finance-collection-reports__seg${filters.recordType === type ? ' is-active' : ''}`}
              aria-pressed={filters.recordType === type}
              onClick={() => updateFilters({ recordType: type })}
            >
              {typeLabel(type)}
            </button>
          ))}
        </div>
        <div className="collection-ledger__top-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenOperationalAnalysis}>
            {copy.analysis}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={exporting != null} onClick={() => void runExport('excel')}>
            {exporting === 'excel' ? `${copy.excel}…` : copy.excel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={exporting != null} onClick={() => void runExport('pdf')}>
            {exporting === 'pdf' ? `${copy.pdf}…` : copy.pdf}
          </button>
        </div>
      </div>

      <form
        className="toolbar collection-ledger__filters"
        onSubmit={(event) => {
          event.preventDefault();
          updateFilters({ search: searchDraft.trim() });
        }}
      >
        <label className="collection-ledger__field">
          <span>{copy.search}</span>
          <input className="input" value={searchDraft} placeholder={copy.searchPlaceholder} dir="auto" onChange={(event) => setSearchDraft(event.target.value)} />
        </label>
        <label className="collection-ledger__field">
          <span>{copy.academicYear}</span>
          <select className="input" value={filters.academicYearId} onChange={(event) => updateFilters({ academicYearId: event.target.value })}>
            <option value="">{copy.allYears}</option>
            {academicYears.map((year) => <option key={year.id} value={String(year.id)}>{year.name}</option>)}
          </select>
        </label>
        <label className="collection-ledger__field">
          <span>{copy.service}</span>
          <select className="input" value={filters.serviceId} onChange={(event) => updateFilters({ serviceId: event.target.value })}>
            <option value="">{copy.allServices}</option>
            {feeTypes.map((fee) => <option key={fee.id} value={String(fee.id)}>{fee.name}</option>)}
          </select>
        </label>
        <label className="collection-ledger__field">
          <span>{copy.recognizedFrom}</span>
          <input className="input" type="date" dir="ltr" value={filters.recognizedDateFrom} aria-invalid={dateRangeInvalid} onChange={(event) => updateFilters({ recognizedDateFrom: event.target.value })} />
        </label>
        <label className="collection-ledger__field">
          <span>{copy.recognizedTo}</span>
          <input className="input" type="date" dir="ltr" value={filters.recognizedDateTo} aria-invalid={dateRangeInvalid} onChange={(event) => updateFilters({ recognizedDateTo: event.target.value })} />
        </label>
        <button type="submit" className="btn btn--ghost btn--sm">{copy.search}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>{copy.clear}</button>
      </form>
      {dateRangeInvalid ? <p className="form-error" role="alert">{copy.dateError}</p> : null}

      {summary ? (
        <div className="collection-ledger__kpis" aria-live="polite">
          <LedgerKpi label={copy.operationalTotal} amount={summary.operational_collected} currency={currency} />
          <LedgerKpi label={copy.historicalTotal} amount={summary.historical_paid} currency={currency} />
          <LedgerKpi label={copy.recognizedTotal} amount={summary.recognized_paid} currency={currency} />
        </div>
      ) : null}

      {state.fetching && !state.initialLoading ? <p className="muted">{t('common.loading')}</p> : null}

      {!records.length ? (
        <EmptyState title={copy.noDataTitle} description={copy.noDataDesc} />
      ) : (
        <>
          <DataTable columns={columns} rows={records} rowKey={(row) => row.uid} />
          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              pageSize={pagination.page_size}
              onPage={(page) => updateFilters({ page })}
            />
          ) : null}
        </>
      )}

      {selectedUid ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedUid(null)}>
          <div className="card modal-panel modal-panel--form collection-ledger__detail" role="dialog" aria-modal="true" aria-label={copy.open} onMouseDown={(event) => event.stopPropagation()}>
            <div className="collection-ledger__detail-header">
              <div>
                <h2>{detail?.record_type === 'historical' ? copy.receipt : copy.open}</h2>
                {detail ? <RecordTypeBadge record={detail} copy={copy} /> : null}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedUid(null)}>{copy.close}</button>
            </div>

            {detailState.initialLoading ? <LoadingState /> : null}
            {detailState.error ? <ApiErrorView error={detailState.error} onRetry={detailState.reload} /> : null}
            {detail ? (
              <>
                <dl className="collection-ledger__detail-grid">
                  <div><dt>{copy.reference}</dt><dd className="mono" dir="ltr">{detail.reference ?? detail.receipt_ref ?? detail.uid}</dd></div>
                  <div><dt>{copy.student}</dt><dd dir="auto">{detail.student?.name ?? copy.unavailable}</dd></div>
                  <div><dt>{copy.school}</dt><dd dir="auto">{detail.school?.name ?? copy.unavailable}</dd></div>
                  <div><dt>{copy.academicYear}</dt><dd dir="auto">{detail.academic_year?.name ?? copy.unavailable}</dd></div>
                  <div><dt>{copy.amount}</dt><dd><FinanceMoney amount={detail.amount} currency={currency} /></dd></div>
                  <div><dt>{copy.status}</dt><dd dir="auto">{statusLabel(detail)}</dd></div>
                  <div><dt>{detail.record_type === 'historical' ? copy.recognizedDate : copy.paymentDate}</dt><dd dir="ltr">{displayDate(detail)}</dd></div>
                  <div><dt>{copy.originalPaymentDate}</dt><dd dir="ltr">{detail.original_payment_date ? formatDate(detail.original_payment_date) : copy.unavailable}</dd></div>
                  <div><dt>{copy.originalPaymentMethod}</dt><dd dir="auto">{detail.record_type === 'historical' ? detail.original_payment_method ?? copy.sourceUnavailable : methodLabel(detail)}</dd></div>
                  {detail.record_type === 'historical' ? <div><dt>{copy.migrationCutoff}</dt><dd dir="ltr">{detail.migration_cutoff_date ? formatDate(detail.migration_cutoff_date) : copy.unavailable}</dd></div> : null}
                  {detail.source_name || detail.source_type ? <div><dt>{copy.source}</dt><dd dir="auto">{[detail.source_type, detail.source_name].filter(Boolean).join(' · ')}</dd></div> : null}
                </dl>

                <section className="collection-ledger__services card">
                  <h3>{copy.services}</h3>
                  {detail.services.length ? detail.services.map((service, index) => (
                    <div key={`${service.fee_type_id ?? 'service'}-${index}`} className="collection-ledger__service-row">
                      <span dir="auto">{service.name ?? copy.unavailable}</span>
                      <strong><FinanceMoney amount={service.amount} currency={currency} /></strong>
                    </div>
                  )) : <span className="muted">{copy.unavailable}</span>}
                </section>

                <div className="form-actions">
                  {detail.record_type === 'historical' && detail.printable_document_available ? (
                    <button type="button" className="btn btn--primary" onClick={() => openHistoricalReceipt(detail.uid)}>{copy.printReceipt}</button>
                  ) : null}
                  {detail.record_type === 'operational' && detail.receipt_id ? (
                    <Link className="btn btn--primary" href={`/admin/finance/receipts/${detail.receipt_id}`}>{copy.open}</Link>
                  ) : null}
                  <button type="button" className="btn btn--ghost" onClick={() => setSelectedUid(null)}>{copy.close}</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
