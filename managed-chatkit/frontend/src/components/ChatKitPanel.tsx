import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CHATKIT_API_DOMAIN_KEY, CHATKIT_API_URL } from "../lib/config";

function looksLikeAuthOrDomainError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? "");
  return /401|unauthorized|invalid_api_key|domain verification|verify_hosted|forbidden/i.test(
    msg
  );
}

export function ChatKitPanel() {
  const [resetCounter, setResetCounter] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const resetChat = useCallback((reason?: string) => {
    if (reason) setLastError(reason);
    setResetCounter((c) => c + 1);
  }, []);

  // Force a fresh ChatKit init by varying the api url (cache-buster).
  const apiUrl = useMemo(() => {
    const sep = CHATKIT_API_URL.includes("?") ? "&" : "?";
    return `${CHATKIT_API_URL}${sep}ck=${resetCounter}`;
  }, [resetCounter]);

  const chatkit = useChatKit({
  api: {
    async getClientSecret(existingClientSecret) {
      // Se já existir um, reutiliza (evita criar sessão nova o tempo todo)
      if (existingClientSecret) return existingClientSecret;

      const res = await fetch("/api/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`create-session failed: ${res.status} ${text}`);
      }

      const data = await res.json();

      // Aceita os 2 formatos mais comuns de retorno
      return data.client_secret ?? data.clientSecret;
    },
  },
  composer: {
    attachments: { enabled: false },
  },
});

  // 1) When coming back to the tab/iframe, re-init (prevents "white screen after a while").
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        resetChat(null);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [resetChat]);

  // 2) Catch unhandled promise rejections (common with domain verification failures).
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (looksLikeAuthOrDomainError(reason)) {
        resetChat(String((reason as any)?.message ?? reason ?? "Auth error"));
      }
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [resetChat]);

  // 3) If the hook exposes an error field, react to it (safe optional access).
  useEffect(() => {
    const possibleError =
      (chatkit as any)?.error ??
      (chatkit as any)?.state?.error ??
      (chatkit as any)?.control?.error;

    if (!possibleError) return;

    if (looksLikeAuthOrDomainError(possibleError)) {
      resetChat(String((possibleError as any)?.message ?? possibleError));
    }
  }, [chatkit, resetChat]);

  return (
    <div className="relative pb-8 flex h-[90vh] w-full rounded-2xl flex-col overflow-hidden bg-white shadow-sm transition-colors dark:bg-slate-900">
      {lastError ? (
        <div className="absolute left-3 right-3 top-3 z-10 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">Conexão reiniciada</div>
              <div className="mt-1 break-words opacity-90">{lastError}</div>
              <div className="mt-2 opacity-80">
                Se isso acontecer em embed, quase sempre é expiração de sessão ou
                verificação de domínio.
              </div>
            </div>

            <button
              type="button"
              onClick={() => resetChat(null)}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Reconectar
            </button>
          </div>
        </div>
      ) : null}

      {/* Key forces a full remount when resetCounter changes */}
      <ChatKit
        key={`chatkit_${resetCounter}`}
        control={chatkit.control}
        className="block h-full w-full"
      />
    </div>
  );
}
