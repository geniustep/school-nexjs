'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api/client';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
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
import styles from '@/features/library/product-workspaces.module.css';

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

function printableListHtml(list: RequirementList, blank: boolean): string {
  const grouped = new Map<RequirementItemType, RequirementItem[]>();
  for (const type of PRINT_TYPES) grouped.set(type, []);
  if (!blank) {
    for (const item of list.items ?? []) {
      grouped.get(item.item_type)?.push(item);
    }
  }
  const sections = PRINT_TYPES.map((type) => {
    const items = grouped.get(type) ?? [];
    if (!blank && items.length === 0) return '';
    const compact = type === 'stationery' || type === 'material';
    const body = blank
      ? '<div class="blank-lines"><span></span><span></span><span></span></div>'
      : `<ul>${items.map((item) => `<li><strong>${escapeHtml(item.name)}</strong>${item.quantity !== 1 ? ` <span>× ${escapeHtml(item.quantity)}</span>` : ''}${item.subject ? ` <small>— ${escapeHtml(item.subject)}</small>` : ''}${item.notes ? `<div class="note">${escapeHtml(item.notes)}</div>` : ''}</li>`).join('')}</ul>`;
    return `<section class="${compact ? 'compact' : ''}"><h2>${escapeHtml(requirementItemTypeLabel(type))}</h2>${body}</section>`;
  }).join('');

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(blank ? 'نموذج تجهيزات الدخول المدرسي' : list.name)}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}html,body{padding:0;margin:0}body{font-family:Arial,Tahoma,sans-serif;color:#111;line-height:1.4;background:#fff}.page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm 11mm 9mm}header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:10px 0 5px;border-bottom:1px solid #bbb;padding-bottom:3px}.meta{font-size:11.5px;color:#444}.meta span{margin-left:12px}section{break-inside:auto}ul{margin:0;padding:0 18px}li{font-size:12.5px;margin:3px 0;break-inside:avoid}.note{font-size:10.5px;color:#555;line-height:1.3}.compact ul{columns:2;column-gap:22px}.compact li{break-inside:avoid-column;margin:2px 0}.blank-lines span{display:block;border-bottom:1px dotted #777;height:24px}.footer{margin-top:14px;padding-top:5px;border-top:1px solid #ddd;font-size:9.5px;color:#666}.screen-actions{max-width:210mm;margin:12px auto 0;padding:0 11mm}.screen-actions button{padding:7px 18px;font:inherit;cursor:pointer}@media screen{body{background:#f3f4f6}.page{background:#fff;box-shadow:0 1px 10px #0002}.screen-actions{display:block}}@media print{body{background:#fff}.page{margin:0;box-shadow:none}.screen-actions{display:none}}
  </style></head><body><div class="screen-actions"><button onclick="window.print()">طباعة</button></div><main class="page"><header><h1>${escapeHtml(blank ? 'نموذج تجهيزات الدخول المدرسي' : list.name)}</h1><div class="meta"><span>السنة الدراسية: ${escapeHtml(list.academic_year ?? '')}</span><span>المستوى: ${escapeHtml(list.level ?? '')}</span>${list.class_name ? `<span>القسم: ${escapeHtml(list.class_name)}</span>` : ''}${!blank ? `<span>النسخة: ${escapeHtml(list.revision)}</span>` : ''}</div></header>${sections}<div class="footer">تم إعداد هذا المستند من واجهة رقيم المدرسية.</div></main></body></html>`;
}

function openPrint(list: RequirementList, blank: boolean): void {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
  try {
    popup.history.replaceState(null, '', '/admin/entry-requirements?print=1');
  } catch {
    // The printable document still works if the browser declines history replacement.
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
    setBusy(true); setError(''); setNotice('');
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
    setBusy(true); setError(''); setNotice('');
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
    setBusy(true); setError(''); setNotice('');
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
    setBusy(true); setError(''); setNotice('');
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
    setBusy(true); setError(''); setNotice('');
    try {
      const path = rotate
        ? entryRequirementEndpoints.admin.rotatePublicShareLink(list.id)
        : entryRequirementEndpoints.admin.publicShareLink(list.id);
      const result = await api.post<PublicLinkResult>(path, {});
      if (!result.success) throw new Error(result.error.message);
      const token = result.data.link?.token;
      if (!token) throw new Error('أُنشئ الرابط لكن لم يصل رمز المشاركة القابل للنسخ.');
      setPublicLink(result.data.link);
      const url = shareUrlForToken(token);
      setShareUrl(url);
      setNotice(rotate ? 'تم تدوير الرابط. الرابط السابق لم يعد صالحًا.' : 'تم إنشاء رابط القراءة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء رابط المشاركة.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink() {
    setBusy(true); setError(''); setNotice('');
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

  return <div className={styles.list}>
    {notice ? <div className={`${styles.notice} ${styles.success}`}>{notice}</div> : null}
    {error ? <div className={`${styles.notice} ${styles.error}`}>{error}</div> : null}

    {canManage ? <section className={styles.card}>
      <div className={styles.cardHeader}><div><h3 className={styles.sectionTitle}>استيراد Excel</h3><span className={styles.muted}>استيراد إلى المسودة فقط، مع معاينة قبل التطبيق.</span></div><button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>void downloadTemplate()}>تحميل نموذج Excel</button></div>
      {list.state === 'draft' ? <>
        <label className={styles.field}>ملف XLSX<input className="input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={selectImportFile}/></label>
        <div className={styles.actions}><button type="button" className="btn btn--ghost" disabled={busy || !importFile} onClick={()=>void previewImport()}>معاينة الاستيراد</button>{preview ? <button type="button" className="btn btn--primary" disabled={busy || preview.summary.valid === 0} onClick={()=>void applyImport()}>تطبيق على المسودة</button> : null}</div>
        {preview ? <div className={styles.card}>
          <div className={styles.summary}><div className={styles.summaryItem}><strong>{preview.summary.total}</strong>إجمالي</div><div className={styles.summaryItem}><strong>{preview.summary.valid}</strong>مقبول</div><div className={styles.summaryItem}><strong>{preview.summary.needs_resolution}</strong>يحتاج مراجعة</div><div className={styles.summaryItem}><strong>{preview.summary.invalid}</strong>مرفوض</div><div className={styles.summaryItem}><strong>{duplicateRows.length}</strong>صف متكرر محتمل</div></div>
          {duplicateRows.length ? <div className={styles.notice}>راجع الصفوف المتكررة المحتملة: {duplicateRows.join('، ')}. هذا تنبيه واجهة فقط؛ Odoo يبقى صاحب قرار التطبيق.</div> : null}
          {preview.rows.filter(row=>!row.valid || row.needs_resolution || (row.warnings?.length ?? 0)>0).map(row=><div key={row.row_number} className={styles.row}><div className={styles.rowMain}><strong>الصف {row.row_number}: {row.item?.name || 'عنصر'}</strong>{row.needs_resolution?<span className={styles.badge}>يحتاج مراجعة المقرر</span>:null}{row.errors?.map((issue,index)=><span key={`e-${index}`} className={styles.tiny}>{issue.message}</span>)}{row.warnings?.map((issue,index)=><span key={`w-${index}`} className={styles.tiny}>{issue.message}</span>)}</div></div>)}
          {applyResult ? <div className={`${styles.notice} ${styles.success}`}>طُبق {applyResult.summary.applied}، وتعذر تطبيق {applyResult.summary.blocked}، ويحتاج المراجعة {applyResult.summary.needs_resolution}.</div> : null}
        </div> : null}
      </> : <div className={styles.notice}>الاستيراد متاح على المسودة فقط. أنشئ نسخة محدثة إذا كانت اللائحة منشورة.</div>}
    </section> : null}

    <section className={styles.card}>
      <div className={styles.cardHeader}><div><h3 className={styles.sectionTitle}>الوثائق المرفقة</h3><span className={styles.muted}>PDF أو صورة مرجعية للائحة الأصلية؛ لا يتم استخراج محتواها آليًا.</span></div>{canManage && list.state === 'draft' ? <label className="btn btn--ghost btn--sm" style={{cursor:'pointer'}}>إرفاق ملف<input type="file" hidden multiple accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={uploadAttachments}/></label> : null}</div>
      {attachments.length ? <div className={styles.list}>{attachments.map(attachment=><div key={attachment.id} className={styles.row}><div className={styles.rowMain}><strong>{attachment.name}</strong><span className={styles.tiny}>{attachment.mimetype || 'ملف'}{formatBytes(attachment.size ?? attachment.file_size) ? ` · ${formatBytes(attachment.size ?? attachment.file_size)}` : ''}</span></div><a className="btn btn--ghost btn--sm" href={authenticatedAttachmentDownloadHref(attachment.id)}>تنزيل</a></div>)}</div> : <div className={styles.empty}>لا توجد وثائق مرفقة.</div>}
      {list.state !== 'draft' ? <span className={styles.muted}>المرفقات مقفلة مع اللائحة بعد خروجها من المسودة.</span> : null}
    </section>

    <section className={styles.card}>
      <div className={styles.cardHeader}><div><h3 className={styles.sectionTitle}>الطباعة</h3><span className={styles.muted}>طباعة A4 مباشرة من المتصفح أو الحفظ كـPDF.</span></div></div>
      <div className={styles.actions}><button type="button" className="btn btn--ghost" onClick={()=>printList(false)}>طباعة اللائحة</button><button type="button" className="btn btn--ghost" onClick={()=>printList(true)}>طباعة نموذج فارغ</button></div>
    </section>

    {canPublish ? <section className={styles.card}>
      <div className={styles.cardHeader}><div><h3 className={styles.sectionTitle}>مشاركة اللائحة</h3><span className={styles.muted}>رابط قراءة مرمّز للنسخة المنشورة فقط، غير مخصص للبحث أو الاكتشاف العام.</span></div></div>
      {list.state !== 'published' ? <div className={styles.notice}>يصبح رابط المشاركة متاحًا بعد نشر اللائحة.</div> : <>
        {publicLink ? <div className={styles.notice}>يوجد رابط نشط{publicLink.token_prefix ? ` (${publicLink.token_prefix}…)` : ''}. لا يخزن النظام الرمز الخام؛ إذا لم يكن الرابط ظاهرًا أدناه فدوّره للحصول على رابط جديد قابل للنسخ.</div> : null}
        {shareUrl ? <label className={styles.field}>الرابط<input className="input" readOnly value={shareUrl} onFocus={event=>event.currentTarget.select()}/></label> : null}
        <div className={styles.actions}>
          {!publicLink ? <button type="button" className="btn btn--primary" disabled={busy} onClick={()=>void issueOrRotateLink(false)}>إنشاء رابط قراءة</button> : null}
          {publicLink ? <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>void issueOrRotateLink(true)}>تدوير الرابط</button> : null}
          {shareUrl ? <button type="button" className="btn btn--primary" disabled={busy} onClick={()=>void copyOrShare()}>نسخ / مشاركة</button> : null}
          {publicLink ? <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>void revokeLink()}>إبطال الرابط</button> : null}
        </div>
      </>}
    </section> : null}
  </div>;
}
