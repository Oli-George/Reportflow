import { Component, ErrorInfo, ReactNode } from "react"
import { AlertIcon } from "./Icons"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ReportFlow ErrorBoundary caught an unexpected error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] w-full flex items-center justify-center p-6 bg-background text-foreground font-body">
          <div className="w-full max-w-lg rounded-xl border border-red-900/60 bg-card p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
              <AlertIcon className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground">
                {this.props.fallbackTitle || "Something went wrong"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {this.props.fallbackMessage ||
                  "An unexpected error occurred in this view. Your saved drafts and offline queue remain protected."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-md bg-secondary/80 border border-border text-left">
                <p className="text-xs font-mono text-red-300 break-words font-semibold">
                  {this.state.error.message || String(this.state.error)}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2 text-[10px] font-mono text-muted-foreground cursor-pointer">
                    <summary className="hover:text-foreground">View component stack</summary>
                    <pre className="mt-1 p-2 bg-black/40 rounded overflow-x-auto whitespace-pre-wrap max-h-32 text-[10px]">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-mono font-semibold transition-colors shadow cursor-pointer"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
