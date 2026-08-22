import { readStateDiagnostics } from "./_state-backend.js";
import { jsonResponse } from "./community/_community.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  try {
    return jsonResponse(await readStateDiagnostics(env));
  } catch {
    return jsonResponse({
      available: false,
      status: "unavailable",
      state_backend: "unavailable",
    }, 503);
  }
}

