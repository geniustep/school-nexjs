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
} from '@/features/entry-requirements/entry-requirements-contract';
import { textbookReferenceTitle } from '@/features/entry-requirements/entry-requirements-display';
import {
  groupRequirementItems,
  notebookPresentation,
  requirementCoverColor,
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
  onCoverChange: (item: RequirementItem, color: string | null) => Promise<boolean>;
};

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
  const current = requirementCoverColor(item);
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(current ?? 'شفاف');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <span className={styles.coverControl}>
        {current ? (
          <span className={styles.coverValue}>
            <i className={styles.coverColorDot} data-color={current} aria-hidden="true" />
            غلاف: {current} ×<bdi dir="ltr">{formatQuantity(item.quantity)}</bdi>
          </span>
        ) : null}
        {canManage && editable ? (
          <button
            type="button"
            className={styles.coverEditButton}
            aria-label={`${current ? 'تعديل' : 'إضافة'} غلاف لـ ${item.title?.trim() || item.name}`}
            onClick={() => {
              setColor(current ?? 'شفاف');
              setEditing(true);
            }}
          >
            {current ? 'تغيير' : '+ غلاف'}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className={styles.coverEditor}>
      <label>
        <span className="sr-only">لون الغلاف</span>
        <select
          className="input"
          value={color}
          disabled={saving}
          aria-label={`لون غلاف ${item.title?.trim() || item.name}`}
          onChange={(event) => setColor(event.target.value)}
        >
          {COVER_COLORS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={saving || color === current}
        onClick={async () => {
          setSaving(true);
          const saved = await onCoverChange(item, color);
          setSaving(false);
          if (saved) setEditing(false);
        }}
      >
        {saving ? 'جارٍ الحفظ…' : 'حفظ'}
      </button>
      {current ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const saved = await onCoverChange(item, null);
            setSaving(false);
            if (saved) setEditing(false);
          }}
        >
          إزالة
        </button>
      ) : null}
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

  return (
    <div className={styles.catalog}>
      {groups.books.length ? (
        <section className={styles.catalogSection}>
          <SectionHeader
            title="الكتب والمقررات"
            count={groups.books.length}
            description="الكتاب أولًا: العنوان والمادة وحالة الربط، مع غلاف بصري سريع للتعرّف عليه."
          />
          <div className={styles.booksGrid}>
            {groups.books.map((item, index) => (
              <BookCard key={item.id} {...props} item={item} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.notebooks.length ? (
        <section className={styles.catalogSection}>
          <SectionHeader
            title="الدفاتر"
            count={groups.notebooks.length}
            description="عدد الصفحات أولًا، مع إمكانية ربط غلاف ملوّن بكل دفتر."
          />
          <div className={styles.notebooksGrid}>
            {groups.notebooks.map((item) => <NotebookCard key={item.id} {...props} item={item} />)}
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
