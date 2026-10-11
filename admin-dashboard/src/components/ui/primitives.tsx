import { useEffect, useRef, useState } from 'react';

/** Counts up to `value` with an ease-out curve whenever it changes. */
export function AnimatedNumber({ value, decimals = 0, suffix = '', duration = 900 }: { value: number; decimals?: number; suffix?: string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

/** Tiny inline trend line with a gradient fill. */
export function Sparkline({ data, color = '#5B6CFF', width = 96, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const id = `sp${color.replace('#', '')}${data.length}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="2.6" fill={color} />
    </svg>
  );
}

export function PulseDot({ color = '#D6402F', size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="absolute inset-0 animate-ping-soft rounded-full" style={{ backgroundColor: color }} />
      <span className="relative rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
    </span>
  );
}

/** Half-circle risk gauge with animated needle sweep. */
export function RiskGauge({ score, level }: { score: number; level: 'low' | 'elevated' | 'high' }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(score), 120); return () => clearTimeout(t); }, [score]);
  const R = 78, C = Math.PI * R;
  const color = level === 'high' ? '#D6402F' : level === 'elevated' ? '#C97A1F' : '#1F8A57';
  const angle = -90 + (v / 100) * 180;
  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[260px]" role="img" aria-label={`Risk index ${score} of 100, ${level}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1"><stop offset="0" stopColor="#1F8A57" /><stop offset=".55" stopColor="#C97A1F" /><stop offset="1" stopColor="#D6402F" /></linearGradient>
      </defs>
      <path d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`} fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (v / 100) * C} style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)' }} />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 1.3s cubic-bezier(.2,.8,.2,1)' }}>
        <line x1="100" y1="100" x2="100" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill={color} />
      </g>
      <text x="100" y="86" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--ink)" fontFamily="Space Grotesk">{Math.round(v)}</text>
    </svg>
  );
}

/** Weekday × hour intensity grid with hover tooltip. */
export function HeatGrid({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [tip, setTip] = useState<string | null>(null);
  const fmtH = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: '34px repeat(24, minmax(0, 1fr))' }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => <div key={h} className="text-center text-[9.5px] text-slate-muted">{h % 3 === 0 ? fmtH(h) : ''}</div>)}
        {matrix.map((row, d) => (
          <div key={d} className="contents">
            <div className="pr-1 text-right text-[11px] leading-[18px] text-slate-muted">{days[d]}</div>
            {row.map((n, h) => {
              const a = n / max;
              return (
                <div
                  key={h}
                  onMouseEnter={() => setTip(`${days[d]} ${fmtH(h)}–${fmtH((h + 1) % 24)} · ${n} SOS`)}
                  onMouseLeave={() => setTip(null)}
                  className="h-[18px] rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-150"
                  style={{ backgroundColor: n === 0 ? 'var(--grid-cell-0)' : `rgba(214,64,47,${0.18 + a * 0.82})` }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 h-4 text-[12px] text-slate-muted">{tip ?? 'Hover a cell to see the count · IST'}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
