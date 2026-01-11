const readEnvString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const workflowId = (() => {
  const id = readEnvString(import.meta.env.VITE_CHATKIT_WORKFLOW_ID);
  if (!id || id.startsWith("wf_replace")) {
    throw new Error("Set VITE_CHATKIT_WORKFLOW_ID in your .env file.");
  }
  return id;
})();

const workflowVersion = readEnvString(import.meta.env.VITE_CHATKIT_WORKFLOW_VERSION);

function getOrCreateUserId(): string {
  try {
    const key = "chatkit_user_id";
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing;

    const created = `user_${crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}_${Date.now()}`}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    // fallback (private mode / blocked storage)
    return `user_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }
}

function getClientSecretStorageKey(user: string, workflow: string) {
  // separa por workflow + user (e versão, se existir) pra não misturar
  const v = workflowVersion ? `@v=${workflowVersion}` : "";
  return `chatkit_client_secret:${workflow}:${user}${v}`;
}

export function createClientSecretFetcher(
  workflow: string,
  endpoint = "/api/create-session"
) {
  return async (currentSecret: string | null) => {
    // 1) se já tem na memória, usa
    if (currentSecret) return currentSecret;

    const user = getOrCreateUserId();

    // 2) tenta cache localStorage
    try {
      const storageKey = getClientSecretStorageKey(user, workflow);
      const cached = localStorage.getItem(storageKey);
      if (cached && cached.trim()) return cached;
    } catch {
      // ignora (storage bloqueado)
    }

    // 3) cria nova session no backend
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user,
        workflow: {
          id: workflow,
          ...(workflowVersion ? { version: workflowVersion } : {}),
        },
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      client_secret?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to create session");
    }

    if (!payload.client_secret) {
      throw new Error("Missing client secret in response");
    }

    // 4) salva cache
    try {
      const storageKey = getClientSecretStorageKey(user, workflow);
      localStorage.setItem(storageKey, payload.client_secret);
    } catch {
      // ignora
    }

    return payload.client_secret;
  };
}
