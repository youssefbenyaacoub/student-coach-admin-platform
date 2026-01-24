import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="app-container flex min-h-screen items-center justify-center px-4">
      <div className="surface p-6 text-center">
        <div className="text-sm font-semibold text-foreground">Page not found</div>
        <div className="mt-2 text-sm text-muted-foreground">The page you requested does not exist.</div>
        <div className="mt-4">
          <Link className="btn-primary" to="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
