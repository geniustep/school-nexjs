'use client';

export type StudentCreateSectionIcon =
  | 'identity'
  | 'billing'
  | 'enrollment'
  | 'finance'
  | 'review'
  | 'siblings'
  | 'guardian'
  | 'followUp';

function SectionIcon({ type }: { type: StudentCreateSectionIcon }) {
  switch (type) {
    case 'identity':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'billing':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'enrollment':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'finance':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'review':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'siblings':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'guardian':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'followUp':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

export function StudentCreateSectionHeader({
  icon,
  title,
  lead,
}: {
  icon: StudentCreateSectionIcon;
  title?: string;
  lead?: string;
}) {
  if (!title && !lead) return null;

  return (
    <header className="student-create-form__section-header">
      <div className="student-create-form__section-icon" aria-hidden="true">
        <SectionIcon type={icon} />
      </div>
      <div>
        {title ? <h2 className="student-create-form__section-title">{title}</h2> : null}
        {lead ? <p className="student-create-form__section-lead">{lead}</p> : null}
      </div>
    </header>
  );
}

export function StudentCreateStyledSection({
  icon,
  title,
  lead,
  children,
  className,
}: {
  icon: StudentCreateSectionIcon;
  title?: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = [
    'student-create-form__section',
    'student-create-form__section--styled',
    `student-create-form__section--${icon}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <StudentCreateSectionHeader icon={icon} title={title} lead={lead} />
      <div className="student-create-form__section-body">{children}</div>
    </section>
  );
}
