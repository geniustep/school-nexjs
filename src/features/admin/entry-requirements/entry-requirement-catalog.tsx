'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/primitives';
import {
  isTextbookEffectivelyLinked,
  shouldShowAdoptTextbookAction,
} from '@/features/entry-requirements/entry-requirements-adopt-link';
import {
  requirementItemTypeLabel,
  type RequirementItem,
  type RequirementItemType,
} from '@/features/entry-requirements/entry-requirements-contract';
import type { TeachingOfferingSubjectOption } from '@/features/entry-requirements/entry-requirements-offering-options';
import { textbookReferenceTitle } from '@/features/entry-requirements/entry-requirements-display';
import {
  groupRequirementItems,
  notebookPresentation,
  requirementCoverAllocations,
  type RequirementCoverAllocation,
} from '@/features/entry-requirements/entry-requirements-presentation';
import styles from './entry-requirement-catalog.module.css';

type Props = {
  items: RequirementItem[];
  canManage: boolean;
  editable: boolean;
  onLink: (item: RequirementItem) => void;
  onManualLink: (item: RequirementItem) => void;
  onDelete: (item: RequirementItem) => void;
  onQuantityChange: (item: RequirementItem, quantity: number) => Promise<boolean>;
  onCoverChange: (item: RequirementItem, allocations: RequirementCoverAllocation[]) => Promise<boolean>;
  onSubjectChange?: (item: RequirementItem, subjectId: number) => Promise<boolean>;
  subjects?: TeachingOfferingSubjectOption[];
  onAddToSubject?: (subjectId: number, itemType: Extract<RequirementItemType, 'textbook' | 'book' | 'notebook'>) => void;
};

function SubjectControl({
  item,
  subjects = [],
  canManage,
  editable,
  onSubjectChange,
}: Pick<Props, 'subjects' | 'canManage' | 'editable' | 'onSubjectChange'> & { item: RequirementItem }) {
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  if (item.subject_id || !canManage || !editable || !onSubjectChange) return null;

  return (
    <div className={styles.subjectControl}>
      <label>
        <span>المادة</span>
        <select
          className="input"
          value={subjectId}
          disabled={saving || subjects.length === 0}
          aria-label={`المادة المرتبطة بـ ${item.title?.trim() || item.name}`}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          <option value="">اختر المادة</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={!subjectId || saving}
        onClick={async () => {
          setSaving(true);
          await onSubjectChange(item, Number(subjectId));
          setSaving(false);
        }}
      >
        {saving ? 'جارٍ الربط…' : 'ربط بالمادة'}
      </button>
      {subjects.length === 0 ? <span className={styles.subjectControlHint}>لا توجد مواد مفعلة لهذا المستوى.</span> : null}
    </div>
  );
}

const COVER_COLORS = ['شفاف', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'برتقالي', 'وردي', 'بنفسجي', 'أسود', 'أبيض'];

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function itemProvision(item: RequirementItem): string {
  return item.provision_source === 'school' ? 'توفره المدرسة' : 'توفره الأسرة';
}

function bookTitle(item: RequirementItem): string {
  return textbookReferenceTitle(item) || item.title?.trim() || item.name;
}

function QuantityControl({
  item,
  canManage,
  editable,
  onQuantityChange,
}: Pick<Props, 'canManage' | 'editable' | 'onQuantityChange'> & { item: RequirementItem }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantity));
  const [saving, setSaving] = useState(false);
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed > 0;

  if (!editing) {
    return (
      <span className={styles.quantityControl}>
        <span>الكمية: <bdi dir="ltr">{formatQuantity(item.quantity)}</bdi></span>
        {canManage && editable ? (
          <button
            type="button"
            className={styles.quantityEditButton}
            aria-label={`تعديل كمية ${item.title?.trim() || item.name}`}
            onClick={() => {
              setValue(String(item.quantity));
              setEditing(true);
            }}
          >
            تعديل
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className={styles.quantityEditor}>
      <label>
        <span className="sr-only">الكمية</span>
        <input
          className="input"
          type="number"
          min="0.01"
          step="1"
          inputMode="decimal"
          value={value}
          disabled={saving}
          aria-label={`كمية ${item.title?.trim() || item.name}`}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={!valid || saving || parsed === item.quantity}
        onClick={async () => {
          setSaving(true);
          const saved = await onQuantityChange(item, parsed);
          setSaving(false);
          if (saved) setEditing(false);
        }}
      >
        {saving ? 'جارٍ الحفظ…' : 'حفظ'}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={saving}
        onClick={() => {
          setValue(String(item.quantity));
          setEditing(false);
        }}
      >
        إلغاء
      </button>
    </span>
  );
}

function CoverControl({
  item,
  canManage,
  editable,
  onCoverChange,
}: Pick<Props, 'canManage' | 'editable' | 'onCoverChange'> & { item: RequirementItem }) {
  const current = requirementCoverAllocations(item);
  const [editing, setEditing] = useState(false);
  const [allocations, setAllocations] = useState<RequirementCoverAllocation[]>(current);
  const [saving, setSaving] = useState(false);
  const total = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const colors = allocations.map((allocation) => allocation.color);
  const uniqueColors = new Set(colors).size === colors.length;
  const valid = allocations.every((allocation) => (
    allocation.color && Number.isSafeInteger(allocation.quantity) && allocation.quantity > 0
  )) && uniqueColors && total <= item.quantity;

  function updateAllocation(index: number, patch: Partial<RequirementCoverAllocation>) {
    setAllocations((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  if (!editing) {
    return (
      <span className={styles.coverControl}>
        {current.map((allocation) => (
          <span className={styles.coverValue} key={allocation.color}>
            <i className={styles.coverColorDot} data-color={allocation.color} aria-hidden="true" />
            {allocation.color} ×<bdi dir="ltr">{formatQuantity(allocation.quantity)}</bdi>
          </span>
        ))}
        {canManage && editable ? (
          <button
            type="button"
            className={styles.coverEditButton}
            aria-label={`${current.length ? 'تعديل' : 'إضافة'} غلاف لـ ${item.title?.trim() || item.name}`}
            onClick={() => {
              setAllocations(current.length ? current : [{ color: 'شفاف', quantity: item.quantity }]);
              setEditing(true);
            }}
          >
            {current.length ? 'توزيع الألوان' : '+ غلاف'}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className={styles.coverEditor}>
      <span className={styles.coverAllocationList}>
        {allocations.map((allocation, index) => (
          <span className={styles.coverAllocationRow} key={`${index}-${allocation.color}`}>
            <label>
              <span className="sr-only">لون الغلاف {index + 1}</span>
              <select
                className="input"
                value={allocation.color}
                disabled={saving}
                aria-label={`لون الغلاف ${index + 1} لـ ${item.title?.trim() || item.name}`}
                onChange={(event) => updateAllocation(index, { color: event.target.value })}
              >
                {COVER_COLORS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">كمية الغلاف {index + 1}</span>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={allocation.quantity}
                disabled={saving}
                aria-label={`كمية الغلاف ${index + 1} لـ ${item.title?.trim() || item.name}`}
                onChange={(event) => updateAllocation(index, { quantity: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={saving}
              aria-label={`حذف لون الغلاف ${index + 1}`}
              onClick={() => setAllocations((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
            >
              حذف
            </button>
          </span>
        ))}
        {allocations.length < COVER_COLORS.length && total < item.quantity ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={saving}
            onClick={() => {
              const nextColor = COVER_COLORS.find((value) => !colors.includes(value)) ?? 'شفاف';
              setAllocations((rows) => [...rows, { color: nextColor, quantity: 1 }]);
            }}
          >
            + لون آخر
          </button>
        ) : null}
        <span className={total > item.quantity ? styles.coverAllocationError : styles.coverAllocationSummary}>
          تم توزيع <bdi dir="ltr">{total}</bdi> من <bdi dir="ltr">{formatQuantity(item.quantity)}</bdi>
        </span>
        {!uniqueColors ? <span className={styles.coverAllocationError}>لا يمكن تكرار اللون نفسه.</span> : null}
      </span>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={saving || !valid}
        onClick={async () => {
          setSaving(true);
          const saved = await onCoverChange(item, allocations);
          setSaving(false);
          if (saved) setEditing(false);
        }}
      >
        {saving ? 'جارٍ الحفظ…' : 'حفظ'}
      </button>
      <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setEditing(false)}>
        إلغاء
      </button>
    </span>
  );
}

function SectionHeader({ title, count, description }: { title: string; count: number; description: string }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className={styles.sectionCount}>{count}</span>
    </div>
  );
}

function ItemActions({
  item,
  canManage,
  editable,
  onLink,
  onDelete,
}: Props & { item: RequirementItem }) {
  const unresolved = shouldShowAdoptTextbookAction(item);
  const linked = isTextbookEffectivelyLinked(item);

  return (
    <div className={styles.actions}>
      {unresolved ? <Badge tone="amber">يحتاج إلى ربط</Badge> : null}
      {linked ? <Badge tone="green">مرتبط بالمقرر</Badge> : null}
      {unresolved && canManage && editable ? (
        <button type="button" className="btn btn--primary btn--sm" onClick={() => onLink(item)}>
          ربط
        </button>
      ) : null}
      {canManage && editable ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(item)}>
          حذف
        </button>
      ) : null}
    </div>
  );
}

function BookCard(props: Props & { item: RequirementItem; index: number }) {
  const { item, index } = props;
  const title = bookTitle(item);
  const subtitle = item.subject || (item.item_type === 'textbook' ? 'مادة غير محددة' : 'كتاب إضافي');
  const meta = [item.publisher, item.edition, item.isbn ? `ISBN ${item.isbn}` : null].filter(Boolean) as string[];

  return (
    <article className={styles.bookCard}>
      <div className={styles.bookCover} data-variant={index % 4} aria-label={`تمثيل بصري لغلاف ${title}`}>
        <span className={styles.bookCoverEyebrow}>{subtitle}</span>
        <strong dir="auto">{title}</strong>
        <span className={styles.bookCoverFoot}>{item.publisher || 'رَقِيم'}</span>
      </div>

      <div className={styles.bookContent}>
        <div className={styles.bookHeading}>
          <div>
            <div className={styles.eyebrowRow}>
              <Badge tone={item.item_type === 'textbook' ? 'blue' : 'slate'}>
                {requirementItemTypeLabel(item.item_type)}
              </Badge>
              {item.importance === 'required' ? <span className={styles.requiredLabel}>إلزامي</span> : null}
            </div>
            <h4 dir="auto">{title}</h4>
            <p>{subtitle}</p>
          </div>
        </div>

        {meta.length ? (
          <div className={styles.metaChips}>
            {meta.map((value) => <span key={value} dir="auto">{value}</span>)}
          </div>
        ) : null}

        <div className={styles.bookFooter}>
          <div className={styles.compactFacts}>
            <QuantityControl {...props} item={item} />
            <CoverControl {...props} item={item} />
            <span>{itemProvision(item)}</span>
            {item.reusable ? <span>قابل لإعادة الاستعمال</span> : null}
          </div>
          <SubjectControl {...props} item={item} />
          <ItemActions {...props} />
        </div>
      </div>
    </article>
  );
}

function NotebookCard(props: Props & { item: RequirementItem }) {
  const { item } = props;
  const presentation = notebookPresentation(item);

  return (
    <article className={styles.notebookCard}>
      <div className={styles.notebookVisual} data-tone={presentation.coverTone}>
        <span className={styles.notebookBinding} aria-hidden="true" />
        <span className={styles.notebookPages}>
          {presentation.pages ? <><strong>{presentation.pages}</strong><small>صفحة</small></> : <strong>دفتر</strong>}
        </span>
      </div>

      <div className={styles.notebookContent}>
        <div className={styles.notebookTopline}>
          <div>
            <h4 dir="auto">{item.title?.trim() || item.name}</h4>
            <div className={styles.notebookFacts}>
              {presentation.pages ? <span><strong>{presentation.pages}</strong> صفحة</span> : null}
              {presentation.purpose ? <span>الغرض: {presentation.purpose}</span> : null}
              {item.subject ? <span>{item.subject}</span> : null}
            </div>
          </div>
          <Badge tone="slate">دفتر</Badge>
        </div>

        <div className={styles.notebookFooter}>
          <div className={styles.compactFacts}>
            <QuantityControl {...props} item={item} />
            <CoverControl {...props} item={item} />
            <span>{itemProvision(item)}</span>
          </div>
          <SubjectControl {...props} item={item} />
          {props.canManage && props.editable ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => props.onDelete(item)}>
              حذف
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ToolsList(props: Props & { items: RequirementItem[] }) {
  return (
    <div className={styles.toolsList}>
      {props.items.map((item) => (
        <div className={styles.toolRow} key={item.id}>
          <div className={styles.toolIdentity}>
            <strong dir="auto">{item.title?.trim() || item.name}</strong>
            <span>{item.notes || requirementItemTypeLabel(item.item_type)}</span>
          </div>
          <Badge tone={item.item_type === 'uniform' ? 'amber' : 'slate'}>
            {requirementItemTypeLabel(item.item_type)}
          </Badge>
          <span className={styles.toolQuantity}>
            <QuantityControl {...props} item={item} />
          </span>
          <span className={styles.toolProvision}>{itemProvision(item)}</span>
          {props.canManage && props.editable ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => props.onDelete(item)}>
              حذف
            </button>
          ) : <span />}
        </div>
      ))}
    </div>
  );
}

export function EntryRequirementCatalog(props: Props) {
  const groups = groupRequirementItems(props.items);
  const curriculumItems = [...groups.books, ...groups.notebooks];
  const subjectRows = (() => {
    const rows = new Map<number, TeachingOfferingSubjectOption>();
    for (const subject of props.subjects ?? []) rows.set(subject.id, subject);
    for (const item of curriculumItems) {
      if (item.subject_id && !rows.has(item.subject_id)) {
        rows.set(item.subject_id, { id: item.subject_id, name: item.subject || `المادة #${item.subject_id}` });
      }
    }
    return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name, 'ar'));
  })();
  const [openSubjectId, setOpenSubjectId] = useState<number | null>(() => subjectRows[0]?.id ?? null);
  const unlinkedItems = curriculumItems.filter((item) => !item.subject_id);

  return (
    <div className={styles.catalog}>
      {subjectRows.length ? (
        <section className={styles.catalogSection}>
          <SectionHeader
            title="تجهيز المواد"
            count={subjectRows.length}
            description="افتح مادة واحدة لإضافة كتبها ودفاترها وأغلفة كل عنصر على حدة."
          />
          <div className={styles.subjectList}>
            {subjectRows.map((subject) => {
              const subjectItems = curriculumItems.filter((item) => item.subject_id === subject.id);
              const books = subjectItems.filter((item) => item.item_type === 'textbook' || item.item_type === 'book');
              const notebooks = subjectItems.filter((item) => item.item_type === 'notebook');
              const covers = subjectItems.reduce((sum, item) => (
                sum + requirementCoverAllocations(item).reduce((coverSum, allocation) => coverSum + allocation.quantity, 0)
              ), 0);
              const open = openSubjectId === subject.id;

              return (
                <article className={styles.subjectCard} data-open={open ? 'true' : 'false'} key={subject.id}>
                  <button
                    type="button"
                    className={styles.subjectTrigger}
                    aria-expanded={open}
                    onClick={() => setOpenSubjectId((current) => current === subject.id ? null : subject.id)}
                  >
                    <span className={styles.subjectIdentity}>
                      <strong>{subject.name}</strong>
                      <span>
                        {subjectItems.length
                          ? `${books.length} كتب · ${notebooks.length} دفاتر · ${covers} أغلفة`
                          : 'لم تُجهّز بعد'}
                      </span>
                    </span>
                    <span className={styles.subjectStatus} data-complete={subjectItems.length ? 'true' : 'false'}>
                      {subjectItems.length ? '✓ مجهزة' : 'ابدأ التجهيز'}
                    </span>
                    <span className={styles.subjectChevron} aria-hidden="true">⌄</span>
                  </button>

                  {open ? (
                    <div className={styles.subjectBody}>
                      <div className={styles.subjectSectionHead}>
                        <div><strong>الكتب</strong><span>{books.length ? `${books.length} عناصر` : 'لا توجد كتب بعد'}</span></div>
                        {props.canManage && props.editable && props.onAddToSubject ? (
                          <div className={styles.subjectAddActions}>
                            <button type="button" className="btn btn--primary btn--sm" onClick={() => props.onAddToSubject?.(subject.id, 'textbook')}>+ كتاب مقرر</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => props.onAddToSubject?.(subject.id, 'book')}>+ كتاب آخر</button>
                          </div>
                        ) : null}
                      </div>
                      {books.length ? (
                        <div className={styles.booksGrid}>
                          {books.map((item, index) => <BookCard key={item.id} {...props} item={item} index={index} />)}
                        </div>
                      ) : <p className={styles.subjectEmpty}>أضف الكتاب، ثم حدد غلافه إن كان مطلوبًا.</p>}

                      <div className={styles.subjectSectionHead}>
                        <div><strong>الدفاتر</strong><span>{notebooks.length ? `${notebooks.length} عناصر` : 'لا توجد دفاتر بعد'}</span></div>
                        {props.canManage && props.editable && props.onAddToSubject ? (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => props.onAddToSubject?.(subject.id, 'notebook')}>+ إضافة دفتر</button>
                        ) : null}
                      </div>
                      {notebooks.length ? (
                        <div className={styles.notebooksGrid}>
                          {notebooks.map((item) => <NotebookCard key={item.id} {...props} item={item} />)}
                        </div>
                      ) : <p className={styles.subjectEmpty}>أضف كل دفتر على حدة لتحديد كميته ولون غلافه بدقة.</p>}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {unlinkedItems.length ? (
        <section className={styles.catalogSection}>
          <SectionHeader
            title="عناصر تحتاج إلى مادة"
            count={unlinkedItems.length}
            description="هذه عناصر قديمة أو مستوردة؛ اربطها بالمادة قبل النشر."
          />
          <div className={styles.booksGrid}>
            {unlinkedItems.map((item, index) => item.item_type === 'notebook'
              ? <NotebookCard key={item.id} {...props} item={item} />
              : <BookCard key={item.id} {...props} item={item} index={index} />)}
          </div>
        </section>
      ) : null}

      {groups.tools.length ? (
        <section className={styles.catalogSection}>
          <SectionHeader
            title="الأدوات واللوازم"
            count={groups.tools.length}
            description="قائمة واحدة جامعة للأدوات والمستلزمات والزي وبقية العناصر."
          />
          <ToolsList {...props} items={groups.tools} />
        </section>
      ) : null}
    </div>
  );
}
