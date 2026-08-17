import { useCallback, useEffect, useState } from 'react';
import * as repo from '@/repositories/financialRepository';
import type { Earning, DailyBusinessStatus } from '@/types';
import { subscribeData } from '@/lib/dataEvents';

export function useEarnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [statuses, setStatuses] = useState<DailyBusinessStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([repo.getAllEarnings(), repo.getAllDailyStatuses()]);
      setEarnings(e);
      setStatuses(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    // First load
    load();

    // Auto-refresh whenever any local mutation signals a data change.
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { earnings, statuses, loading, reload: load };
}