import type { ReactNode } from 'react';
import {
  IconBuilding,
  IconGraduationCap,
  IconLayers,
} from '@/components/icons/admin-icons';

export type ClassesPageStatChip = {
  tone: 'levels' | 'classes' | 'students';
  value: number;
  label: string;
};

const STAT_ICONS = {
  levels: IconLayers,
  classes: IconBuilding,
  students: IconGraduationCap,
} as const;

export function ClassesPageHero({
  title,
  subtitle,
  statChips,
  actions,
  toolbar,
  skeleton,
}: {
  title: string;
  subtitle?: string;
  statChips?: ClassesPageStatChip[];
  actions?: ReactNode;
  toolbar?: ReactNode;
  skeleton?: boolean;
}) {
  if (skeleton) {
    return (
      <section
        className="academic-classes-hero academic-classes-hero--skeleton"
        aria-busy="true"
      >
        <div className="academic-setup-skeleton academic-setup-skeleton--title" />
        <div className="academic-setup-skeleton academic-setup-skeleton--line" />
      </section>
    );
  }

  return (
    <section className="academic-classes-hero" aria-labelledby="classes-page-title">
      <div className="academic-classes-hero__backdrop" aria-hidden />

      <div className="academic-classes-hero__head">
        <div className="academic-classes-hero__identity">
          <div className="academic-classes-hero__mark" aria-hidden>
            <IconLayers size={22} />
          </div>
          <div className="academic-classes-hero__copy">
            <h1 id="classes-page-title" className="academic-classes-hero__title">
              {title}
            </h1>
            {subtitle && (
              <p className="academic-classes-hero__subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {statChips && statChips.length > 0 && (
          <ul className="academic-classes-hero__stats" aria-label={title}>
            {statChips.map((chip) => {
              const Icon = STAT_ICONS[chip.tone];
              return (
                <li
                  key={chip.tone}
                  className={`academic-classes-hero__stat academic-classes-hero__stat--${chip.tone}`}
                >
                  <span className="academic-classes-hero__stat-icon" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <span className="academic-classes-hero__stat-body">
                    <strong className="academic-classes-hero__stat-value">
                      {chip.value}
                    </strong>
                    <span className="academic-classes-hero__stat-label">
                      {chip.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {actions && (
          <div className="academic-classes-hero__actions">{actions}</div>
        )}
      </div>

      {toolbar && (
        <div className="academic-classes-hero__toolbar-panel">{toolbar}</div>
      )}
    </section>
  );
}
