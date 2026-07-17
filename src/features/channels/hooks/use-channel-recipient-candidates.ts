'use client';

import { useEffect, useState } from 'react';
import type { ApiErrorBody } from '@/types/api';
import type { ChannelRecipientCandidatesPayload } from '@/types/channel-recipient-candidates';
import { fetchChannelRecipientCandidates } from '../utils/fetch-channel-recipient-candidates';

export function useChannelRecipientCandidates(studentId: number | null) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ChannelRecipientCandidatesPayload | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  useEffect(() => {
    if (studentId == null || !Number.isInteger(studentId) || studentId <= 0) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setData(null);

    fetchChannelRecipientCandidates(studentId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setData(null);
        setError(result.error);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [studentId]);

  return { loading, data, error };
}
