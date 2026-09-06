'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { studentClassLabel, studentLevelLabel } from '@/features/admin/students/utils/student-academic-labels';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import type { ParentFamilyGroup } from '@/features/admin/parents/utils/group-parents-by-family';
import { useLocale, type TranslateFn } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import { pluralForm } from '@/lib/i18n/count-plural';
import { getStudentDisplayName } from '@/lib/utils/student';

function childrenCountLabel(t: TranslateFn, locale: Locale, count: number): string {
  const form = pluralForm(count, locale);
  const key = `admin.parentsList.childrenCount.${form}`;
  if (form === 'one' || form === 'two') return t(key);
  return t(key, { count });
}

export function ParentsFamilyList({ families }: { families: ParentFamilyGroup[] }) {
  const { t, locale } = useLocale();
  return <div className="parents-family-list">
    {families.map((family, familyIndex) => <article key={`${family.id}-${familyIndex}`} className={`parents-family-card${family.children.length === 0 ? ' parents-family-card--solo' : ''}`}>
      <div className="parents-family-card__accent" aria-hidden="true" />
      <div className="parents-family-card__body">
        <div className="parents-family-card__field">
          <span className="parents-family-card__field-label">
            {t('admin.linkedChildren')}{family.children.length > 0 ? <span className="parents-family-card__children-count"> ({childrenCountLabel(t, locale, family.children.length)})</span> : null}
            {family.school ? <span className="tiny muted" dir="auto"> · {family.school.name}</span> : null}:
          </span>
          <div className="parents-family-card__field-value">
            {family.children.length > 0 ? <ul className="parents-family-card__children-list">{family.children.map((child, childIndex) => {
              const name = getStudentDisplayName(child);
              const classLabel = studentClassLabel(child.class);
              const levelLabel = studentLevelLabel(child.level);
              const schoolId = child.school?.id ?? family.school?.id;
              const href = `/admin/students/${child.id}`;
              return <li key={`${child.id ?? 'child'}-${childIndex}`} className="parents-family-card__child-item">
                {typeof child.id === 'number' ? <Link href={href} data-all-schools-record-school-id={schoolId ?? undefined} data-all-schools-record-href={schoolId ? href : undefined} className="parents-family-card__child-name" dir="auto">{name}</Link> : <span className="parents-family-card__child-name" dir="auto">{name}</span>}
                {classLabel !== '—' || levelLabel !== '—' ? <span className="parents-family-card__child-academic tiny muted">{classLabel !== '—' ? <span dir="auto">{classLabel}</span> : null}{classLabel !== '—' && levelLabel !== '—' ? <span aria-hidden="true"> · </span> : null}{levelLabel !== '—' ? <span dir="auto">{levelLabel}</span> : null}</span> : null}
              </li>;
            })}</ul> : <span className="muted">{t('admin.noLinkedChildren')}</span>}
          </div>
        </div>
        <div className="parents-family-card__field parents-family-card__field--guardians">
          <span className="parents-family-card__field-label">{t('admin.parentsList.guardiansTitle')}:</span>
          <ul className="parents-family-card__guardian-lines">{family.guardians.map(({ parent, relationshipType }, guardianIndex) => {
            const schoolId = parent.school?.id ?? family.school?.id;
            const href = `/admin/parents/${parent.id}`;
            return <li key={`${parent.id}-${guardianIndex}`} className="parents-family-card__guardian-line">
              <span className="parents-family-card__guardian-role">{relationshipTypeLabel(t, relationshipType)}:</span>
              <div className="parents-family-card__guardian-content">
                <Link href={href} data-all-schools-record-school-id={schoolId ?? undefined} data-all-schools-record-href={schoolId ? href : undefined} className="parents-family-card__guardian-name" dir="auto">{parent.name}</Link>
                {parent.phone ?? parent.mobile ? <span className="parents-family-card__guardian-meta"><span className="mono" dir="ltr">{parent.phone ?? parent.mobile}</span></span> : null}
              </div>
            </li>;
          })}</ul>
        </div>
      </div>
    </article>)}
  </div>;
}
