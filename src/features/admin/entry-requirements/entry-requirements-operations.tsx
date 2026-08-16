'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 * Operational tools use the adopted primitives; authenticated visual QA remains.
 */

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Card, InfoBanner, SectionHead } from '@/components/ui/primitives';
import {
  authenticatedAttachmentDownloadHref,
  downloadEntryRequirementTemplate,
  fileToBase64,
  uploadEntryRequirementAttachments,
} from '@/features/entry-requirements/entry-requirements-browser-io';
import {
  createEntryRequirementImportIdempotencyKey,
  duplicatePreviewRowNumbers,
  type RequirementImportPreviewRow,
} from '@/features/entry-requirements/entry-requirements-import-session';
import {
  requirementItemTypeLabel,
  type RequirementItem,
  type RequirementItemType,
  type RequirementList,
} from '@/features/entry-requirements/entry-requirements-contract';
import {
  aggregateRequirementCovers,
  withRequirementCoverColor,
} from '@/features/entry-requirements/entry-requirements-presentation';
import { api } from '@/lib/api/client';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import styles from './entry-requirements-workspace.module.css';

type PreviewIssue = { code?: string; field?: string; message: string };
type PreviewRow = RequirementImportPreviewRow & {
  proposed_action?: string;
  needs_resolution?: boolean;
  errors?: PreviewIssue[];
  warnings?: PreviewIssue[];
};
type PreviewResult = {
  rows: PreviewRow[];
  summary: { total: number; valid: number; invalid: number; needs_resolution: number };
};
type ApplyResult = {
  summary: { applied: number; blocked: number; total: number; needs_resolution: number };
  list: RequirementList;
};
type AttachmentRow = {
  id: number;
  name: string;
  mimetype?: string | null;
  size?: number | null;
  file_size?: number | null;
};
type AttachmentListResult = {
  list_id: number;
  attachment_count: number;
  attachments: AttachmentRow[];
};
type PublicLink = {
  id: number;
  state: 'active' | 'revoked';
  token_prefix?: string | null;
  token?: string;
  share_url_path?: string;
};
type PublicLinkResult = { list_id: number; link: PublicLink | null };

const PRINT_TYPES: RequirementItemType[] = [
  'textbook',
  'book',
  'notebook',
  'stationery',
  'uniform',
  'material',
  'other',
];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printableCoverColor(color: string): string {
  const normalized = color.trim().toLocaleLowerCase();
  const palette: Array<[string[], string]> = [
    [['أحمر', 'احمر', 'rouge', 'red'], '#dc4c4c'],
    [['أخضر', 'اخضر', 'vert', 'green'], '#3f986c'],
    [['أزرق', 'ازرق', 'bleu', 'blue'], '#4387c5'],
    [['سماوي', 'bleu ciel', 'sky'], '#73b9d6'],
    [['أصفر', 'اصفر', 'jaune', 'yellow'], '#e7b93f'],
    [['وردي', 'rose', 'pink'], '#dc83a7'],
    [['برتقالي', 'orange'], '#df8845'],
    [['بنفسجي', 'violet', 'purple'], '#8668b6'],
    [['رمادي', 'رمادي', 'gris', 'gray', 'grey'], '#89929e'],
    [['أسود', 'اسود', 'noir', 'black'], '#343a40'],
    [['أبيض', 'ابيض', 'blanc', 'white'], '#f8fafc'],
    [['شفاف', 'transparent'], '#e8f0f2'],
  ];
  return palette.find(([names]) => names.some((name) => normalized.includes(name)))?.[1] ?? '#7b8794';
}

function printableListHtml(list: RequirementList, blank: boolean): string {
  const grouped = new Map<RequirementItemType, RequirementItem[]>();
  for (const type of PRINT_TYPES) grouped.set(type, []);
  if (!blank) {
    for (const item of list.items ?? []) grouped.get(item.item_type)?.push(item);
  }

  const sections = PRINT_TYPES.map((type) => {
    const items = grouped.get(type) ?? [];
    if (!blank && items.length === 0) return '';
    const compact = type === 'stationery' || type === 'material';
    const body = blank
      ? '<div class="blank-lines"><span></span><span></span><span></span></div>'
      : `<ul>${items.map((item) => {
        const printableNotes = withRequirementCoverColor(item.notes, null);
        return `<li><div class="item-line"><strong>${escapeHtml(item.name)}</strong>${item.quantity !== 1 ? ` <span class="quantity">× ${escapeHtml(item.quantity)}</span>` : ''}${item.subject ? ` <small>— ${escapeHtml(item.subject)}</small>` : ''}</div>${printableNotes ? `<div class="note">${escapeHtml(printableNotes)}</div>` : ''}</li>`;
      }).join('')}</ul>`;
    return `<section class="${compact ? 'compact' : ''}"><h2><span>${escapeHtml(requirementItemTypeLabel(type))}</span><b>${blank ? '' : escapeHtml(items.length)}</b></h2>${body}</section>`;
  }).join('');

  const covers = blank ? [] : aggregateRequirementCovers(list.items ?? []);
  const coversSection = covers.length
    ? `<section class="covers"><h2><span>الأغلفة</span><b>${escapeHtml(covers.length)}</b></h2><ul>${covers.map((cover) => `<li><i style="--cover-color:${printableCoverColor(cover.color)}"></i><strong>${escapeHtml(cover.color)}</strong><span>× ${escapeHtml(cover.quantity)}</span></li>`).join('')}</ul><div class="covers-total"><span>إجمالي الأغلفة</span><strong>${escapeHtml(covers.reduce((total, cover) => total + cover.quantity, 0))}</strong></div></section>`
    : '';

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(blank ? 'نموذج تجهيزات الدخول المدرسي' : list.name)}</title><style>
    @page{size:A4;margin:8mm 10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{padding:0;margin:0}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#172d32;line-height:1.35;background:#fff}.page{width:190mm;margin:0 auto}header{position:relative;overflow:hidden;border:1px solid #dce8e8;border-radius:12px;padding:13px 16px 11px;margin-bottom:9px;background:linear-gradient(135deg,#f4faf9 0%,#fff 64%)}header:before{content:"";position:absolute;inset:0 0 0 auto;width:5px;background:#168477}.brand{color:#168477;font-size:10px;font-weight:800;letter-spacing:.3px;margin-bottom:2px}h1{font-size:21px;line-height:1.2;margin:0 0 9px;color:#143f45}.meta{display:flex;flex-wrap:wrap;gap:5px;font-size:10.5px;color:#465d61}.meta span{display:inline-flex;gap:3px;border:1px solid #dfe9e9;border-radius:999px;padding:3px 8px;background:#fff}.meta strong{color:#23474d}section{break-inside:auto;margin-top:8px}h2{display:flex;align-items:center;gap:7px;font-size:13px;margin:0 0 5px;color:#174c50}h2:after{content:"";height:1px;background:#dce8e8;flex:1}h2 b{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#e8f4f2;color:#168477;font-size:9.5px}ul{margin:0;padding:0 17px 0 0}li{font-size:11.5px;margin:2.5px 0;break-inside:avoid;padding-right:1px}.item-line{display:inline}.quantity{display:inline-block;border-radius:5px;padding:0 5px;background:#eef5f4;color:#176c65;font-weight:750}small{font-size:10.5px;color:#53686c}.note{font-size:9.5px;color:#6a797c;line-height:1.3;margin-top:1px}.compact ul{columns:2;column-gap:24px;column-rule:1px solid #edf1f1}.compact li{break-inside:avoid-column;margin:2px 0}.covers{break-inside:avoid;border:1px solid #d9e7e6;border-radius:10px;padding:8px 10px;background:#f8fbfb}.covers h2{margin-bottom:7px}.covers ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:0;list-style:none}.covers li{display:flex;align-items:center;gap:6px;margin:0;padding:5px 7px;border:1px solid #e2ebeb;border-radius:7px;background:#fff}.covers li i{width:11px;height:11px;flex:0 0 11px;border-radius:50%;background:var(--cover-color);border:1px solid #0002}.covers li span{margin-right:auto;color:#466064;font-weight:750}.covers-total{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;margin-top:7px;padding-top:6px;border-top:1px solid #dce7e7;color:#496064}.covers-total strong{font-size:13px;color:#174c50}.blank-lines span{display:block;border-bottom:1px dashed #a9b8b9;height:23px}.footer{break-inside:avoid;margin-top:9px;padding-top:5px;border-top:1px solid #dce7e7;font-size:8.5px;color:#7a8b8e;text-align:center}.screen-actions{max-width:210mm;margin:12px auto;padding:0 10mm}.screen-actions button{border:0;border-radius:8px;background:#168477;color:#fff;padding:8px 20px;font:700 13px inherit;cursor:pointer}@media screen{body{background:#eef2f2;padding-bottom:18px}.page{background:#fff;padding:8mm 10mm;box-shadow:0 8px 28px #19383d1f}.screen-actions{display:block}}@media print{body{background:#fff}.page{width:auto;margin:0;box-shadow:none}.screen-actions{display:none}}
  </style></head><body><div class="screen-actions"><button onclick="window.print()">طباعة اللائحة</button></div><main class="page"><header><div class="brand">رقيم المدرسية</div><h1>${escapeHtml(blank ? 'نموذج تجهيزات الدخول المدرسي' : list.name)}</h1><div class="meta"><span><strong>السنة الدراسية</strong> ${escapeHtml(list.academic_year ?? '')}</span><span><strong>المستوى</strong> ${escapeHtml(list.level ?? '')}</span>${list.class_name ? `<span><strong>القسم</strong> ${escapeHtml(list.class_name)}</span>` : ''}${!blank ? `<span><strong>النسخة</strong> ${escapeHtml(list.revision)}</span>` : ''}</div></header>${sections}${coversSection}<div class="footer">تم إعداد هذه اللائحة عبر منصة رقيم المدرسية.</div></main></body></html>`;
}

function openPrint(list: RequirementList, blank: boolean): void {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
  try {
    popup.history.replaceState(null, '', '/admin/entry-requirements?print=1');
  } catch {
    // Printing still works if the browser declines history replacement.
  }
  popup.opener = null;
  popup.document.open();
  popup.document.write(printableListHtml(list, blank));
  popup.document.close();
  popup.focus();
}

function formatBytes(value?: number | null): string {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shareUrlForToken(token: string): string {
  return `${window.location.origin}/entry-requirements/share/${encodeURIComponent(token)}`;
}

export function EntryRequirementsOperations({
  list,
  canManage,
  canPublish,
  onChanged,
}: {
  list: RequirementList;
  canManage: boolean;
  canPublish: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBase64, setImportBase64] = useState('');
  const [importKey, setImportKey] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  const loadOperations = useCallback(async () => {
    const [attachmentResult, linkResult] = await Promise.all([
      api.get<AttachmentListResult>(entryRequirementEndpoints.admin.attachments(list.id)),
      api.get<PublicLinkResult>(entryRequirementEndpoints.admin.publicShareLink(list.id)),
    ]);
    if (attachmentResult.success) setAttachments(attachmentResult.data.attachments ?? []);
    if (linkResult.success) setPublicLink(linkResult.data.link);
  }, [list.id]);

  useEffect(() => {
    setError('');
    setNotice('');
    setImportFile(null);
    setImportBase64('');
    setImportKey('');
    setPreview(null);
    setApplyResult(null);
    setShareUrl('');
    void loadOperations();
  }, [loadOperations]);

  const duplicateRows = useMemo(
    () => duplicatePreviewRowNumbers(preview?.rows ?? []),
    [preview],
  );

  function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError('');
    setNotice('');
    setPreview(null);
    setApplyResult(null);
    setImportBase64('');
    if (file && !file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      setImportFile(null);
      setImportKey('');
      setError('اختر ملف Excel بصيغة .xlsx فقط.');
      event.target.value = '';
      return;
    }
    setImportFile(file);
    setImportKey(file ? createEntryRequirementImportIdempotencyKey() : '');
  }

  async function previewImport() {
    if (!importFile || list.state !== 'draft') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const encoded = importBase64 || await fileToBase64(importFile);
      setImportBase64(encoded);
      const result = await api.post<PreviewResult>(entryRequirementEndpoints.admin.importPreview, {
        list_id: list.id,
        xlsx_base64: encoded,
      });
      if (!result.success) throw new Error(result.error.message);
      setPreview(result.data);
      setApplyResult(null);
      setNotice('تمت معاينة ملف Excel دون تعديل اللائحة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذرت معاينة ملف Excel.');
    } finally {
      setBusy(false);
    }
  }

  async function applyImport() {
    if (!importFile || !preview || !importKey || list.state !== 'draft') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const encoded = importBase64 || await fileToBase64(importFile);
      setImportBase64(encoded);
      const result = await api.post<ApplyResult>(entryRequirementEndpoints.admin.importApply, {
        list_id: list.id,
        xlsx_base64: encoded,
        idempotency_key: importKey,
      });
      if (!result.success) throw new Error(result.error.message);
      setApplyResult(result.data);
      setNotice(`تم تطبيق ${result.data.summary.applied} صفًا على المسودة. لم يتم نشر اللائحة.`);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تطبيق ملف Excel.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await downloadEntryRequirementTemplate(entryRequirementEndpoints.admin.importTemplate);
      setNotice('تم تنزيل نموذج Excel الرسمي.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنزيل نموذج Excel.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length || list.state !== 'draft') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await uploadEntryRequirementAttachments<AttachmentListResult>(
        entryRequirementEndpoints.admin.attachments(list.id),
        files,
      );
      await loadOperations();
      setNotice('تم إرفاق الوثيقة بالمسودة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر رفع المرفق.');
    } finally {
      setBusy(false);
    }
  }

  function printList(blank: boolean) {
    setError('');
    try {
      openPrint(list, blank);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذرت الطباعة.');
    }
  }

  async function issueOrRotateLink(rotate: boolean) {
    if (list.state !== 'published') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = rotate
        ? entryRequirementEndpoints.admin.rotatePublicShareLink(list.id)
        : entryRequirementEndpoints.admin.publicShareLink(list.id);
      const result = await api.post<PublicLinkResult>(path, {});
      if (!result.success) throw new Error(result.error.message);
      const token = result.data.link?.token;
      if (!token) throw new Error('أُنشئ الرابط لكن لم يصل رمز المشاركة القابل للنسخ.');
      setPublicLink(result.data.link);
      setShareUrl(shareUrlForToken(token));
      setNotice(rotate ? 'تم تدوير الرابط. الرابط السابق لم يعد صالحًا.' : 'تم إنشاء رابط القراءة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء رابط المشاركة.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post<{ list_id: number; revoked: PublicLink[] }>(
        entryRequirementEndpoints.admin.revokePublicShareLink(list.id),
        {},
      );
      if (!result.success) throw new Error(result.error.message);
      setPublicLink(null);
      setShareUrl('');
      setNotice('تم إبطال رابط المشاركة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إبطال رابط المشاركة.');
    } finally {
      setBusy(false);
    }
  }

  async function copyOrShare() {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: list.name, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setNotice('تم نسخ رابط اللائحة.');
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError('تعذرت مشاركة الرابط. يمكنك نسخه يدويًا.');
    }
  }

  const rowsNeedingAttention = preview?.rows.filter(
    (row) => !row.valid || row.needs_resolution || (row.warnings?.length ?? 0) > 0,
  ) ?? [];

  return (
    <div className={styles.operationStack}>
      {notice ? <InfoBanner title={notice} tone="green" icon="✓" /> : null}
      {error ? <InfoBanner title={error} tone="amber" icon="!" /> : null}

      {canManage ? (
        <Card className={styles.operationCard}>
          <div className={styles.operationHeader}>
            <div className={styles.operationHeaderText}>
              <span className={styles.operationTitle}>Excel</span>
              <span className={styles.operationDescription}>ابدأ من النموذج الرسمي، عاين الملف ثم طبّقه على المسودة.</span>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void downloadTemplate()}>
              تحميل النموذج
            </button>
          </div>

          {list.state === 'draft' ? (
            <div className={styles.filePicker}>
              <label className="field">
                ملف XLSX
                <input
                  className="input"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={busy}
                  onChange={selectImportFile}
                />
              </label>
              {importFile ? <span className={styles.fileName} dir="auto">{importFile.name}</span> : null}
              <div className={styles.operationActions}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy || !importFile} onClick={() => void previewImport()}>
                  معاينة
                </button>
                {preview ? (
                  <button type="button" className="btn btn--primary btn--sm" disabled={busy || preview.summary.valid === 0} onClick={() => void applyImport()}>
                    تطبيق على المسودة
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <InfoBanner title="الاستيراد متاح على المسودة فقط" description="أنشئ نسخة محدثة قبل استيراد ملف جديد." />
          )}

          {preview ? (
            <div className={styles.panelBody}>
              <div className={styles.previewSummary}>
                <div className={styles.previewMetric}><strong>{preview.summary.total}</strong><span>إجمالي</span></div>
                <div className={styles.previewMetric}><strong>{preview.summary.valid}</strong><span>مقبول</span></div>
                <div className={styles.previewMetric}><strong>{preview.summary.needs_resolution}</strong><span>يحتاج مراجعة</span></div>
                <div className={styles.previewMetric}><strong>{preview.summary.invalid}</strong><span>مرفوض</span></div>
              </div>

              {duplicateRows.length ? (
                <InfoBanner
                  tone="amber"
                  icon="!"
                  title={`${duplicateRows.length} صفوف متكررة محتملة`}
                  description={`راجع الصفوف: ${duplicateRows.join('، ')}. هذا تنبيه واجهة فقط؛ Odoo يبقى صاحب قرار التطبيق.`}
                />
              ) : null}

              {rowsNeedingAttention.length ? (
                <div className={styles.previewIssues}>
                  {rowsNeedingAttention.map((row) => {
                    const tone = !row.valid || (row.errors?.length ?? 0) > 0 ? 'error' : 'warning';
                    return (
                      <div key={row.row_number} className={styles.issueRow} data-tone={tone}>
                        <strong>الصف {row.row_number}: {row.item?.name || 'عنصر'}</strong>
                        {row.needs_resolution ? <Badge tone="amber">يحتاج ربط المقرر</Badge> : null}
                        {row.errors?.map((issue, index) => <span key={`error-${index}`}>{issue.message}</span>)}
                        {row.warnings?.map((issue, index) => <span key={`warning-${index}`}>{issue.message}</span>)}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {applyResult ? (
                <InfoBanner
                  tone="green"
                  icon="✓"
                  title={`طُبق ${applyResult.summary.applied} صفًا`}
                  description={`تعذر تطبيق ${applyResult.summary.blocked}، ويحتاج المراجعة ${applyResult.summary.needs_resolution}. لم يتم نشر اللائحة.`}
                />
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className={styles.operationCard}>
        <div className={styles.operationHeader}>
          <div className={styles.operationHeaderText}>
            <span className={styles.operationTitle}>الوثائق</span>
            <span className={styles.operationDescription}>PDF أو صورة مرجعية للائحة الأصلية، منفصلة عن البيانات المنظمة.</span>
          </div>
          {canManage && list.state === 'draft' ? (
            <label className={`btn btn--ghost btn--sm ${styles.uploadControl}`}>
              إرفاق ملف
              <input type="file" hidden multiple accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={uploadAttachments} />
            </label>
          ) : null}
        </div>

        {attachments.length ? (
          <div className={styles.attachmentList}>
            {attachments.map((attachment) => (
              <div key={attachment.id} className={styles.attachmentRow}>
                <div className={styles.attachmentIdentity}>
                  <span className={styles.attachmentName} dir="auto">{attachment.name}</span>
                  <span className={styles.muted}>
                    {attachment.mimetype || 'ملف'}
                    {formatBytes(attachment.size ?? attachment.file_size) ? ` · ${formatBytes(attachment.size ?? attachment.file_size)}` : ''}
                  </span>
                </div>
                <a className="btn btn--ghost btn--sm" href={authenticatedAttachmentDownloadHref(attachment.id)}>تنزيل</a>
              </div>
            ))}
          </div>
        ) : (
          <span className={styles.emptyInline}>لا توجد وثائق مرفقة.</span>
        )}

        {list.state !== 'draft' ? <span className={styles.muted}>المرفقات مقفلة بعد خروج اللائحة من المسودة.</span> : null}
      </Card>

      <Card className={styles.operationCard}>
        <SectionHead title="الطباعة" />
        <span className={styles.operationDescription}>نسخة A4 جاهزة للطباعة أو للحفظ كـPDF، مع نموذج فارغ عند الحاجة.</span>
        <div className={styles.operationActions}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => printList(false)}>طباعة اللائحة</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => printList(true)}>نموذج فارغ</button>
        </div>
        <span className={styles.printHint}>
          إذا أضاف Chrome أو Edge التاريخ أو عنوان الصفحة إلى PDF، عطّل خيار «Headers and footers / En-têtes et pieds de page» من نافذة الطباعة.
        </span>
      </Card>

      {canPublish ? (
        <Card className={styles.operationCard}>
          <SectionHead title="مشاركة اللائحة" />
          <span className={styles.operationDescription}>رابط قراءة مرمّز للنسخة المنشورة فقط، غير مخصص للبحث أو الاكتشاف العام.</span>

          {list.state !== 'published' ? (
            <InfoBanner title="المشاركة متاحة بعد النشر" description="لا يمكن إنشاء رابط عام لمسودة أو نسخة قيد المراجعة." />
          ) : (
            <>
              {publicLink ? (
                <div className={styles.contextBadges}>
                  <Badge tone="green">رابط نشط</Badge>
                  {publicLink.token_prefix ? <Badge tone="slate">{publicLink.token_prefix}…</Badge> : null}
                </div>
              ) : null}

              {shareUrl ? (
                <label className={styles.shareField}>
                  الرابط
                  <input className="input" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
                </label>
              ) : null}

              {publicLink && !shareUrl ? (
                <span className={styles.muted}>الرمز الخام لا يُخزن. دوّر الرابط للحصول على رابط جديد قابل للنسخ.</span>
              ) : null}

              <div className={styles.operationActions}>
                {!publicLink ? (
                  <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void issueOrRotateLink(false)}>
                    إنشاء رابط
                  </button>
                ) : null}
                {publicLink ? (
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void issueOrRotateLink(true)}>
                    تدوير الرابط
                  </button>
                ) : null}
                {shareUrl ? (
                  <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void copyOrShare()}>
                    نسخ / مشاركة
                  </button>
                ) : null}
                {publicLink ? (
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void revokeLink()}>
                    إبطال الرابط
                  </button>
                ) : null}
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
