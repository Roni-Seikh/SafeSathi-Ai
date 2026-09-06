interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'red' | 'amber';
}

const TONE_VALUE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-ink-900',
  red: 'text-signal-red',
  amber: 'text-signal-amber',
};

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="panel flex flex-col gap-1.5 p-4">
      <p className="text-[13px] text-slate-muted">{label}</p>
      <p className={`font-display text-[28px] font-semibold leading-none ${TONE_VALUE_CLASSES[tone]}`}>
        {value}
      </p>
      {hint && <p className="text-[12.5px] text-slate-muted">{hint}</p>}
    </div>
  );
}
