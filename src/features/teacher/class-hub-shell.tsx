'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/primitives';
import { TeacherSegmentedTabs } from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import { levelName, useClassInfo } from '@/features/teacher/use-class-info';

export type ClassHubTab =
  | 'overview'
  | 'attendance'
  | 'homeworks'
  | 'resources'
  | 'exams'
  | 'results'
  | 'students';

const TAB_KEYS: { tab: ClassHubTab; labelKey: string; icon: string }[] = [
  { tab: 'overview', labelKey: 'nav.overview', icon: '🏠' },
  { tab: 'attendance', labelKey: 'nav.attendance', icon: '🗓️' },
  { tab: 'homeworks', labelKey: 'nav.homework', icon: '📝' },
  { tab: 'resources', labelKey: 'nav.teacherResources', icon: '📚' },
  { tab: 'exams', labelKey: 'nav.exams', icon: '📋' },
  { tab: 'results', labelKey: 'nav.results', icon: '📊' },
  { tab: 'students', labelKey: 'nav.students', icon: '🎓' },
];

function tabHref(classId: number, tab: ClassHubTab): string {
  const base = `/teacher/classes/${classId}`;
  switch (tab) {
    case 'overview':
      return base;
    case 'attendance':
      return `/teacher/attendance?class=${classId}`;
    case 'homeworks':
      return `${base}/homeworks`;
    case 'resources':
      return `${base}/resources`;
    case 'exams':
      return `${base}/exams`;
    case 'results':
      return `${base}/exam-results`;
    case 'students':
      return `${base}/students`;
  }
}

function detectActiveTab(pathname: string, classId: number): ClassHubTab {
  const base = `/teacher/classes/${classId}`;
  if (pathname === `${base}/homeworks`) return 'homeworks';
  if (pathname === `${base}/resources`) return 'resources';
  if (pathname === `${base}/exams`) return 'exams';
  if (pathname === `${base}/exam-results`) return 'results';
  if (pathname === `${base}/students` || pathname.startsWith(`${base}/students/`)) return 'students';
  if (pathname === base) return 'overview';
  return 'overview';
}

function statusLabel(t: ReturnType<typeof useT>, status: string): string {
  const key = `states.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function ClassHubShell({
  classId,
  activeTab,
  title,
  actions,
  children,
}: {
  classId: number;
  activeTab?: ClassHubTab;
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const { info } = useClassInfo(classId);

  const detected = detectActiveTab(pathname, classId);
  const current = activeTab ?? detected;
  const lvl = info ? levelName(info.level) : undefined;
  const className = info?.name ?? t('nav.myClasses');
  const showSectionTitle = title && title !== className;

  const tabs = TAB_KEYS.map(({ tab, labelKey, icon }) => ({
    key: tab,
    label: t(labelKey),
    icon,
    href: tabHref(classId, tab),
  }));

  return (
    <div className="class-hub">
      <Link href="/teacher/classes" className="class-hub__back">
        ‹ {t('academic.backToClasses')}
      </Link>

      <header className="class-hub__header">
        <div className="class-hub__header-pattern" aria-hidden="true" />
        <div className="class-hub__identity">
          <div className="class-hub__title-row">
            <h1>{className}</h1>
            {info?.status && (
              <Badge tone={info.status === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, info.status)}
              </Badge>
            )}
          </div>
          {showSectionTitle && <p className="class-hub__section-title">{title}</p>}
          <div className="class-hub__meta">
            {lvl && <Badge tone="slate">{lvl}</Badge>}
            {typeof info?.student_count === 'number' && (
              <span className="class-hub__stat">
                {t('academic.pupilCount', { count: info.student_count })}
              </span>
            )}
          </div>
        </div>
        <div className="class-hub__header-actions">
          {actions ?? (
            <Link className="btn btn--primary btn--sm" href={`/teacher/attendance?class=${classId}`}>
              {t('academic.takeAttendance')}
            </Link>
          )}
        </div>
      </header>

      <TeacherSegmentedTabs
        items={tabs}
        activeKey={current}
        ariaLabel={t('teacher.classHubNav')}
      />

      <div className="class-hub__body">{children}</div>
    </div>
  );
}
