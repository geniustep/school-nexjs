// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DateText,
  IdentifierText,
  MoneyText,
  NumericText,
  PhoneText,
} from '@/components/ui/numeric-text';
import { StatCard } from '@/components/ui/primitives';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { StudentFinanceMoney } from '@/features/admin/students/components/student-finance-money';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
});

function expectNumericPresentation(el: HTMLElement, options?: { truncate?: boolean }) {
  expect(el.getAttribute('dir')).toBe('ltr');
  expect(el.className).toMatch(/numeric-text|finance-amount/);
  if (options?.truncate) {
    expect(el.className).toContain('numeric-text--truncate');
    expect(el.getAttribute('title')).toBeTruthy();
  }
}

describe('NumericText primitives', () => {
  it('keeps long money, phone, identifier, and year values as LTR isolated units', () => {
    render(
      <div dir="rtl">
        <MoneyText>12 450 000,00 MAD</MoneyText>
        <NumericText>999999999999</NumericText>
        <PhoneText>0612345678</PhoneText>
        <IdentifierText>REC/AHLEN/2026/000001</IdentifierText>
        <IdentifierText>STU/SCHOOL/2026/000145</IdentifierText>
        <DateText>2026-2027</DateText>
      </div>,
    );

    for (const value of [
      '12 450 000,00 MAD',
      '999999999999',
      '0612345678',
      'REC/AHLEN/2026/000001',
      'STU/SCHOOL/2026/000145',
      '2026-2027',
    ]) {
      expectNumericPresentation(screen.getByText(value));
    }
  });

  it('exposes full identifier via title when truncated', () => {
    render(<IdentifierText truncate>REC/AHLEN/2026/000001</IdentifierText>);
    const el = screen.getByText('REC/AHLEN/2026/000001');
    expectNumericPresentation(el, { truncate: true });
    expect(el.getAttribute('title')).toBe('REC/AHLEN/2026/000001');
  });

  it('preserves LTR isolation inside RTL and LTR documents', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
    const { rerender } = render(<PhoneText>0612345678</PhoneText>);
    expect(screen.getByText('0612345678').getAttribute('dir')).toBe('ltr');

    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'fr');
    rerender(<PhoneText>0612345678</PhoneText>);
    expect(screen.getByText('0612345678').getAttribute('dir')).toBe('ltr');
  });
});

describe('FinanceMoney / StudentFinanceMoney presentation', () => {
  it('always keeps finance-amount + dir=ltr even with custom className', () => {
    render(
      <LocaleProvider>
        <FinanceMoney amount={12450000} currency="MAD" className="cheque-details__hero-amount" />
        <StudentFinanceMoney
          amount={12345.67}
          currency={{ name: 'MAD', symbol: 'MAD', position: 'after' }}
          className="custom-amount"
        />
      </LocaleProvider>,
    );

    const moneyNodes = document.querySelectorAll('.finance-amount');
    expect(moneyNodes.length).toBeGreaterThanOrEqual(2);
    moneyNodes.forEach((node) => {
      expect(node.getAttribute('dir')).toBe('ltr');
      expect(node.className).toContain('finance-amount');
      expect(node.textContent).not.toMatch(/[KM]\b/);
    });
  });

  it('renders full MAD amount without abbreviation', () => {
    render(
      <LocaleProvider>
        <div dir="rtl" lang="ar">
          <FinanceMoney amount={12450000} currency="MAD" />
        </div>
      </LocaleProvider>,
    );

    const el = document.querySelector('.finance-amount');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('dir')).toBe('ltr');
    expect(el?.textContent).toMatch(/12[\s\u202f]?450[\s\u202f]?000/);
    expect(el?.textContent).not.toMatch(/12\.45\s*M|12,45\s*M|12\.5M/i);
  });
});

describe('StatCard numeric wrapping', () => {
  it('wraps standalone numeric values but leaves prose free to wrap', () => {
    render(
      <>
        <StatCard label="Count" value={45678} />
        <StatCard label="Subject" value="اللغة العربية" />
      </>,
    );

    const numeric = screen.getByText('45678');
    expect(numeric.tagName.toLowerCase()).toBe('bdi');
    expect(numeric.className).toContain('numeric-text');
    expect(numeric.getAttribute('dir')).toBe('ltr');

    const prose = screen.getByText('اللغة العربية');
    expect(prose.className).not.toContain('numeric-text');
  });
});
