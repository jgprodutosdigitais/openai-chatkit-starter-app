import type { VercelRequest, VercelResponse } from "@vercel/node";

type CreateSessionBody = {
  workflow?: { id?: string; version?: string | number };
  user?: { id?: string; name?: string } | string;
};

function readEnvString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function coerceVersionToString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const apiKey = readEnvString(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    const body = (req.body ?? {}) as CreateSessionBody;

    const workflowId =
      readEnvString(body.workflow?.id) ||
      readEnvString(process.env.OPENAI_WORKFLOW_ID) ||
      readEnvString(process.env.VITE_CHATKIT_WORKFLOW_ID);

    if (!workflowId) {
      res.status(400).json({
        error:
          "Missing required field 'workflow.id'. Send it in POST body: { workflow: { id: 'wf_...' } }",
      });
      return;
    }

    const workflowVersion =
      coerceVersionToString(body.workflow?.version) ||
      readEnvString(process.env.OPENAI_WORKFLOW_VERSION) ||
      readEnvString(process.env.VITE_CHATKIT_WORKFLOW_VERSION);

    // Accept empty body: generate a stable-ish user id from request headers
    const inferredId =
      readEnvString(req.headers["x-forwarded-for"]) ||
      readEnvString(req.headers["x-real-ip"]) ||
      "anonymous";

    const userObj =
      typeof body.user === "string"
        ? { id: body.user, name: body.user }
        : {
            id: readEnvString(body.user?.id) || `web_${inferredId}`,
            name: readEnvString(body.user?.name) || "Web User",
          };

    const resp = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        user: userObj,
        workflow: {
          id: workflowId,
          ...(workflowVersion ? { version: workflowVersion } : {}),
        },
      }),
    });

    const data = await resp.json().catch(async () => ({ raw: await resp.text() }));

    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }

    const client_secret =
      (data as any)?.client_secret ?? (data as any)?.clientSecret;

    if (!client_secret) {
      res
        .status(500)
        .json({ error: "Missing client_secret in response", data });
      return;
    }

    res.status(200).json({ client_secret });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
