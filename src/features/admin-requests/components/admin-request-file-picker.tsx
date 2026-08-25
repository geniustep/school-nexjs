'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { adminRequestMessage } from '../i18n';

export function AdminRequestFilePicker({
  id,
  files,
  onChange,
  disabled = false,
}: {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const { locale } = useLocale();
  const inputKey = files.length
    ? files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|')
    : 'empty';
  const selectionLabel = files.length === 0
    ? adminRequestMessage(locale, 'files.none')
    : adminRequestMessage(
        locale,
        files.length === 1 ? 'files.selectedOne' : 'files.selectedMany',
        { count: files.length },
      );

  return (
    <div className="col" style={{ gap: 8 }}>
      <input
        key={inputKey}
        id={id}
        type="file"
        multiple
        hidden
        onChange={(event) => onChange(Array.from(event.target.files ?? []))}
        disabled={disabled}
      />
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label htmlFor={id} className={`btn btn--ghost btn--sm${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled}>
          {adminRequestMessage(locale, files.length ? 'files.change' : 'files.choose')}
        </label>
        <span className="tiny muted">{selectionLabel}</span>
      </div>
      {files.length > 0 && (
        <ul className="col tiny muted" style={{ gap: 4, margin: 0, paddingInlineStart: 18 }}>
          {files.map((file) => (
            <li key={`${file.name}:${file.size}:${file.lastModified}`} dir="auto">{file.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
