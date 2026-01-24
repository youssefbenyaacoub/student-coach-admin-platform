import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="app-container flex min-h-screen items-center justify-center px-4">
      <div className="surface p-6 text-center">
        <div className="text-sm font-semibold text-foreground">Unauthorized</div>
        <div className="mt-2 text-sm text-muted-foreground">You do not have access to that page.</div>
        <div className="mt-4">
          <Link className="btn-primary" to="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
