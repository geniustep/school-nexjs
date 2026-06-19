'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkStudentIdentifierDuplicate,
  shouldCheckStudentIdentifier,
  type StudentIdentifierCheckStatus,
  type StudentIdentifierQueryField,
} from '../utils/student-identifier-check';

export interface StudentIdentifierFieldCheck {
  status: StudentIdentifierCheckStatus;
}

export interface StudentCreateIdentifierChecks {
  massarCode: StudentIdentifierFieldCheck;
  schoolNumber: StudentIdentifierFieldCheck;
  code: StudentIdentifierFieldCheck;
}

const IDLE_CHECK: StudentIdentifierFieldCheck = { status: 'idle' };

const INITIAL_CHECKS: StudentCreateIdentifierChecks = {
  massarCode: IDLE_CHECK,
  schoolNumber: IDLE_CHECK,
  code: IDLE_CHECK,
};

type CheckKey = keyof StudentCreateIdentifierChecks;

const FIELD_MAP: Record<CheckKey, StudentIdentifierQueryField> = {
  massarCode: 'massar_code',
  schoolNumber: 'school_number',
  code: 'code',
};

function isBlockingStatus(status: StudentIdentifierCheckStatus): boolean {
  return status === 'checking' || status === 'duplicate' || status === 'error';
}

export function useStudentCreateIdentifierChecks(input: {
  massarCode: string;
  schoolNumber: string;
  code: string;
  schoolId: number | null;
  debounceMs?: number;
}) {
  const [checks, setChecks] = useState<StudentCreateIdentifierChecks>(INITIAL_CHECKS);
  const requestSeq = useRef<Record<CheckKey, number>>({
    massarCode: 0,
    schoolNumber: 0,
    code: 0,
  });
  const debounceTimers = useRef<Partial<Record<CheckKey, number>>>({});
  const latestValues = useRef({
    massarCode: input.massarCode,
    schoolNumber: input.schoolNumber,
    code: input.code,
    schoolId: input.schoolId,
  });

  latestValues.current = {
    massarCode: input.massarCode,
    schoolNumber: input.schoolNumber,
    code: input.code,
    schoolId: input.schoolId,
  };

  const runCheck = useCallback(async (key: CheckKey, value: string): Promise<StudentIdentifierFieldCheck> => {
    const trimmed = value.trim();
    if (!shouldCheckStudentIdentifier(trimmed)) {
      return IDLE_CHECK;
    }

    const seq = ++requestSeq.current[key];
    setChecks((prev) => ({ ...prev, [key]: { status: 'checking' } }));

    const result = await checkStudentIdentifierDuplicate(
      FIELD_MAP[key],
      trimmed,
      latestValues.current.schoolId,
    );

    if (seq !== requestSeq.current[key]) {
      return { status: 'checking' };
    }

    const next = { status: result.status };
    setChecks((prev) => ({ ...prev, [key]: next }));
    return next;
  }, []);

  const scheduleCheck = useCallback(
    (key: CheckKey, value: string) => {
      const timer = debounceTimers.current[key];
      if (timer != null) window.clearTimeout(timer);

      const trimmed = value.trim();
      if (!shouldCheckStudentIdentifier(trimmed)) {
        setChecks((prev) => ({ ...prev, [key]: IDLE_CHECK }));
        return;
      }

      debounceTimers.current[key] = window.setTimeout(() => {
        void runCheck(key, trimmed);
      }, input.debounceMs ?? 400);
    },
    [input.debounceMs, runCheck],
  );

  useEffect(() => {
    scheduleCheck('massarCode', input.massarCode);
  }, [input.massarCode, scheduleCheck]);

  useEffect(() => {
    scheduleCheck('schoolNumber', input.schoolNumber);
  }, [input.schoolNumber, scheduleCheck]);

  useEffect(() => {
    scheduleCheck('code', input.code);
  }, [input.code, scheduleCheck]);

  useEffect(
    () => () => {
      for (const timer of Object.values(debounceTimers.current)) {
        if (timer != null) window.clearTimeout(timer);
      }
    },
    [],
  );

  const flushChecks = useCallback(async (): Promise<boolean> => {
    const keys: CheckKey[] = ['massarCode', 'schoolNumber', 'code'];
    for (const key of keys) {
      const timer = debounceTimers.current[key];
      if (timer != null) {
        window.clearTimeout(timer);
        debounceTimers.current[key] = undefined;
      }
    }

    const results = await Promise.all(
      keys.map(async (key) => {
        const value = latestValues.current[key];
        if (!shouldCheckStudentIdentifier(value)) {
          setChecks((prev) => ({ ...prev, [key]: IDLE_CHECK }));
          return true;
        }
        const result = await runCheck(key, value);
        return result.status === 'available' || result.status === 'idle';
      }),
    );

    return results.every(Boolean);
  }, [runCheck]);

  const massarBlocksProgress =
    shouldCheckStudentIdentifier(input.massarCode) &&
    isBlockingStatus(checks.massarCode.status);

  const schoolNumberBlocksProgress =
    shouldCheckStudentIdentifier(input.schoolNumber) &&
    isBlockingStatus(checks.schoolNumber.status);

  const codeBlocksProgress =
    shouldCheckStudentIdentifier(input.code) && isBlockingStatus(checks.code.status);

  return {
    checks,
    flushChecks,
    massarBlocksProgress,
    schoolNumberBlocksProgress,
    codeBlocksProgress,
    identifierChecksBlockProgress:
      massarBlocksProgress || schoolNumberBlocksProgress || codeBlocksProgress,
  };
}
