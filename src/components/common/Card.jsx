export default function Card({ title, subtitle, actions, children }) {
  return (
    <div className="surface overflow-hidden">
      {(title || actions) && (
        <div className="border-b border-border/50 bg-card/70 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {title ? (
                <div className="text-sm font-semibold text-card-foreground">{title}</div>
              ) : null}
              {subtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
