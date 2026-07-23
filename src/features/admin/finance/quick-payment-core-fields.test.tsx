/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickPaymentCoreFields } from '@/features/admin/finance/quick-payment-core-fields';
import { collectionReferenceLabel } from '@/features/admin/finance/collection-allocation-summary';
import type { PaymentJournal } from '@/types/finance';
import type { CollectionChequeFieldValues } from '@/features/admin/finance/collection-cheque-fields';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

const emptyCheque: CollectionChequeFieldValues = {
  chequeNumber: '',
  chequeBank: '',
  chequeHolder: '',
  chequeWrittenDate: '2026-07-23',
  chequePostdated: false,
  chequeDueDate: '',
  chequeNotes: '',
  chequeBranch: '',
};

const multiMethodBankJournal: PaymentJournal = {
  id: 10,
  name: 'Bank',
  code: 'BNK1',
  type: 'bank',
  allowed_payment_methods: [{ code: 'bank_transfer' }, { code: 'cheque' }],
};

const singleCashJournal: PaymentJournal = {
  id: 1,
  name: 'Cash',
  code: 'CASH',
  type: 'cash',
  allowed_payment_methods: [{ code: 'cash' }],
};

function renderCore(
  overrides: Partial<React.ComponentProps<typeof QuickPaymentCoreFields>> = {},
) {
  const onPaymentMethodChange = vi.fn();
  const onReferenceChange = vi.fn();
  const onChequeChange = vi.fn();
  const props: React.ComponentProps<typeof QuickPaymentCoreFields> = {
    amount: '100',
    onAmountChange: vi.fn(),
    journalId: '10',
    onJournalChange: vi.fn(),
    journals: [multiMethodBankJournal],
    selectedJournal: multiMethodBankJournal,
    paymentMethod: 'bank_transfer',
    onPaymentMethodChange,
    allowedMethods: [{ code: 'bank_transfer' }, { code: 'cheque' }],
    collectionDate: '2026-07-23',
    onCollectionDateChange: vi.fn(),
    reference: '',
    onReferenceChange,
    chequeValues: emptyCheque,
    onChequeChange,
    notes: '',
    onNotesChange: vi.fn(),
    ...overrides,
  };
  const view = render(<QuickPaymentCoreFields {...props} />);
  return { ...view, onPaymentMethodChange, onReferenceChange, onChequeChange, props };
}

afterEach(() => cleanup());

describe('collectionReferenceLabel', () => {
  const t = (key: string) => key;

  it('returns bank transfer label and null for cheque/cash', () => {
    expect(collectionReferenceLabel('bank_transfer', t)).toBe(
      'admin.finance.collectionWorkflow.referenceBankTransfer',
    );
    expect(collectionReferenceLabel('cheque', t)).toBeNull();
    expect(collectionReferenceLabel('cash', t)).toBeNull();
  });
});

describe('QuickPaymentCoreFields field order and method-specific UX', () => {
  it('keeps payment method visible outside additional details', () => {
    renderCore();
    const method = screen.getByTestId('quick-payment-method');
    expect(method).toBeTruthy();
    expect(method.closest('.finance-quick-payment-details')).toBeNull();
    expect(method.closest('[data-testid="quick-payment-method-block"]')).toBeTruthy();
  });

  it('shows bank transfer reference after the method control', () => {
    renderCore({ paymentMethod: 'bank_transfer' });
    const core = screen.getByTestId('quick-payment-core');
    const method = screen.getByTestId('quick-payment-method');
    const reference = screen.getByTestId('quick-payment-reference');
    const children = Array.from(core.querySelectorAll('[data-testid]'));
    const methodIndex = children.indexOf(method.closest('[data-testid="quick-payment-method-block"]')!);
    const fieldsIndex = children.indexOf(
      reference.closest('[data-testid="quick-payment-method-fields"]')!,
    );
    expect(methodIndex).toBeGreaterThanOrEqual(0);
    expect(fieldsIndex).toBeGreaterThan(methodIndex);
    expect(reference.hasAttribute('required')).toBe(true);
  });

  it('shows cheque fields below the method select, not above it', () => {
    renderCore({ paymentMethod: 'cheque' });
    const methodBlock = screen.getByTestId('quick-payment-method-block');
    const methodFields = screen.getByTestId('quick-payment-method-fields');
    expect(within(methodFields).getByText('admin.finance.collectionWorkflow.chequeInfoSection')).toBeTruthy();
    expect(screen.queryByTestId('quick-payment-reference')).toBeNull();

    const core = screen.getByTestId('quick-payment-core');
    const order = Array.from(core.children).map((el) => el.getAttribute('data-testid') || el.className);
    const methodPos = order.findIndex((item) => item.includes('quick-payment-method-block') || item.includes('finance-payment-method-block'));
    const fieldsPos = order.findIndex((item) => item.includes('quick-payment-method-fields'));
    expect(methodPos).toBeGreaterThanOrEqual(0);
    expect(fieldsPos).toBeGreaterThan(methodPos);
    expect(within(methodBlock).getByTestId('quick-payment-method')).toBeTruthy();
  });

  it('switches from bank transfer reference to cheque fields when method changes', () => {
    const { rerender, onPaymentMethodChange, props } = renderCore({
      paymentMethod: 'bank_transfer',
    });
    expect(screen.getByTestId('quick-payment-reference')).toBeTruthy();
    expect(screen.queryByText('admin.finance.collectionWorkflow.chequeInfoSection')).toBeNull();

    fireEvent.change(screen.getByTestId('quick-payment-method'), {
      target: { value: 'cheque' },
    });
    expect(onPaymentMethodChange).toHaveBeenCalledWith('cheque');

    rerender(
      <QuickPaymentCoreFields
        {...props}
        paymentMethod="cheque"
        onPaymentMethodChange={onPaymentMethodChange}
      />,
    );
    expect(screen.queryByTestId('quick-payment-reference')).toBeNull();
    expect(screen.getByText('admin.finance.collectionWorkflow.chequeInfoSection')).toBeTruthy();
  });

  it('shows readonly method pill when journal has a single inferred method', () => {
    renderCore({
      journalId: '1',
      journals: [singleCashJournal],
      selectedJournal: singleCashJournal,
      paymentMethod: 'cash',
      allowedMethods: [{ code: 'cash' }],
    });
    expect(screen.getByTestId('quick-payment-method-readonly')).toBeTruthy();
    expect(screen.queryByTestId('quick-payment-method')).toBeNull();
    expect(screen.queryByTestId('quick-payment-reference')).toBeNull();
  });

  it('uses the same method-then-fields order in drawer variant', () => {
    renderCore({ variant: 'drawer', paymentMethod: 'cheque' });
    const core = screen.getByTestId('quick-payment-core');
    const methodBlock = within(core).getByTestId('quick-payment-method-block');
    const methodFields = within(core).getByTestId('quick-payment-method-fields');
    expect(
      methodBlock.compareDocumentPosition(methodFields) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
