import type { ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconBookOpen,
  IconCheckCircle,
  IconLayers,
} from '@/components/icons/admin-icons';

export type SubjectsPageStatChip = {
  tone: 'subjects' | 'ready' | 'pending';
  value: number;
  label: string;
};

const STAT_ICONS = {
  subjects: IconBookOpen,
  ready: IconCheckCircle,
  pending: IconAlertTriangle,
} as const;

export function SubjectsPageHero({
  title,
  subtitle,
  statChips,
  actions,
  toolbar,
  skeleton,
}: {
  title: string;
  subtitle?: string;
  statChips?: SubjectsPageStatChip[];
  actions?: ReactNode;
  toolbar?: ReactNode;
  skeleton?: boolean;
}) {
  if (skeleton) {
    return (
      <section
        className="academic-subjects-hero academic-subjects-hero--skeleton"
        aria-busy="true"
      >
        <div className="academic-setup-skeleton academic-setup-skeleton--title" />
        <div className="academic-setup-skeleton academic-setup-skeleton--line" />
      </section>
    );
  }

  return (
    <section className="academic-subjects-hero" aria-labelledby="subjects-page-title">
      <div className="academic-subjects-hero__backdrop" aria-hidden />

      <div className="academic-subjects-hero__head">
        <div className="academic-subjects-hero__identity">
          <div className="academic-subjects-hero__mark" aria-hidden>
            <IconLayers size={22} />
          </div>
          <div className="academic-subjects-hero__copy">
            <h1 id="subjects-page-title" className="academic-subjects-hero__title">
              {title}
            </h1>
            {subtitle && (
              <p className="academic-subjects-hero__subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {statChips && statChips.length > 0 && (
          <ul className="academic-subjects-hero__stats" aria-label={title}>
            {statChips.map((chip) => {
              const Icon = STAT_ICONS[chip.tone];
              return (
                <li
                  key={chip.tone}
                  className={`academic-subjects-hero__stat academic-subjects-hero__stat--${chip.tone}`}
                >
                  <span className="academic-subjects-hero__stat-icon" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <span className="academic-subjects-hero__stat-body">
                    <strong className="academic-subjects-hero__stat-value">
                      {chip.value}
                    </strong>
                    <span className="academic-subjects-hero__stat-label">
                      {chip.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {actions && (
          <div className="academic-subjects-hero__actions">{actions}</div>
        )}
      </div>

      {toolbar && (
        <div className="academic-subjects-hero__toolbar-panel">{toolbar}</div>
      )}
    </section>
  );
}
