import { useEffect, useState } from 'react';
import { listSOS } from '@/services/sos.service';

/** One shared poll for "how many SOS are active right now" — used by the sidebar badge and the topbar bell. */
let count = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subs = new Set<(n: number) => void>();

async function poll() {
  try {
    const res = await listSOS({ page: 1, limit: 1, status: 'active' });
    if (res.meta.total !== count) { count = res.meta.total; subs.forEach((s) => s(count)); }
  } catch { /* keep last value */ }
}

export function useActiveSOSCount(): number {
  const [n, setN] = useState(count);
  useEffect(() => {
    subs.add(setN);
    if (subs.size === 1) { void poll(); timer = setInterval(() => void poll(), 15000); }
    return () => { subs.delete(setN); if (subs.size === 0 && timer) { clearInterval(timer); timer = undefined; } };
  }, []);
  return n;
}
