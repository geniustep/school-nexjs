import type { ReactNode } from 'react';

export function AcademicToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className ? `academic-toolbar ${className}` : 'academic-toolbar'}>{children}</div>;
}

export function AcademicSearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="academic-toolbar__search">
      <span className="academic-setup-sr-only">{label}</span>
      <input
        type="search"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}

export function AcademicFilterGroup({ children }: { children: ReactNode }) {
  return <div className="academic-toolbar__filters">{children}</div>;
}
