'use client';

import { useEffect, useState } from 'react';
import { fetchTeacherDomainContract } from '@/features/admin/teachers/api/teacher-domain-api';
import {
  checkTeacherDomainContract,
  type TeacherDomainContractCheck,
} from '@/features/admin/teachers/utils/teacher-domain-normalize';
import type { ApiContractMetadata } from '@/types/teacher-domain';

let cachedContract: ApiContractMetadata | null = null;
let cachedCheck: TeacherDomainContractCheck | null = null;
let inflight: Promise<void> | null = null;

async function loadContractOnce(): Promise<void> {
  if (cachedContract) return;
  if (!inflight) {
    inflight = fetchTeacherDomainContract()
      .then((res) => {
        if (res.success) {
          cachedContract = res.data;
          cachedCheck = checkTeacherDomainContract(res.data);
        } else {
          cachedCheck = {
            ok: false,
            version: null,
            genericOrm: null,
            missingRequired: ['contract_version'],
            additiveCompatible: false,
          };
        }
      })
      .finally(() => {
        inflight = null;
      });
  }
  await inflight;
}

/** Module-level cache — one contract fetch shared across Teacher Domain screens. */
export function useTeacherDomainContract() {
  const [contract, setContract] = useState<ApiContractMetadata | null>(cachedContract);
  const [check, setCheck] = useState<TeacherDomainContractCheck | null>(cachedCheck);
  const [loading, setLoading] = useState(!cachedContract);

  useEffect(() => {
    let active = true;
    setLoading(!cachedContract);
    void loadContractOnce().then(() => {
      if (!active) return;
      setContract(cachedContract);
      setCheck(cachedCheck);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { contract, check, loading };
}

/** Test helper — clears module cache between cases. */
export function __resetTeacherDomainContractCacheForTests(): void {
  cachedContract = null;
  cachedCheck = null;
  inflight = null;
}
