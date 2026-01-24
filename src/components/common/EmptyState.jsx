export default function EmptyState({ title = 'No results', message, action }) {
  return (
    <div className="surface flex flex-col items-center justify-center p-8 text-center">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {message ? <div className="mt-1 max-w-md text-sm text-muted-foreground">{message}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
