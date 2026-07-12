/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Shared presentation for standalone numeric units (amounts, phones, codes, dates).
 * Does not format values — wraps already-formatted content with nowrap + LTR isolation.
 */

import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type NumericTextVariant = 'numeric' | 'money' | 'identifier' | 'phone' | 'date';

const VARIANT_CLASS: Record<NumericTextVariant, string> = {
  numeric: 'numeric-text',
  money: 'numeric-text money-text finance-amount mono',
  identifier: 'numeric-text identifier-text mono',
  phone: 'numeric-text phone-text',
  date: 'numeric-text date-text',
};

export type NumericTextProps = {
  children: ReactNode;
  variant?: NumericTextVariant;
  className?: string;
  /** Dense lists only — full value remains available via title / native tooltip. */
  truncate?: boolean;
  title?: string;
  as?: ElementType;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'title'>;

export function NumericText({
  children,
  variant = 'numeric',
  className,
  truncate = false,
  title,
  as: Comp = 'bdi',
  ...rest
}: NumericTextProps) {
  const resolvedTitle =
    title ??
    (truncate && (typeof children === 'string' || typeof children === 'number')
      ? String(children)
      : undefined);

  return (
    <Comp
      {...rest}
      className={cn(VARIANT_CLASS[variant], truncate && 'numeric-text--truncate', className)}
      dir="ltr"
      title={resolvedTitle}
    >
      {children}
    </Comp>
  );
}

export function MoneyText(props: Omit<NumericTextProps, 'variant'>) {
  return <NumericText variant="money" {...props} />;
}

export function IdentifierText(props: Omit<NumericTextProps, 'variant'>) {
  return <NumericText variant="identifier" {...props} />;
}

export function PhoneText(props: Omit<NumericTextProps, 'variant'>) {
  return <NumericText variant="phone" {...props} />;
}

export function DateText(props: Omit<NumericTextProps, 'variant'>) {
  return <NumericText variant="date" {...props} />;
}
