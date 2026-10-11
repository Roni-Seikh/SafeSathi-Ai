import { useEffect, useState } from 'react';

/**
 * Duress mode: the user entered the DURESS PIN, so the UI pretends the SOS was cancelled while the server keeps it
 * active and the phone silently keeps recording evidence + sharing location. In-memory on purpose (a restarted app
 * simply shows the real active SOS again — the safe failure).
 */
let flag = false;
const subs = new Set<() => void>();
export const duress = {
  get: () => flag,
  set(v: boolean) { if (flag !== v) { flag = v; subs.forEach((s) => s()); } },
  subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; },
};
export function useDuress(): boolean {
  const [v, setV] = useState(duress.get());
  useEffect(() => duress.subscribe(() => setV(duress.get())), []);
  return v;
}
