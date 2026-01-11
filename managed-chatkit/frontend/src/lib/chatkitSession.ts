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

// ===== user id (estável por navegador) =====
function getOrCreateUserId(): string {
  try {
    const key = "chatkit_user_id";
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing;

    const created = `user_${crypto.randomUUID()}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `user_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }
}

// ===== client_secret cache com expiração =====
type CachedSecret = { client_secret: string; created_at: number };

const SECRET_KEY = "chatkit_client_secret_v1";
// ajuste aqui se quiser (em ms). 25 min costuma ser um bom “safe refresh”.
const SECRET_TTL_MS = 25 * 60 * 1000;

function readCachedSecret(): CachedSecret | null {
  try {
    const raw = localStorage.getItem(SECRET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSecret;
    if (!parsed?.client_secret || !parsed?.created_at) return null;
    // expirado
    if (Date.now() - parsed.created_at > SECRET_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSecret(secret: string) {
  try {
    const payload: CachedSecret = { client_secret: secret, created_at: Date.now() };
    localStorage.setItem(SECRET_KEY, JSON.stringify(payload));
  } catch {
    // se localStorage falhar, tudo bem: fica só em memória do runtime
  }
}

function clearCachedSecret() {
  try {
    localStorage.removeItem(SECRET_KEY);
  } catch {}
}

export function createClientSecretFetcher(
  workflow: string,
  endpoint = "/api/create-session"
) {
  return async (_currentSecret: string | null) => {
    // 1) tenta usar cache válido (com TTL)
    const cached = readCachedSecret();
    if (cached?.client_secret) return cached.client_secret;

    // 2) senão, cria/renova
    const user = getOrCreateUserId();

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
      // se der ruim, garante que não ficou lixo cacheado
      clearCachedSecret();
      throw new Error(payload.error ?? "Failed to create session");
    }

    if (!payload.client_secret) {
      clearCachedSecret();
      throw new Error("Missing client secret in response");
    }

    writeCachedSecret(payload.client_secret);
    return payload.client_secret;
  };
}
