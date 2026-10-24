export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: "primary" | "success" | "highlight" | "destructive"
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    highlight: "bg-highlight/20 text-highlight-foreground dark:text-highlight",
    destructive: "bg-destructive/10 text-destructive",
  }
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold md:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
