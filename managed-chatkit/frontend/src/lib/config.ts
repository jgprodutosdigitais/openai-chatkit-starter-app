function readEnvString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// URL base do ChatKit API (padrão oficial)
export const CHATKIT_API_URL =
  readEnvString(import.meta.env.VITE_CHATKIT_API_URL) ??
  "https://api.openai.com/v1/chatkit";

// Domain Key (obrigatório para hosted domain verification no browser)
export const CHATKIT_API_DOMAIN_KEY = (() => {
  const key =
    readEnvString(import.meta.env.VITE_CHATKIT_API_DOMAIN_KEY) ??
    readEnvString(import.meta.env.VITE_CHATKIT_DOMAIN_KEY);

  // não vou "chutar" nome de env; então aceito os 2 mais comuns
  if (!key) {
    throw new Error(
      "Set VITE_CHATKIT_API_DOMAIN_KEY (or VITE_CHATKIT_DOMAIN_KEY) in your env."
    );
  }
  return key;
})();
