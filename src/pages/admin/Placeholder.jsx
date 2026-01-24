export default function Placeholder({ title, message }) {
  return (
    <div className="surface p-6">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{message}</div>
    </div>
  )
}
