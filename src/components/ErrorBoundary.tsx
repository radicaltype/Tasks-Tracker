import React, { type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            
            <div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">Something went wrong</h2>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                The application encountered an unexpected issue while loading. You can refresh the view or reset application state.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 bg-neutral-100 rounded-xl text-left text-xs font-mono text-neutral-700 overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
