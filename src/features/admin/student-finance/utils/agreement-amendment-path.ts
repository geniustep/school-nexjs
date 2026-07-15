import type {
  AgreementAmendmentOperationType,
  AgreementAmendmentPath,
} from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';
import {
  isLineSelectableForAmountAmendment,
  isLineSelectableForPeriodAmendment,
  lineSupportsAdjustLineAmount,
  lineSupportsPeriodAmendment,
} from './agreement-amendment-line-eligibility';

export function resolveAvailableAmendmentPaths(
  line: AgreementAmendmentLineOption | null | undefined,
  operationType: AgreementAmendmentOperationType,
): AgreementAmendmentPath[] {
  if (!line) return [];
  const paths: AgreementAmendmentPath[] = [];

  if (operationType === 'modify_line' && lineSupportsAdjustLineAmount(line)) {
    paths.push('adjust_amount');
  }
  if (
    (operationType === 'modify_line' || operationType === 'cancel_line') &&
    lineSupportsPeriodAmendment(line)
  ) {
    paths.push('period_range');
  }

  return paths;
}

export function resolveDefaultAmendmentPath(
  line: AgreementAmendmentLineOption | null | undefined,
  operationType: AgreementAmendmentOperationType,
): AgreementAmendmentPath | '' {
  const paths = resolveAvailableAmendmentPaths(line, operationType);
  if (paths.length === 1) return paths[0]!;
  return '';
}

export function isLineSelectableForAmendmentOperation(
  line: AgreementAmendmentLineOption,
  operationType: AgreementAmendmentOperationType,
): boolean {
  if (operationType === 'add_line') return true;
  if (operationType === 'cancel_line') return isLineSelectableForPeriodAmendment(line);
  if (operationType === 'modify_line') {
    return isLineSelectableForPeriodAmendment(line) || isLineSelectableForAmountAmendment(line);
  }
  if (operationType === 'adjust_line_amount') {
    return isLineSelectableForAmountAmendment(line);
  }
  return false;
}

export function resolvePayloadOperationType(
  operationType: AgreementAmendmentOperationType,
  amendmentPath: AgreementAmendmentPath | '',
): AgreementAmendmentOperationType {
  if (operationType === 'modify_line' && amendmentPath === 'adjust_amount') {
    return 'adjust_line_amount';
  }
  return operationType;
}

export function computeAmountAdjustmentDelta(
  currentAmount: number | null | undefined,
  newAmountRaw: string,
): { diff: number | null; kind: 'decrease' | 'increase' | 'none' | 'invalid' } {
  if (currentAmount == null || !Number.isFinite(currentAmount)) {
    return { diff: null, kind: 'invalid' };
  }
  const next = Number(newAmountRaw);
  if (!Number.isFinite(next)) return { diff: null, kind: 'invalid' };
  const diff = next - currentAmount;
  if (diff === 0) return { diff: 0, kind: 'none' };
  return { diff, kind: diff < 0 ? 'decrease' : 'increase' };
}
