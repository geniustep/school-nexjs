'use client';

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
} from '@/features/entry-requirements/entry-requirements-presentation';
import styles from './entry-requirement-catalog.module.css';

type Props = {
  items: RequirementItem[];
  canManage: boolean;
  editable: boolean;
  onLink: (item: RequirementItem) => void;
  onManualLink: (item: RequirementItem) => void;
  onDelete: (item: RequirementItem) => void;
};

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function itemProvision(item: RequirementItem): string {
  return item.provision_source === 'school' ? 'توفره المدرسة' : 'توفره الأسرة';
}

function bookTitle(item: RequirementItem): string {
  return textbookReferenceTitle(item) || item.title?.trim() || item.name;
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
            <span><bdi dir="ltr">{formatQuantity(item.quantity)}</bdi> نسخة</span>
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
              {presentation.cover ? (
                <span className={styles.coverFact}>
                  <i className={styles.coverDot} data-tone={presentation.coverTone} aria-hidden="true" />
                  الغلاف: {presentation.cover}
                </span>
              ) : null}
              {presentation.purpose ? <span>الغرض: {presentation.purpose}</span> : null}
              {item.subject ? <span>{item.subject}</span> : null}
            </div>
          </div>
          <Badge tone="slate">دفتر</Badge>
        </div>

        <div className={styles.notebookFooter}>
          <div className={styles.compactFacts}>
            <span>الكمية: <bdi dir="ltr">{formatQuantity(item.quantity)}</bdi></span>
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
          <span className={styles.toolQuantity}>× <bdi dir="ltr">{formatQuantity(item.quantity)}</bdi></span>
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
            description="عدد الصفحات والغلاف في المقدمة، ثم الغرض والكمية دون تكرار النصوص."
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
