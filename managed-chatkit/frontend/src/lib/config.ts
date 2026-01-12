const readEnvString = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// These must be provided in Vercel as env vars (Production!)
export const CHATKIT_API_URL =
  readEnvString(import.meta.env.VITE_CHATKIT_API_URL) ??
  "https://api.openai.com/v1/chatkit";

export const CHATKIT_API_DOMAIN_KEY = readEnvString(
  import.meta.env.VITE_CHATKIT_API_DOMAIN_KEY
);

if (!CHATKIT_API_DOMAIN_KEY) {
  throw new Error(
    "Missing VITE_CHATKIT_API_DOMAIN_KEY. Add it in Vercel Env Vars (Production) and redeploy."
  );
}

if (!CHATKIT_API_URL.startsWith("https://")) {
  throw new Error(
    `Invalid VITE_CHATKIT_API_URL: '${CHATKIT_API_URL}'. It must start with https://`
  );
}
