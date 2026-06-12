import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function base({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ) });
}

export function IconChevronDown(props: IconProps) {
  return base({ ...props, children: <path d="m6 9 6 6 6-6" /> });
}

export function IconLayers(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </>
  ) });
}

export function IconBookOpen(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </>
  ) });
}

export function IconGraduationCap(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.084a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5" />
    </>
  ) });
}

export function IconUsers(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ) });
}

export function IconClipboard(props: IconProps) {
  return base({ ...props, children: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ) });
}

export function IconCheckCircle(props: IconProps) {
  return base({ ...props, children: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ) });
}

export function IconAlertTriangle(props: IconProps) {
  return base({ ...props, children: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ) });
}

export function IconBuilding(props: IconProps) {
  return base({ ...props, children: (
    <>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </>
  ) });
}

export function IconCircle(props: IconProps) {
  return base({ ...props, children: <circle cx="12" cy="12" r="10" /> });
}

export function IconLock(props: IconProps) {
  return base({ ...props, children: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ) });
}

export const JOURNEY_STEP_ICONS = {
  levels: IconLayers,
  classes: IconBuilding,
  subjects: IconBookOpen,
  teachers: IconGraduationCap,
  staff: IconUsers,
  assignments: IconClipboard,
  review: IconCheckCircle,
} as const;
