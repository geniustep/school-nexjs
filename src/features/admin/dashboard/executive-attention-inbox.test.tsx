// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LocaleProvider } from '@/features/i18n/locale-context';
import {
  ExecutiveDecisionList,
  ExecutivePanel,
  normalizeExecutiveInterventionLabel,
  type ExecutiveInterventionItemData,
} from '@/features/admin/dashboard/executive-dashboard-ui';

afterEach(cleanup);

const items: ExecutiveInterventionItemData[] = [
  {
    id: 'billing',
    label: '21 حسابًا تحتاج اتصال تحصيل',
    hint: 'عرض الحسابات',
    href: '/admin/finance/billing-accounts',
    icon: '⚠️',
    tone: 'amber',
  },
  {
    id: 'admissions',
    label: '4 طلبات تحتاج متابعة',
    hint: 'متابعة الطلبات',
    href: '/admin/admissions',
    icon: '⚠️',
    tone: 'amber',
  },
  {
    id: 'guardian',
    label: '69 تلميذًا بدون ولي مرتبط',
    hint: 'عرض التلاميذ',
    href: '/admin/students',
    icon: 'ℹ️',
  },
  {
    id: 'fourth',
    label: 'أولوية رابعة',
    href: '/admin/classes',
  },
];

describe('director attention inbox', () => {
  it('uses compact Arabic copy and moves overflow priorities into a drawer', () => {
    render(
      <LocaleProvider>
        <ExecutivePanel
          variant="attention"
          title="ما الذي يحتاج تدخلي؟"
          description="قرارات ومتابعات عاجلة — انقر للانتقال."
          footer={<span>4 عنصر(ات) تحتاج متابعة</span>}
          className="exec-decision-panel exec-decision-panel--active"
        >
          <p className="exec-decision-panel__lead">أولوياتك اليوم — ابدأ من هنا</p>
          <ExecutiveDecisionList
            items={items}
            emptyTitle="لا توجد تنبيهات تنفيذية حاليًا"
          />
        </ExecutivePanel>
      </LocaleProvider>,
    );

    expect(screen.getByRole('heading', { name: 'أولويات اليوم' })).toBeTruthy();
    expect(screen.queryByText('قرارات ومتابعات عاجلة — انقر للانتقال.')).toBeNull();
    expect(screen.queryByText('4 عنصر(ات) تحتاج متابعة')).toBeNull();
    expect(screen.getByText('21 حسابًا بحاجة إلى متابعة التحصيل')).toBeTruthy();
    expect(screen.getByText('4 طلبات تسجيل بحاجة إلى متابعة')).toBeTruthy();
    expect(screen.getByText('69 تلميذًا دون ولي أمر مرتبط')).toBeTruthy();
    expect(screen.queryByText('أولوية رابعة')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'عرض الكل (4)' }));

    const dialog = screen.getByRole('dialog', { name: 'كل الأولويات' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(4);
    expect(within(dialog).getByText('أولوية رابعة')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('dialog', { name: 'كل الأولويات' })).toBeNull();
  });

  it('keeps label normalization presentation-only and locale-aware', () => {
    expect(normalizeExecutiveInterventionLabel('21 حسابًا تحتاج اتصال تحصيل', 'ar')).toBe(
      '21 حسابًا بحاجة إلى متابعة التحصيل',
    );
    expect(normalizeExecutiveInterventionLabel('21 accounts need collection follow-up', 'en')).toBe(
      '21 accounts need collection follow-up',
    );
  });
});
