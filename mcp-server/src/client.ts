/**
 * Thin HTTP client for the Aelo public API (v1).
 *
 * Auth is a personal API key (Bearer token) the user generates in Aelo under
 * Settings -> API keys. The key is scoped to one workspace and is READ-first:
 * the only write endpoints it can reach are measurement actions (schedule a
 * scan, track a buyer question). It can never spend money or post anything.
 */

const BASE = (process.env.AELO_API_BASE || "https://aelohq.com/api/v1").replace(/\/$/, "");
const KEY = process.env.AELO_API_KEY || "";

export class AeloApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AeloApiError";
  }
}

function assertKey(): void {
  if (!KEY) {
    throw new AeloApiError(
      401,
      "AELO_API_KEY is not set. Generate a read-only key at aelohq.com (Settings -> API keys) and add it to this MCP server's env.",
    );
  }
}

async function request(method: "GET" | "POST", path: string, opts: { query?: Record<string, unknown>; body?: unknown } = {}): Promise<unknown> {
  assertKey();
  const url = new URL(BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "aelo-mcp/0.1",
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new AeloApiError(0, `Could not reach Aelo at ${BASE}. Is AELO_API_BASE correct and the service up? (${(e as Error).message})`);
  }

  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) ||
      `Aelo API ${res.status} on ${method} ${path}`;
    if (res.status === 401) {
      throw new AeloApiError(401, `${msg}. Check that AELO_API_KEY is valid and not revoked.`);
    }
    if (res.status === 402 || res.status === 403) {
      throw new AeloApiError(res.status, `${msg}. This may be gated by your plan; check aelohq.com/pricing.`);
    }
    throw new AeloApiError(res.status, String(msg));
  }
  return data;
}

export const aelo = {
  get: (path: string, query?: Record<string, unknown>) => request("GET", path, { query }),
  post: (path: string, body?: unknown) => request("POST", path, { body }),
};
