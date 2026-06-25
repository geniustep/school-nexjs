'use client';

import Link from 'next/link';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '../utils/admission-labels';
import {
  formatSiblingAgeAtAdmission,
  localizeSiblingRelationship,
  resolveSiblingLineSource,
  siblingLineLinkedStudentId,
} from '../utils/sibling-display';
import type { SiblingLine } from '@/types/sibling-line';

function SiblingLineCard({ line }: { line: SiblingLine }) {
  const t = useT();
  const { formatDate } = useFormat();
  const name = cleanDisplayValue(line.name);
  const relationship = localizeSiblingRelationship(t, line.relationship);
  const birthDate = cleanDisplayValue(line.birth_date);
  const age = formatSiblingAgeAtAdmission(line.age_years_at_admission, t);
  const level = cleanDisplayValue(line.level_text);
  const notes = cleanDisplayValue(line.notes);
  const linkedId = siblingLineLinkedStudentId(line);
  const source = resolveSiblingLineSource(line);

  const meta: Array<{ label: string; value: string }> = [];
  if (birthDate) {
    meta.push({ label: t('admin.siblings.table.birthDate'), value: formatDate(birthDate) });
  }
  if (age) {
    meta.push({ label: t('admin.siblings.table.ageAtAdmission'), value: age });
  }
  if (level) {
    meta.push({ label: t('admin.siblings.table.level'), value: level });
  }
  if (line.is_current_student === true) {
    meta.push({ label: t('admin.siblings.table.currentStudent'), value: t('common.yes') });
  } else if (line.is_current_student === false) {
    meta.push({ label: t('admin.siblings.table.currentStudent'), value: t('common.no') });
  }
  if (notes) {
    meta.push({ label: t('admin.siblings.table.notes'), value: notes });
  }

  return (
    <article className="sibling-line-card">
      <header className="sibling-line-card__head">
        <div className="sibling-line-card__identity">
          <strong className="sibling-line-card__name" dir="auto">
            {name || t('admin.siblings.notMentioned')}
          </strong>
          {relationship ? (
            <span className="sibling-line-card__relation">{relationship}</span>
          ) : null}
          <span
            className={`sibling-line-card__source sibling-line-card__source--${source}`}
          >
            {source === 'linked'
              ? t('admin.siblings.source.linked')
              : t('admin.siblings.source.admission')}
          </span>
        </div>
        {linkedId ? (
          <Link className="sibling-line-card__link" href={`/admin/students/${linkedId}`}>
            #{linkedId}
          </Link>
        ) : null}
      </header>
      {source === 'admission' ? (
        <p className="sibling-line-card__source-note tiny muted" dir="auto">
          {t('admin.siblings.source.admissionNote')}
        </p>
      ) : null}
      {meta.length > 0 ? (
        <dl className="sibling-line-card__meta">
          {meta.map((item) => (
            <div key={item.label} className="sibling-line-card__meta-item">
              <dt>{item.label}</dt>
              <dd dir="auto">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function SiblingLinesCards({ lines }: { lines: SiblingLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="sibling-lines-cards">
      {lines.map((line, index) => (
        <SiblingLineCard key={line.sequence ?? `${line.name}-${index}`} line={line} />
      ))}
    </div>
  );
}
