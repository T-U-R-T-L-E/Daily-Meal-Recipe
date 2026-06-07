import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught exception in component sub-tree:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // Purges local caches to resolve any bad state and reboots standard index route
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Local storage sandbox restrictions safety
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-graphite/40 border border-white/5 rounded-[40px] p-8 md:p-10 space-y-6 text-center shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-serif text-white italic tracking-tight">System Exhaustion Isolated</h1>
              <p className="text-xs text-white/50 leading-relaxed">
                An unexpected interface rendering exception was successfully intercepted. The system isolated this thread to protect your session.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[9px] text-white/40 text-left overflow-auto max-h-32 scrollbar-thin">
                <span className="text-rose-400 font-bold block mb-1">Diagnostic Fault:</span>
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-amber-accent text-black hover:bg-white active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest rounded-2xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-accent/15"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset & Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
