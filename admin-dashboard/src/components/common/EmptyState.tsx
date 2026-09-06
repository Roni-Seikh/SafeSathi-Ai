interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="font-display text-[15px] font-medium text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-slate-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
