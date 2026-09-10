'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  HISTORICAL_COLLECTION_PAGE_SIZE,
  buildHistoricalCollectionBatchPayload,
  buildHistoricalCollectionTemplateRows,
  canConfirmHistoricalCollectionImport,
  extractHistoricalCollectionInstallmentItems,
  validateTemplateScope,
  type HistoricalCollectionBatchResult,
  type HistoricalCollectionInstallmentSource,
  type HistoricalCollectionInstallmentsResponseData,
  type HistoricalCollectionPreview,
} from './historical-collection-contract';
import {
  buildHistoricalCollectionWorkbookBlob,
  createHistoricalCollectionMetadata,
  parseHistoricalCollectionWorkbook,
} from './historical-collection-excel';
import './historical-collection-import.css';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function workbookErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : 'unknown';
  if (code === 'unsupported_file_type') return 'الملف يجب أن يكون بصيغة Excel ‏(.xlsx).';
  if (code === 'unknown_template') return 'هذا الملف ليس قالب التحصيلات الذي ولّده رقيم.';
  if (code === 'unsupported_template_version') return 'نسخة قالب التحصيلات غير مدعومة.';
  if (code === 'missing_data_sheet') return 'ورقة التحصيلات المطلوبة غير موجودة في الملف.';
  if (code.startsWith('missing_required_columns:')) return 'القالب ناقص أو تم تغيير أعمدته الإلزامية.';
  if (code.startsWith('invalid_template_metadata:')) return 'بيانات القالب التقنية غير صالحة.';
  return 'تعذر قراءة الملف. أعد تنزيل قالب جديد من رقيم ثم حاول مرة أخرى.';
}

async function fetchAllInstallments(academicYearId: number): Promise<HistoricalCollectionInstallmentSource[]> {
  const all: HistoricalCollectionInstallmentSource[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get<HistoricalCollectionInstallmentsResponseData>(
      endpoints.admin.financeInstallments,
      { page, page_size: HISTORICAL_COLLECTION_PAGE_SIZE, academic_year_id: academicYearId },
    );
    if (!response.success) throw new Error(response.error.message || response.error.code);
    all.push(...extractHistoricalCollectionInstallmentItems(response.data));
    totalPages = response.meta?.pagination?.total_pages ?? page;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export function HistoricalCollectionImportPanel() {
  const { academicYears, loading: referenceLoading } = useFinanceReferenceData();
  const [academicYearId, setAcademicYearId] = useState<number | ''>('');
  const [downloading, setDownloading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<HistoricalCollectionPreview | null>(null);
  const [result, setResult] = useState<HistoricalCollectionBatchResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'error' | 'info' | 'success'>('info');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (academicYearId || academicYears.length === 0) return;
    const preferred = academicYears.find((year) => year.is_current) ?? academicYears[0];
    if (preferred) setAcademicYearId(preferred.id);
  }, [academicYearId, academicYears]);

  const selectedYear = useMemo(
    () => academicYears.find((year) => year.id === Number(academicYearId)) ?? null,
    [academicYearId, academicYears],
  );

  async function handleDownload() {
    if (!selectedYear || downloading) return;
    setDownloading(true);
    setMessage(null);
    try {
      const installments = await fetchAllInstallments(selectedYear.id);
      const rows = buildHistoricalCollectionTemplateRows(installments, selectedYear.id);
      const scope = validateTemplateScope(rows, selectedYear.id);
      if (!scope.valid) {
        throw new Error(rows.length === 0 ? 'no_rows' : 'invalid_scope');
      }
      const metadata = createHistoricalCollectionMetadata({
        schoolId: scope.schoolId,
        academicYearId: selectedYear.id,
        academicYearName: selectedYear.name,
      });
      const blob = await buildHistoricalCollectionWorkbookBlob(rows, metadata);
      const safeYear = selectedYear.name.replace(/[^\p{L}\p{N}._-]+/gu, '-');
      downloadBlob(blob, `raqeem-historical-collections-${safeYear}.xlsx`);
      setMessageKind('success');
      setMessage(`تم تجهيز القالب من ${rows.length} واجبًا ماليًا. عبّئ عمود «التحصيل التاريخي» فقط.`);
    } catch (error) {
      setMessageKind('error');
      setMessage(
        error instanceof Error && error.message === 'no_rows'
          ? 'لا توجد واجبات مالية قابلة لإدراجها في هذه السنة الدراسية.'
          : 'تعذر إنشاء القالب من البيانات الحالية. لم يتم تسجيل أي تحصيل.',
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setParsing(true);
    setPreview(null);
    setResult(null);
    setMessage(null);
    setFileName(file.name);
    try {
      const parsed = await parseHistoricalCollectionWorkbook(file);
      setPreview(parsed);
      if (academicYearId && parsed.metadata.academicYearId !== Number(academicYearId)) {
        setAcademicYearId(parsed.metadata.academicYearId);
      }
      setMessageKind(parsed.errors.length ? 'error' : 'info');
      setMessage(
        parsed.errors.length
          ? 'يوجد خطأ مانع في الملف. صحح الصفوف المشار إليها قبل الاعتماد.'
          : 'تم تحليل الملف محليًا. راجع الملخص ثم اعتمد التحصيلات صراحة.',
      );
    } catch (error) {
      setMessageKind('error');
      setMessage(workbookErrorMessage(error));
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!preview || !fileName || !canConfirmHistoricalCollectionImport(preview) || confirming) return;
    setConfirming(true);
    setResult(null);
    setMessage(null);
    try {
      const payload = buildHistoricalCollectionBatchPayload(preview, fileName);
      const response = await api.post<HistoricalCollectionBatchResult>(
        endpoints.admin.financeImportCollectionBatches,
        payload,
      );
      if (!response.success) {
        setMessageKind('error');
        setMessage(`${response.error.message || 'رفض Odoo عملية الاستيراد.'} (${response.error.code})`);
        return;
      }
      setResult(response.data);
      setMessageKind('success');
      setMessage(
        response.data?.already_completed
          ? 'هذه الدفعة سبق اعتمادها بنفس المحتوى؛ لم ينشئ Odoo تحصيلات مكررة.'
          : 'اعتمد Odoo التحصيلات التاريخية بنجاح.',
      );
    } finally {
      setConfirming(false);
    }
  }

  const confirmable = canConfirmHistoricalCollectionImport(preview);

  return (
    <div className="historical-collections-import">
      <section className="card historical-collections-import__step" aria-labelledby="historical-template-title">
        <div>
          <span className="historical-collections-import__step-number" aria-hidden>1</span>
          <h2 id="historical-template-title">تنزيل ملف التحصيلات</h2>
          <p className="muted">رقيم يملأ هوية التلميذ والواجب المالي. الإدارة تضيف مبلغ التحصيل التاريخي فقط.</p>
        </div>
        <div className="historical-collections-import__controls">
          <label className="field">
            <span>السنة الدراسية</span>
            <select
              value={academicYearId}
              onChange={(event) => setAcademicYearId(Number(event.target.value) || '')}
              disabled={referenceLoading || downloading}
            >
              <option value="">اختر السنة الدراسية</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selectedYear || downloading || referenceLoading}
            onClick={handleDownload}
          >
            {downloading ? 'جارٍ تجهيز الملف…' : 'تنزيل ملف التحصيلات'}
          </button>
        </div>
      </section>

      <section className="card historical-collections-import__step" aria-labelledby="historical-upload-title">
        <div>
          <span className="historical-collections-import__step-number" aria-hidden>2</span>
          <h2 id="historical-upload-title">استيراد الملف ومعاينته</h2>
          <p className="muted">رفع الملف لا يسجل أي مبلغ. الاعتماد يتم في الخطوة الأخيرة فقط.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.currentTarget.value = '';
            void handleFile(file);
          }}
        />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={parsing}
          onClick={() => inputRef.current?.click()}
        >
          {parsing ? 'جارٍ تحليل الملف…' : 'اختيار ملف Excel'}
        </button>
        {fileName ? <p className="tiny muted" dir="auto">{fileName}</p> : null}
      </section>

      {message ? (
        <div className={`historical-collections-import__message is-${messageKind}`} role={messageKind === 'error' ? 'alert' : 'status'}>
          {message}
        </div>
      ) : null}

      {preview ? (
        <section className="card historical-collections-import__preview" aria-labelledby="historical-preview-title">
          <div className="historical-collections-import__preview-heading">
            <div>
              <span className="historical-collections-import__step-number" aria-hidden>3</span>
              <h2 id="historical-preview-title">معاينة قبل الاعتماد</h2>
              <p className="muted">هذه معاينة للملف. Odoo يعيد التحقق من الهوية والنطاق والواجبات والإدempotency عند الاعتماد.</p>
            </div>
            <span className="tiny muted" dir="ltr">Batch: {preview.metadata.importBatchRef}</span>
          </div>

          <div className="historical-collections-import__metrics">
            <div><strong>{preview.readyRows.length}</strong><span>جاهز للاستيراد</span></div>
            <div><strong>{preview.blankRows.length}</strong><span>بدون مبلغ</span></div>
            <div><strong>{preview.errors.length}</strong><span>خطأ يحتاج تصحيح</span></div>
            <div><strong>{preview.duplicateCount}</strong><span>صف مكرر</span></div>
            <div><strong><FinanceMoney amount={preview.totalAmount} /></strong><span>إجمالي التحصيل</span></div>
          </div>

          {preview.errors.length ? (
            <div className="historical-collections-import__errors">
              <h3>الصفوف التي تحتاج تصحيحًا</h3>
              <div className="historical-collections-import__table-wrap">
                <table>
                  <thead><tr><th>الصف</th><th>السبب</th></tr></thead>
                  <tbody>
                    {preview.errors.slice(0, 100).map((error, index) => (
                      <tr key={`${error.sourceRow}-${error.code}-${index}`}>
                        <td dir="ltr">{error.sourceRow}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="historical-collections-import__confirm">
            <div>
              <strong>لن يتغير أثر الخزينة الحالية من الواجهة.</strong>
              <p className="tiny muted">Odoo هو صاحب القرار النهائي في دلالة التحصيل والتوزيع ومنع التكرار.</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!confirmable || confirming}
              onClick={handleConfirm}
            >
              {confirming ? 'جارٍ الاعتماد…' : 'اعتماد التحصيلات'}
            </button>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="card historical-collections-import__result" aria-labelledby="historical-result-title">
          <h2 id="historical-result-title">نتيجة Odoo</h2>
          <div className="historical-collections-import__metrics">
            <div><strong>{result.source_rows ?? 0}</strong><span>صف معالج</span></div>
            <div><strong>{result.students ?? 0}</strong><span>تلميذ</span></div>
            <div><strong>{result.collections_count ?? 0}</strong><span>تحصيل مسجل</span></div>
            <div><strong>{result.allocations_count ?? 0}</strong><span>توزيع مالي</span></div>
            <div><strong><FinanceMoney amount={result.total_amount ?? 0} /></strong><span>الإجمالي</span></div>
          </div>
          <p className="tiny muted" dir="ltr">Batch: {result.import_batch_ref ?? preview?.metadata.importBatchRef ?? '—'}</p>
        </section>
      ) : null}
    </div>
  );
}
