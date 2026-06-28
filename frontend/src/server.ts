import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const BACKEND_ORIGIN_ENV_KEYS = [
  "BACKEND_ORIGIN",
  "API_PROXY_TARGET",
  "VITE_BACKEND_ORIGIN",
  "VITE_API_BASE_URL",
];
const TEMP_BACKEND_ORIGIN =
  "https://cheats-recruiting-competitive-light.trycloudflare.com";

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isApiRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname === "/api" || pathname.startsWith("/api/");
}

function readEnv(env: unknown, key: string): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const value = process.env[key];
  return value?.trim() || undefined;
}

function getBackendOrigin(env: unknown): string | undefined {
  for (const key of BACKEND_ORIGIN_ENV_KEYS) {
    const value = readEnv(env, key)?.replace(/\/$/, "");
    if (value && /^https?:\/\//.test(value)) return value;
  }
  return TEMP_BACKEND_ORIGIN;
}

async function proxyApiRequest(request: Request, env: unknown): Promise<Response> {
  const backendOrigin = getBackendOrigin(env);
  if (!backendOrigin) {
    return Response.json(
      {
        detail:
          "Backend proxy is not configured. Set BACKEND_ORIGIN to the public FastAPI backend URL.",
      },
      { status: 503 },
    );
  }

  const incomingUrl = new URL(request.url);
  const backendPath = incomingUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const targetUrl = `${backendOrigin}${backendPath}${incomingUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("connection");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  return fetch(targetUrl, init);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (isApiRequest(request)) {
        return await proxyApiRequest(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
