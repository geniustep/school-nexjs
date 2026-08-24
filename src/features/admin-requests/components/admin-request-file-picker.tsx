'use client';

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
  const inputKey = files.length
    ? files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|')
    : 'empty';

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
          {files.length ? 'تغيير الملفات' : 'اختيار الملفات'}
        </label>
        <span className="tiny muted">
          {files.length ? `تم اختيار ${files.length} ${files.length === 1 ? 'ملف' : 'ملفات'}` : 'لم يتم اختيار ملفات'}
        </span>
      </div>
      {files.length > 0 && (
        <ul className="col tiny muted" style={{ gap: 4, margin: 0, paddingInlineStart: 18 }}>
          {files.map((file) => <li key={`${file.name}:${file.size}:${file.lastModified}`}>{file.name}</li>)}
        </ul>
      )}
    </div>
  );
}
