'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 * Full workspace adoption is implemented; authenticated visual QA remains before marking adopted.
 */

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { EntryRequirementAdoptDialog } from '@/features/admin/entry-requirements/entry-requirement-adopt-dialog';
import { EntryRequirementCatalog } from '@/features/admin/entry-requirements/entry-requirement-catalog';
import { EntryRequirementsOperations } from '@/features/admin/entry-requirements/entry-requirements-operations';
import {
  isTextbookEffectivelyLinked,
  shouldShowAdoptTextbookAction,
} from '@/features/entry-requirements/entry-requirements-adopt-link';
import {
  requirementItemTypeLabel,
  requirementStateLabel,
  type RequirementItem,
  type RequirementItemType,
  type RequirementList,
  type TeachingOfferingChoice,
} from '@/features/entry-requirements/entry-requirements-contract';
import { textbookReferenceTitle } from '@/features/entry-requirements/entry-requirements-display';
import {
  approvedTeachingOfferings,
  enabledLevelSubjects,
  teachingOfferingsForSubject,
  type LevelSubjectOptionRow,
  type TeachingOfferingSubjectOption,
} from '@/features/entry-requirements/entry-requirements-offering-options';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import styles from './entry-requirements-workspace.module.css';

type RefRow = {
  id: number;
  name?: string;
  full_name?: string;
  code?: string;
  level_id?: number;
};

type SubjectOptionsPayload = {
  reference_subjects?: LevelSubjectOptionRow[];
};

type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'slate';

const ITEM_TYPES: RequirementItemType[] = [
  'textbook',
  'book',
  'notebook',
  'stationery',
  'uniform',
  'material',
  'other',
];

function stateTone(state: RequirementList['state']): BadgeTone {
  if (state === 'published') return 'green';
  if (state === 'under_review') return 'blue';
  if (state === 'archived') return 'slate';
  return 'slate';
}

function itemTypeTone(type: RequirementItemType): BadgeTone {
  if (type === 'textbook') return 'blue';
  if (type === 'notebook') return 'slate';
  if (type === 'uniform') return 'amber';
  return 'slate';
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function AdminEntryRequirementsWorkspace() {
  const user = useSession();
  const { activeAcademicYearId, academicYears, academicYearLoading } = useAdminSession();
  const canManage = hasPermission(user, 'entry_requirements.manage');
  const canPublish = hasPermission(user, 'entry_requirements.publish');

  const [lists, setLists] = useState<RequirementList[]>([]);
  const [selected, setSelected] = useState<RequirementList | null>(null);
  const [levels, setLevels] = useState<RefRow[]>([]);
  const [classes, setClasses] = useState<RefRow[]>([]);
  const [contextOfferings, setContextOfferings] = useState<TeachingOfferingChoice[]>([]);
  const [levelSubjects, setLevelSubjects] = useState<TeachingOfferingSubjectOption[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('تجهيزات الدخول المدرسي');
  const [newLevel, setNewLevel] = useState('');
  const [newClass, setNewClass] = useState('');

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemType, setItemType] = useState<RequirementItemType>('textbook');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemSubject, setItemSubject] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [itemImportance, setItemImportance] = useState<'required' | 'optional'>('required');
  const [itemProvision, setItemProvision] = useState<'family' | 'school'>('family');
  const [itemReusable, setItemReusable] = useState<'yes' | 'no' | ''>('');

  const [resolutionItemId, setResolutionItemId] = useState<number | null>(null);
  const [resolutionSubject, setResolutionSubject] = useState('');
  const [resolutionOfferingId, setResolutionOfferingId] = useState('');
  const [resolutionSaving, setResolutionSaving] = useState(false);
  const [adoptItemId, setAdoptItemId] = useState<number | null>(null);

  const loadLists = useCallback(async () => {
    if (!activeAcademicYearId) return;
    setLoading(true);
    const result = await api.get<RequirementList[]>(entryRequirementEndpoints.admin.lists, {
      academic_year_id: activeAcademicYearId,
      page: 1,
      page_size: 100,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setLists(result.data);
  }, [activeAcademicYearId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    void Promise.all([
      api.get<RefRow[]>(endpoints.admin.levels, { page: 1, page_size: 200, active: 1 }),
      api.get<RefRow[]>(endpoints.admin.classes, {
        page: 1,
        page_size: 300,
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    ]).then(([levelResult, classResult]) => {
      if (levelResult.success) setLevels(levelResult.data);
      if (classResult.success) setClasses(classResult.data);
    });
  }, [activeAcademicYearId]);

  useEffect(() => {
    if (!selected) {
      setContextOfferings([]);
      setLevelSubjects([]);
      setOfferingsLoading(false);
      setSubjectsLoading(false);
      return;
    }

    let cancelled = false;
    setOfferingsLoading(true);
    setSubjectsLoading(true);
    void Promise.all([
      api.get<TeachingOfferingChoice[]>(entryRequirementEndpoints.admin.teachingOfferings, {
        academic_year_id: selected.academic_year_id,
        level_id: selected.level_id,
        track_id: selected.track_id ?? undefined,
        page: 1,
        page_size: 80,
      }),
      api.get<SubjectOptionsPayload>(endpoints.admin.subjectsOptions, {
        level_id: selected.level_id,
        track_id: selected.track_id ?? undefined,
        include_enabled: 1,
      }),
    ]).then(([offeringResult, subjectResult]) => {
      if (cancelled) return;
      setOfferingsLoading(false);
      setSubjectsLoading(false);

      if (offeringResult.success) {
        setContextOfferings(approvedTeachingOfferings(offeringResult.data));
      } else {
        setContextOfferings([]);
        setError(offeringResult.error.message);
      }

      if (subjectResult.success) {
        setLevelSubjects(enabledLevelSubjects(subjectResult.data.reference_subjects ?? []));
      } else {
        setLevelSubjects([]);
        setError(subjectResult.error.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selected?.academic_year_id, selected?.level_id, selected?.track_id]);

  useEffect(() => {
    setAddItemOpen(false);
    setItemSubject('');
    setOfferingId('');
    setResolutionItemId(null);
    setResolutionSubject('');
    setResolutionOfferingId('');
    setAdoptItemId(null);
  }, [selected?.id]);

  async function openList(id: number) {
    setError('');
    setNotice('');
    const result = await api.get<RequirementList>(entryRequirementEndpoints.admin.list(id));
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSelected(result.data);
  }

  async function mutate(path: string, body: unknown = {}) {
    setError('');
    setNotice('');
    const result = await api.post<RequirementList | Record<string, unknown>>(path, body);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    setNotice('تم حفظ العملية بنجاح.');
    await loadLists();
    if (selected) await openList(selected.id);
    return true;
  }

  async function createList(event: FormEvent) {
    event.preventDefault();
    if (!activeAcademicYearId || !newLevel) return;

    setError('');
    const result = await api.post<RequirementList>(entryRequirementEndpoints.admin.lists, {
      academic_year_id: activeAcademicYearId,
      level_id: Number(newLevel),
      class_id: newClass ? Number(newClass) : undefined,
      name: newName,
    });
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setNewOpen(false);
    setNotice('تم إنشاء المسودة.');
    await loadLists();
    await openList(result.data.id);
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;

    const body: Record<string, unknown> = {
      item_type: itemType,
      quantity: Number(itemQty) || 1,
      importance: itemImportance,
      provision_source: itemProvision,
      reusable_allowed: itemReusable || undefined,
    };

    if (itemType === 'textbook') {
      if (!offeringId) {
        setError('اختر المقرر المعتمد أولًا.');
        return;
      }
      const offering = teachingOfferingsForSubject(contextOfferings, itemSubject)
        .find((row) => String(row.id) === offeringId);
      body.teaching_offering_id = Number(offeringId);
      body.name = offering?.reference.title || 'كتاب مقرر';
    } else {
      if (!itemName.trim()) {
        setError('أدخل اسم العنصر.');
        return;
      }
      body.name = itemName.trim();
    }

    setError('');
    const result = await api.post<RequirementItem>(
      entryRequirementEndpoints.admin.items(selected.id),
      body,
    );
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setItemName('');
    setItemSubject('');
    setOfferingId('');
    setAddItemOpen(false);
    setNotice('تمت إضافة العنصر.');
    await openList(selected.id);
  }

  function startResolution(item: RequirementItem) {
    setError('');
    setNotice('');
    setResolutionItemId(item.id);
    setResolutionSubject(
      item.subject_id && levelSubjects.some((row) => row.id === item.subject_id)
        ? String(item.subject_id)
        : '',
    );
    setResolutionOfferingId('');
  }

  async function resolveTextbook() {
    if (!selected || !resolutionItemId || !resolutionOfferingId) return;

    setResolutionSaving(true);
    setError('');
    setNotice('');
    const result = await api.patch<RequirementItem>(
      entryRequirementEndpoints.admin.item(selected.id, resolutionItemId),
      { teaching_offering_id: Number(resolutionOfferingId) },
    );
    setResolutionSaving(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setNotice('تم ربط الكتاب بالمقرر المعتمد.');
    setResolutionItemId(null);
    setResolutionSubject('');
    setResolutionOfferingId('');
    await openList(selected.id);
  }

  async function deleteItem(item: RequirementItem) {
    if (!selected) return;
    const confirmed = window.confirm(`حذف «${item.name}» من هذه المسودة؟`);
    if (!confirmed) return;

    setError('');
    const result = await api.delete<{ deleted: boolean }>(
      entryRequirementEndpoints.admin.item(selected.id, item.id),
    );
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setNotice('تم حذف العنصر من المسودة.');
    await openList(selected.id);
  }

  async function updateItemQuantity(item: RequirementItem, quantity: number) {
    if (!selected || !Number.isFinite(quantity) || quantity <= 0) return false;

    setError('');
    setNotice('');
    const result = await api.patch<RequirementItem>(
      entryRequirementEndpoints.admin.item(selected.id, item.id),
      { quantity },
    );
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    setNotice('تم تحديث الكمية.');
    await openList(selected.id);
    return true;
  }

  async function publish() {
    if (!selected) return;
    setError('');
    const result = await api.post<{
      warnings: Array<{ message: string }>;
      published_revision: RequirementList;
    }>(entryRequirementEndpoints.admin.publish(selected.id), {});

    if (!result.success) {
      const details = result.error.details as {
        blockers?: Array<{ message: string }>;
        warnings?: Array<{ message: string }>;
      } | undefined;
      const blockers = details?.blockers?.map((row) => row.message).join(' · ');
      setError(blockers || result.error.message);
      return;
    }

    setNotice(
      result.data.warnings?.length
        ? `تم النشر مع ${result.data.warnings.length} تنبيه.`
        : 'تم نشر اللائحة.',
    );
    await loadLists();
    await openList(selected.id);
  }

  const editable = selected?.state === 'draft';
  const currentYear = academicYears.find((year) => year.id === activeAcademicYearId);
  const classesForLevel = useMemo(
    () => classes.filter((row) => !newLevel || !row.level_id || String(row.level_id) === newLevel),
    [classes, newLevel],
  );
  const itemOfferings = useMemo(
    () => teachingOfferingsForSubject(contextOfferings, itemSubject),
    [contextOfferings, itemSubject],
  );
  const resolutionOfferings = useMemo(
    () => teachingOfferingsForSubject(contextOfferings, resolutionSubject),
    [contextOfferings, resolutionSubject],
  );
  const resolvingItem = selected?.items?.find((item) => item.id === resolutionItemId) ?? null;
  const adoptItem = selected?.items?.find((item) => item.id === adoptItemId) ?? null;
  const unresolvedCount = selected?.items?.filter(shouldShowAdoptTextbookAction).length ?? 0;
  const textbookCount = selected?.items?.filter((item) => item.item_type === 'textbook').length ?? 0;
  const notebookCount = selected?.items?.filter((item) => item.item_type === 'notebook').length ?? 0;

  const listColumns: Column<RequirementList>[] = useMemo(() => [
    {
      key: 'name',
      header: 'اللائحة',
      render: (row) => (
        <div className={styles.listIdentity}>
          <span className={styles.listName} dir="auto">{row.name}</span>
          <span className={styles.listScope}>
            {row.level || 'مستوى غير محدد'}
            {row.class_name ? ` · ${row.class_name}` : ' · كل أقسام المستوى'}
            {row.track ? ` · ${row.track}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'state',
      header: 'الحالة',
      render: (row) => (
        <div className={styles.listStatus}>
          <Badge tone={stateTone(row.state)}>{requirementStateLabel(row.state)}</Badge>
          {row.state === 'published' && row.is_current ? <Badge tone="green">الحالية</Badge> : null}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'العناصر',
      width: '110px',
      render: (row) => <bdi className="numeric-text" dir="ltr">{row.item_count}</bdi>,
    },
    {
      key: 'revision',
      header: 'النسخة',
      width: '100px',
      render: (row) => <bdi className="numeric-text" dir="ltr">{row.revision}</bdi>,
    },
  ], []);

  const itemColumns: Column<RequirementItem>[] = useMemo(() => [
    {
      key: 'item',
      header: 'العنصر',
      render: (item) => (
        <div className={styles.itemIdentity}>
          <span className={styles.itemName} dir="auto">{item.name}</span>
          {item.notes ? <span className={styles.itemDescription} dir="auto">{item.notes}</span> : null}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      width: '125px',
      render: (item) => <Badge tone={itemTypeTone(item.item_type)}>{requirementItemTypeLabel(item.item_type)}</Badge>,
    },
    {
      key: 'academic',
      header: 'المادة / المرجع',
      render: (item) => {
        const referenceTitle = textbookReferenceTitle(item);
        return (
          <div className={styles.itemBookMeta}>
            <span>{item.subject || '—'}</span>
            {referenceTitle ? <span dir="auto">{referenceTitle}</span> : null}
            {item.item_type === 'textbook' && item.teaching_offering_id ? (
              <span>
                {[item.publisher, item.edition].filter(Boolean).join(' · ') || 'مقرر مرتبط'}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'الكمية',
      width: '90px',
      render: (item) => <bdi className="numeric-text" dir="ltr">{formatQuantity(item.quantity)}</bdi>,
    },
    {
      key: 'provision',
      header: 'التوفير',
      width: '125px',
      render: (item) => (
        <div className={styles.itemMeta}>
          <span>{item.provision_source === 'school' ? 'المدرسة' : 'الأسرة'}</span>
          {item.reusable ? <span>قابل لإعادة الاستعمال</span> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الحالة والإجراء',
      render: (item) => {
        const unresolved = shouldShowAdoptTextbookAction(item);
        const linked = isTextbookEffectivelyLinked(item);
        const manualLinkAvailable = unresolved && !item.teaching_offering_id;
        return (
          <div className={styles.itemActions}>
            {unresolved ? <Badge tone="amber">يحتاج إلى ربط</Badge> : null}
            {linked ? <Badge tone="green">مرتبط بالمقرر</Badge> : null}
            {unresolved && canManage && editable ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setError('');
                  setNotice('');
                  setAdoptItemId(item.id);
                }}
              >
                ربط
              </button>
            ) : null}
            {manualLinkAvailable && canManage && editable ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => startResolution(item)}>
                اختيار مقرر موجود
              </button>
            ) : null}
            {canManage && editable ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void deleteItem(item)}>
                حذف
              </button>
            ) : null}
          </div>
        );
      },
    },
  ], [canManage, editable, levelSubjects]);

  const pageSubtitle = currentYear?.name
    ? `السنة الدراسية: ${currentYear.name}`
    : 'الكتب والدفاتر والأدوات واللوازم التي تنشرها المدرسة للأسر.';

  return (
    <div className={`admin-workspace ${styles.page}`}>
      <PageHeader
        title="تجهيزات الدخول المدرسي"
        subtitle={pageSubtitle}
        actions={
          <div className={styles.headerActions}>
            {selected ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>
                العودة إلى اللوائح
              </button>
            ) : null}
            {!selected && canManage ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setNewOpen((open) => !open)}>
                + إنشاء لائحة
              </button>
            ) : null}
          </div>
        }
      />

      <div className={styles.feedbackStack}>
        {academicYearLoading ? <InfoBanner title="جارٍ حسم السنة الدراسية…" /> : null}
        {notice ? <InfoBanner title={notice} tone="green" icon="✓" /> : null}
        {error ? <InfoBanner title={error} tone="amber" icon="!" /> : null}
      </div>

      {!selected ? (
        <>
          {newOpen ? (
            <Card className={styles.createCard}>
              <SectionHead title="لائحة جديدة" />
              <form onSubmit={createList}>
                <div className={styles.formGrid}>
                  <label className="field">
                    اسم اللائحة
                    <input className="input" value={newName} onChange={(event) => setNewName(event.target.value)} />
                  </label>
                  <label className="field">
                    المستوى
                    <select
                      className="select"
                      required
                      value={newLevel}
                      onChange={(event) => {
                        setNewLevel(event.target.value);
                        setNewClass('');
                      }}
                    >
                      <option value="">اختر المستوى</option>
                      {levels.map((row) => (
                        <option key={row.id} value={row.id}>{row.name ?? `#${row.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    القسم — اختياري
                    <select className="select" value={newClass} onChange={(event) => setNewClass(event.target.value)}>
                      <option value="">كل أقسام المستوى</option>
                      {classesForLevel.map((row) => (
                        <option key={row.id} value={row.id}>{row.name ?? `#${row.id}`}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={styles.createActions}>
                  <button className="btn btn--primary" type="submit">حفظ المسودة</button>
                  <button type="button" className="btn btn--ghost" onClick={() => setNewOpen(false)}>إلغاء</button>
                </div>
              </form>
            </Card>
          ) : null}

          <section className={styles.listSection}>
            <SectionHead title="لوائح السنة الدراسية" />
            {loading ? (
              <LoadingState label="جارٍ تحميل اللوائح…" />
            ) : lists.length === 0 ? (
              <EmptyState
                icon="📋"
                title="لا توجد لائحة لهذه السنة بعد"
                description="أنشئ لائحة للمستوى ثم أضف العناصر يدويًا أو استوردها من Excel."
                action={canManage ? (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setNewOpen(true)}>
                    إنشاء أول لائحة
                  </button>
                ) : undefined}
              />
            ) : (
              <DataTable
                columns={listColumns}
                rows={lists}
                rowKey={(row) => row.id}
                onRowClick={(row) => void openList(row.id)}
              />
            )}
          </section>
        </>
      ) : (
        <>
          <Card className={styles.detailContext}>
            <div className={styles.contextTop}>
              <div className={styles.contextIdentity}>
                <h2 dir="auto">{selected.name}</h2>
                <div className={styles.contextBadges}>
                  <Badge tone={stateTone(selected.state)}>{requirementStateLabel(selected.state)}</Badge>
                  {selected.state === 'published' && selected.is_current ? <Badge tone="green">النسخة الحالية</Badge> : null}
                  {unresolvedCount > 0 ? <Badge tone="amber">{unresolvedCount} تحتاج إلى ربط</Badge> : null}
                </div>
              </div>
            </div>

            <div className={styles.contextGrid}>
              <div className={styles.contextMetric}>
                <span className={styles.contextLabel}>المستوى</span>
                <span className={styles.contextValue} dir="auto">{selected.level || '—'}</span>
              </div>
              <div className={styles.contextMetric}>
                <span className={styles.contextLabel}>النطاق</span>
                <span className={styles.contextValue} dir="auto">{selected.class_name || 'كل أقسام المستوى'}</span>
              </div>
              <div className={styles.contextMetric}>
                <span className={styles.contextLabel}>النسخة</span>
                <bdi className={`${styles.contextValue} numeric-text`} dir="ltr">{selected.revision}</bdi>
              </div>
              <div className={styles.contextMetric}>
                <span className={styles.contextLabel}>العناصر</span>
                <bdi className={`${styles.contextValue} numeric-text`} dir="ltr">{selected.item_count}</bdi>
              </div>
            </div>

            <div className={styles.workflowActions}>
              {canManage && selected.state === 'draft' ? (
                <button className="btn btn--ghost btn--sm" onClick={() => void mutate(entryRequirementEndpoints.admin.submitForReview(selected.id))}>
                  إرسال للمراجعة
                </button>
              ) : null}
              {canPublish && (selected.state === 'draft' || selected.state === 'under_review') ? (
                <button className="btn btn--primary btn--sm" onClick={() => void publish()}>
                  نشر اللائحة
                </button>
              ) : null}
              {canManage && selected.state === 'published' ? (
                <button className="btn btn--primary btn--sm" onClick={() => void mutate(entryRequirementEndpoints.admin.createRevision(selected.id))}>
                  إنشاء نسخة محدثة
                </button>
              ) : null}
              {canPublish && selected.state === 'published' ? (
                <button className="btn btn--ghost btn--sm" onClick={() => void mutate(entryRequirementEndpoints.admin.archive(selected.id))}>
                  أرشفة
                </button>
              ) : null}
            </div>
          </Card>

          {selected.changes ? (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryTile}><strong>{selected.changes.added.length}</strong><span>أضيف في هذه النسخة</span></div>
              <div className={styles.summaryTile}><strong>{selected.changes.changed.length}</strong><span>عناصر تغيرت</span></div>
              <div className={styles.summaryTile}><strong>{selected.changes.removed.length}</strong><span>عناصر حذفت</span></div>
            </div>
          ) : null}

          <div className={styles.detailGrid}>
            <main className={styles.mainColumn}>
              <Card className={styles.panel}>
                <SectionHead
                  title="عناصر اللائحة"
                  action={canManage && editable ? (
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddItemOpen((open) => !open)}>
                      {addItemOpen ? 'إغلاق الإضافة' : '+ إضافة عنصر'}
                    </button>
                  ) : undefined}
                />

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryTile}><strong>{selected.item_count}</strong><span>إجمالي العناصر</span></div>
                  <div className={styles.summaryTile}><strong>{textbookCount}</strong><span>كتب مقررة</span></div>
                  <div className={styles.summaryTile}><strong>{notebookCount}</strong><span>دفاتر</span></div>
                </div>

                {unresolvedCount > 0 && editable && canManage ? (
                  <InfoBanner
                    tone="amber"
                    icon="!"
                    title={`${unresolvedCount} كتابًا يحتاج إلى ربط`}
                    description="اضغط «ربط» لعرض معلومات الكتاب وإكمال الخطوات المطلوبة دون مغادرة اللائحة."
                  />
                ) : null}

                {(offeringsLoading || subjectsLoading) && editable ? (
                  <InfoBanner title="جارٍ تحميل مواد ومقررات هذا المستوى…" />
                ) : null}

                {addItemOpen && canManage && editable ? (
                  <form className={styles.editorPanel} onSubmit={addItem}>
                    <div className={styles.editorTitle}>
                      <strong>إضافة عنصر إلى المسودة</strong>
                      <span className={styles.muted}>أضف كتابًا مقررًا من المراجع المعتمدة أو عنصرًا يدويًا.</span>
                    </div>
                    <div className={styles.formGrid}>
                      <label className="field">
                        النوع
                        <select
                          className="select"
                          value={itemType}
                          onChange={(event) => {
                            const next = event.target.value as RequirementItemType;
                            setItemType(next);
                            setItemSubject('');
                            setOfferingId('');
                          }}
                        >
                          {ITEM_TYPES.map((type) => <option key={type} value={type}>{requirementItemTypeLabel(type)}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        الكمية
                        <input className="input" type="number" min="0.1" step="0.1" value={itemQty} onChange={(event) => setItemQty(event.target.value)} />
                      </label>

                      {itemType === 'textbook' ? (
                        <>
                          <label className="field">
                            المادة
                            <select
                              className="select"
                              required
                              value={itemSubject}
                              disabled={subjectsLoading}
                              onChange={(event) => {
                                setItemSubject(event.target.value);
                                setOfferingId('');
                              }}
                            >
                              <option value="">اختر مادة هذا المستوى</option>
                              {levelSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                              ))}
                            </select>
                            {!subjectsLoading && levelSubjects.length === 0 ? (
                              <span className={styles.muted}>لا توجد مواد مفعلة لهذا المستوى. راجع إعدادات مواد المستوى.</span>
                            ) : null}
                          </label>
                          <label className={`field ${styles.fieldFull}`}>
                            المقرر المعتمد
                            <select className="select" required value={offeringId} disabled={!itemSubject || offeringsLoading} onChange={(event) => setOfferingId(event.target.value)}>
                              <option value="">اختر المقرر</option>
                              {itemOfferings.map((offering) => (
                                <option key={offering.id} value={offering.id}>
                                  {offering.reference.title}{offering.reference.edition ? ` — ${offering.reference.edition}` : ''}{offering.language ? ` — ${offering.language}` : ''}
                                </option>
                              ))}
                            </select>
                            {itemSubject && !offeringsLoading && itemOfferings.length === 0 ? (
                              <span className={styles.muted}>المادة مفعلة، لكن لا يوجد مقرر معتمد لها في السنة والمستوى المحددين.</span>
                            ) : null}
                          </label>
                        </>
                      ) : (
                        <label className={`field ${styles.fieldFull}`}>
                          اسم العنصر
                          <input className="input" required value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="مثال: دفتر 100 ورقة" />
                        </label>
                      )}

                      <label className="field">
                        الأهمية
                        <select className="select" value={itemImportance} onChange={(event) => setItemImportance(event.target.value as 'required' | 'optional')}>
                          <option value="required">إلزامي</option>
                          <option value="optional">اختياري</option>
                        </select>
                      </label>
                      <label className="field">
                        من يوفره؟
                        <select className="select" value={itemProvision} onChange={(event) => setItemProvision(event.target.value as 'family' | 'school')}>
                          <option value="family">الأسرة</option>
                          <option value="school">المدرسة</option>
                        </select>
                      </label>
                      <label className="field">
                        إعادة الاستعمال
                        <select className="select" value={itemReusable} onChange={(event) => setItemReusable(event.target.value as 'yes' | 'no' | '')}>
                          <option value="">غير محدد</option>
                          <option value="yes">يمكن إعادة استعماله</option>
                          <option value="no">لا</option>
                        </select>
                      </label>
                    </div>
                    <div className={styles.editorActions}>
                      <button className="btn btn--primary" type="submit">إضافة إلى المسودة</button>
                      <button type="button" className="btn btn--ghost" onClick={() => setAddItemOpen(false)}>إلغاء</button>
                    </div>
                  </form>
                ) : null}

                {resolvingItem && editable && canManage ? (
                  <div className={styles.editorPanel}>
                    <div className={styles.editorTitle}>
                      <strong>ربط «{resolvingItem.name}» بالمقرر</strong>
                      <span className={styles.muted}>اختر مادة مفعلة في {selected.level || 'هذا المستوى'}، ثم المقرر المعتمد إن وُجد.</span>
                    </div>
                    <div className={styles.formGrid}>
                      <label className="field">
                        المادة
                        <select
                          className="select"
                          value={resolutionSubject}
                          disabled={subjectsLoading || resolutionSaving}
                          onChange={(event) => {
                            setResolutionSubject(event.target.value);
                            setResolutionOfferingId('');
                          }}
                        >
                          <option value="">اختر مادة هذا المستوى</option>
                          {levelSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                        {!subjectsLoading && levelSubjects.length === 0 ? (
                          <span className={styles.muted}>لا توجد مواد مفعلة لهذا المستوى. راجع إعدادات مواد المستوى.</span>
                        ) : null}
                      </label>
                      <label className={`field ${styles.fieldFull}`}>
                        المقرر المعتمد
                        <select
                          className="select"
                          value={resolutionOfferingId}
                          disabled={!resolutionSubject || offeringsLoading || resolutionSaving}
                          onChange={(event) => setResolutionOfferingId(event.target.value)}
                        >
                          <option value="">اختر المقرر</option>
                          {resolutionOfferings.map((offering) => (
                            <option key={offering.id} value={offering.id}>
                              {offering.reference.title}{offering.reference.edition ? ` — ${offering.reference.edition}` : ''}{offering.language ? ` — ${offering.language}` : ''}
                            </option>
                          ))}
                        </select>
                        {resolutionSubject && !offeringsLoading && resolutionOfferings.length === 0 ? (
                          <span className={styles.muted}>المادة مفعلة، لكن لا يوجد مقرر معتمد لها في هذه السنة والمستوى.</span>
                        ) : null}
                      </label>
                    </div>
                    <div className={styles.editorActions}>
                      <button type="button" className="btn btn--primary" disabled={!resolutionOfferingId || resolutionSaving} onClick={() => void resolveTextbook()}>
                        {resolutionSaving ? 'جارٍ الربط…' : 'تأكيد الربط'}
                      </button>
                      <button type="button" className="btn btn--ghost" disabled={resolutionSaving} onClick={() => {
                        setResolutionItemId(null);
                        setResolutionSubject('');
                        setResolutionOfferingId('');
                      }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : null}

                {selected.items?.length ? (
                  <EntryRequirementCatalog
                    items={selected.items}
                    canManage={canManage}
                    editable={editable}
                    onLink={(item) => {
                      setError('');
                      setNotice('');
                      setAdoptItemId(item.id);
                    }}
                    onManualLink={startResolution}
                    onDelete={(item) => void deleteItem(item)}
                    onQuantityChange={updateItemQuantity}
                  />
                ) : (
                  <EmptyState
                    icon="📚"
                    title="اللائحة فارغة"
                    description="أضف العناصر يدويًا أو استخدم استيراد Excel من لوحة الأدوات."
                    compact
                  />
                )}
              </Card>

              {!editable ? (
                <InfoBanner
                  title="هذه النسخة غير قابلة للتعديل مباشرة"
                  description={selected.state === 'published' ? 'أنشئ نسخة محدثة لإجراء تغييرات جديدة.' : 'أعدها إلى مسار المسودة حسب دورة العمل قبل تعديل العناصر.'}
                />
              ) : null}
            </main>

            <aside className={styles.sideColumn}>
              <EntryRequirementsOperations
                list={selected}
                canManage={canManage}
                canPublish={canPublish}
                onChanged={async () => {
                  await loadLists();
                  await openList(selected.id);
                }}
              />
            </aside>
          </div>
        </>
      )}

      {selected && adoptItem ? (
        <EntryRequirementAdoptDialog
          open
          list={selected}
          item={adoptItem}
          subjects={levelSubjects}
          onClose={() => setAdoptItemId(null)}
          onSuccess={async () => {
            setAdoptItemId(null);
            setError('');
            setNotice('تم ربط الكتاب بالمقرر بنجاح.');
            await loadLists();
            await openList(selected.id);
          }}
        />
      ) : null}
    </div>
  );
}
