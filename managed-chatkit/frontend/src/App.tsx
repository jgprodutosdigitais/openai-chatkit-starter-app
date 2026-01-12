import React from "react";
import { ChatKitPanel } from "./components/ChatKitPanel";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: any }
> {
  state: { error?: any } = {};

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("APP_CRASH:", error);
    console.error("APP_CRASH_INFO:", info);
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message ?? this.state.error ?? "Unknown error");
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <div className="text-lg font-semibold">Deu erro ao carregar o chat</div>
            <div className="mt-2 text-sm opacity-80">
              Isso evita “tela branca” e mostra o motivo real.
            </div>
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-100 p-4 text-xs text-slate-900 dark:bg-slate-950 dark:text-slate-100">
              {msg}
            </pre>
            <div className="mt-4 text-xs opacity-70">
              Abra o Console do DevTools e procure por <b>APP_CRASH</b>.
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-end bg-slate-100 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl">
          {this.props.children}
        </div>
      </main>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ChatKitPanel />
    </ErrorBoundary>
  );
}
