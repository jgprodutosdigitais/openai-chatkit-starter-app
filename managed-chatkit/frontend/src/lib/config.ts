function readEnvString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const CHATKIT_API_URL =
  readEnvString(import.meta.env.VITE_CHATKIT_API_URL) ??
  "https://api.openai.com/v1/chatkit";

// Não dá throw aqui pra não quebrar a tela.
// Se estiver faltando, o componente vai renderizar um aviso.
export const CHATKIT_API_DOMAIN_KEY =
  readEnvString(import.meta.env.VITE_CHATKIT_API_DOMAIN_KEY) ??
  readEnvString(import.meta.env.VITE_CHATKIT_DOMAIN_KEY);
