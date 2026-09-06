type Tone = 'red' | 'amber' | 'green' | 'blue' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  red: 'bg-signal-redDim text-signal-red',
  amber: 'bg-signal-amberDim text-signal-amber',
  green: 'bg-signal-greenDim text-signal-green',
  blue: 'bg-signal-blueDim text-signal-blue',
  neutral: 'bg-line text-slate-muted',
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12.5px] font-medium ${TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
