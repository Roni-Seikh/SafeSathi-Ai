import { useCallback, useEffect, useState } from 'react';
import { getIntelligence } from '@/services/intelligence.service';
import { getApiErrorMessage } from '@/services/apiClient';
import type { Intelligence } from '@/types/intelligence';

export function useIntelligence(days: number, pollMs = 60000) {
  const [data, setData] = useState<Intelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await getIntelligence(days)); setError(null); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { if (!silent) setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => void load(true), pollMs); return () => clearInterval(t); }, [load, pollMs]);
  return { data, error, loading, reload: () => load() };
}
