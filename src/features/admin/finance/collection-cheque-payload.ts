import type { ChequeRegistrationPayload } from '@/types/finance';

export type CollectionChequeFormInput = {
  chequeNumber: string;
  chequeBank: string;
  chequeHolder: string;
  chequeWrittenDate: string;
  chequePostdated: boolean;
  chequeDueDate: string;
  collectionDate: string;
  chequeBranch?: string;
};

/** Backend requires `reference` for cheque collections — mirror cheque number. */
export function resolveChequeCollectionReference(chequeNumber: string): string {
  return chequeNumber.trim();
}

/** Due date: explicit maturity when postdated, otherwise the written cheque date. */
export function resolveChequeDueDate(input: {
  chequeWrittenDate: string;
  chequePostdated: boolean;
  chequeDueDate: string;
}): string {
  if (input.chequePostdated) return input.chequeDueDate.trim();
  return input.chequeWrittenDate.trim();
}

export function buildChequeRegistrationPayload(
  input: CollectionChequeFormInput,
): ChequeRegistrationPayload | null {
  const chequeNumber = input.chequeNumber.trim();
  const bankName = input.chequeBank.trim();
  const holderName = input.chequeHolder.trim();
  const writtenDate = input.chequeWrittenDate.trim();
  const receivedDate = input.collectionDate.trim();
  const dueDate = resolveChequeDueDate({
    chequeWrittenDate: writtenDate,
    chequePostdated: input.chequePostdated,
    chequeDueDate: input.chequeDueDate,
  });

  if (!chequeNumber || !bankName || !holderName || !writtenDate || !receivedDate || !dueDate) {
    return null;
  }
  if (input.chequePostdated && dueDate < writtenDate) {
    return null;
  }
  if (dueDate < receivedDate) {
    return null;
  }

  return {
    cheque_number: chequeNumber,
    bank_name: bankName,
    holder_name: holderName,
    received_date: receivedDate,
    due_date: dueDate,
  };
}
