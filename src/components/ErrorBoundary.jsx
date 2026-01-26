import { Component } from 'react'
import Card from './components/common/Card'
import Button from './components/common/Button'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        })

        // Log to error tracking service (e.g., Sentry)
        console.error('Error caught by boundary:', error, errorInfo)

        // Optional: Send to backend
        if (process.env.NODE_ENV === 'production') {
            // fetch('/api/log-error', {
            //   method: 'POST',
            //   body: JSON.stringify({ error: error.toString(), errorInfo })
            // })
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
                    <Card className="max-w-2xl w-full p-8">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400">
                                We're sorry for the inconvenience. The error has been logged and we'll look into it.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                                <p className="font-mono text-sm text-red-800 dark:text-red-300 mb-2">
                                    {this.state.error.toString()}
                                </p>
                                <details className="text-xs text-red-700 dark:text-red-400">
                                    <summary className="cursor-pointer font-medium mb-2">Stack Trace</summary>
                                    <pre className="whitespace-pre-wrap overflow-auto">
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button onClick={this.handleReset} className="flex-1">
                                Try Again
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.location.href = '/'}
                                className="flex-1"
                            >
                                Go Home
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
