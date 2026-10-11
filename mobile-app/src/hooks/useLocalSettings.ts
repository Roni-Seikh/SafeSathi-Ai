import { useEffect, useState } from 'react';
import { DEFAULT_LOCAL, LocalSettings, loadLocalSettings, subscribeLocalSettings } from '../services/localSettings';

export function useLocalSettings(): LocalSettings {
  const [s, setS] = useState<LocalSettings>(DEFAULT_LOCAL);
  useEffect(() => {
    let alive = true;
    void loadLocalSettings().then((v) => alive && setS(v));
    const unsub = subscribeLocalSettings((v) => alive && setS(v));
    return () => { alive = false; unsub(); };
  }, []);
  return s;
}
