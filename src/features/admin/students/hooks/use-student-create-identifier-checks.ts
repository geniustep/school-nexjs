'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkStudentIdentifierDuplicate,
  identifierFieldBlocksProgress,
  INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
  IDLE_IDENTIFIER_CHECK,
  shouldCheckStudentIdentifier,
  studentCreateIdentifierChecksBlockProgress,
  type StudentCreateIdentifierChecks,
  type StudentIdentifierCheckStatus,
  type StudentIdentifierFieldCheck,
  type StudentIdentifierQueryField,
} from '../utils/student-identifier-check';

export type { StudentCreateIdentifierChecks, StudentIdentifierFieldCheck };

export interface FlushStudentCreateIdentifierChecksResult {
  ok: boolean;
  checks: StudentCreateIdentifierChecks;
}

type CheckKey = keyof StudentCreateIdentifierChecks;

const FIELD_MAP: Record<CheckKey, StudentIdentifierQueryField> = {
  massarCode: 'massar_code',
  schoolNumber: 'school_number',
  code: 'code',
};

function isFieldCheckClear(value: string, check: StudentIdentifierFieldCheck): boolean {
  if (!shouldCheckStudentIdentifier(value)) return true;
  return check.status === 'available';
}

export function useStudentCreateIdentifierChecks(input: {
  massarCode: string;
  schoolNumber: string;
  code: string;
  schoolId: number | null;
  debounceMs?: number;
}) {
  const [checks, setChecks] = useState<StudentCreateIdentifierChecks>(
    INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
  );
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
      return IDLE_IDENTIFIER_CHECK;
    }

    const seq = ++requestSeq.current[key];
    setChecks((prev) => ({ ...prev, [key]: { status: 'checking' } }));

    const result = await checkStudentIdentifierDuplicate(
      FIELD_MAP[key],
      trimmed,
      latestValues.current.schoolId,
    );

    if (seq !== requestSeq.current[key]) {
      return { status: 'checking' as StudentIdentifierCheckStatus };
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
        setChecks((prev) => ({ ...prev, [key]: IDLE_IDENTIFIER_CHECK }));
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

  const flushChecks = useCallback(async (): Promise<FlushStudentCreateIdentifierChecksResult> => {
    const keys: CheckKey[] = ['massarCode', 'schoolNumber', 'code'];
    for (const key of keys) {
      const timer = debounceTimers.current[key];
      if (timer != null) {
        window.clearTimeout(timer);
        debounceTimers.current[key] = undefined;
      }
      requestSeq.current[key] += 1;
    }

    const nextChecks: StudentCreateIdentifierChecks = {
      massarCode: IDLE_IDENTIFIER_CHECK,
      schoolNumber: IDLE_IDENTIFIER_CHECK,
      code: IDLE_IDENTIFIER_CHECK,
    };

    await Promise.all(
      keys.map(async (key) => {
        const value = latestValues.current[key].trim();
        if (!shouldCheckStudentIdentifier(value)) {
          nextChecks[key] = IDLE_IDENTIFIER_CHECK;
          return;
        }

        const result = await checkStudentIdentifierDuplicate(
          FIELD_MAP[key],
          value,
          latestValues.current.schoolId,
        );
        nextChecks[key] = { status: result.status };
      }),
    );

    setChecks(nextChecks);

    const ok = keys.every((key) => isFieldCheckClear(latestValues.current[key], nextChecks[key]));
    return { ok, checks: nextChecks };
  }, []);

  const massarBlocksProgress = identifierFieldBlocksProgress(input.massarCode, checks.massarCode);
  const schoolNumberBlocksProgress = identifierFieldBlocksProgress(
    input.schoolNumber,
    checks.schoolNumber,
  );
  const codeBlocksProgress = identifierFieldBlocksProgress(input.code, checks.code);

  return {
    checks,
    flushChecks,
    massarBlocksProgress,
    schoolNumberBlocksProgress,
    codeBlocksProgress,
    identifierChecksBlockProgress: studentCreateIdentifierChecksBlockProgress({
      massarCode: input.massarCode,
      schoolNumber: input.schoolNumber,
      code: input.code,
      checks,
    }),
  };
}
