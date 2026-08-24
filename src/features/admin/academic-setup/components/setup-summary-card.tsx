'use client';

import Link from 'next/link';
import {
  IconBookOpen,
  IconBuilding,
  IconClipboard,
  IconGraduationCap,
  IconUsers,
} from '@/components/icons/admin-icons';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessDomain, SetupReadinessPayload } from '@/types/academic-setup';
import { isStaffDomainUnavailable, readinessStatusLabel, readinessTone } from '../utils/readiness-present';

type DomainKey = 'levels_classes' | 'subjects_tracks' | 'teachers' | 'staff' | 'assignments';

const DOMAIN_META: {
  key: DomainKey;
  href: string;
  titleKey: string;
  Icon: typeof IconBuilding;
  featured?: boolean;
}[] = [
  {
    key: 'levels_classes',
    href: '/admin/settings/academic-setup/classes',
    titleKey: 'classes',
    Icon: IconBuilding,
  },
  {
    key: 'subjects_tracks',
    href: '/admin/settings/academic-setup/subjects',
    titleKey: 'subjects',
    Icon: IconBookOpen,
  },
  {
    key: 'teachers',
    href: '/admin/settings/academic-setup/teachers',
    titleKey: 'teachers',
    Icon: IconGraduationCap,
  },
  {
    key: 'staff',
    href: '/admin/settings/academic-setup/staff',
    titleKey: 'staff',
    Icon: IconUsers,
  },
  {
    key: 'assignments',
    href: '/admin/settings/academic-setup/assignments',
    titleKey: 'assignments',
    Icon: IconClipboard,
    featured: true,
  },
];

function domainStats(
  key: DomainKey,
  domain: SetupReadinessDomain | undefined,
  t: (k: string, p?: Record<string, string | number>) => string,
  staffUnavailable: boolean,
) {
  if (key === 'staff' && staffUnavailable) {
    return <span>{t('admin.academicSetup.staffDomainUnavailable')}</span>;
  }
  if (!domain) return <span>{t('common.dash')}</span>;
  const s = domain.summary;
  switch (key) {
    case 'levels_classes':
      return (
        <>
          <span>{t('admin.academicSetup.cards.levelsCount', { count: s.levels ?? 0 })}</span>
          <span>{t('admin.academicSetup.cards.classesCount', { count: s.classes ?? 0 })}</span>
        </>
      );
    case 'subjects_tracks':
      return (
        <>
          <span>{t('admin.academicSetup.cards.subjectsCount', { count: s.subjects ?? 0 })}</span>
          <span>{t('admin.academicSetup.cards.tracksCount', { count: s.tracks ?? 0 })}</span>
        </>
      );
    case 'teachers':
      return (
        <>
          <span>{t('admin.academicSetup.cards.teachersCount', { count: s.teachers ?? 0 })}</span>
          {(s.without_assignments ?? 0) > 0 && (
            <strong>{t('admin.academicSetup.cards.noAssignments', { count: s.without_assignments })}</strong>
          )}
        </>
      );
    case 'staff':
      return <span>{t('admin.academicSetup.cards.staffCount', { count: s.staff ?? 0 })}</span>;
    case 'assignments':
      return (
        <span>
          {t('admin.academicSetup.guided.summaryAssignments', {
            assigned: s.assigned ?? 0,
            missing: s.missing_teacher_assignments_count ?? s.missing ?? 0,
          })}
        </span>
      );
    default:
      return null;
  }
}

export function SetupDomainCards({ data }: { data: SetupReadinessPayload }) {
  const t = useT();
  const staffUnavailable = isStaffDomainUnavailable(data.domains);

  return (
    <div className="academic-setup-cards">
      {DOMAIN_META.map(({ key, href, titleKey, Icon, featured }) => {
        const domain = data.domains[key];
        const tone = domain ? readinessTone(domain.status, domain.score) : 'slate';
        const score = domain?.score ?? 0;

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              'academic-setup-card',
              `academic-setup-card--${tone}`,
              featured && 'academic-setup-card--featured',
            )}
          >
            <div className="academic-setup-card__head">
              <span className="academic-setup-card__icon" aria-hidden>
                <Icon size={18} />
              </span>
              <span className="academic-setup-card__chevron" aria-hidden>
                ›
              </span>
            </div>
            <strong className="academic-setup-card__title">
              {t(`admin.academicSetup.cards.${titleKey}`)}
            </strong>
            {domain ? (
              <span className={cn('academic-setup-badge', `academic-setup-badge--${tone}`, 'academic-setup-badge--status')}>
                {readinessStatusLabel(domain.status, t, score)} · {score}%
              </span>
            ) : key === 'staff' && staffUnavailable ? (
              <span className="tiny muted">{t('admin.academicSetup.staffDomainUnavailable')}</span>
            ) : (
              <span className="tiny muted">{t('common.dash')}</span>
            )}
            <div
              className={cn('academic-setup-card__meter', `academic-setup-card__meter--${tone}`)}
              aria-hidden
            >
              <span style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
            </div>
            <div className="academic-setup-card__stats">
              {domainStats(key, domain, t, staffUnavailable)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
