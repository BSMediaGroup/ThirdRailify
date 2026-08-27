import { DurableObject } from "cloudflare:workers";

import { STATE_SINGLETON_NAME } from "../../functions/api/_state-contract.js";
import { PublicStateService, SqliteStateDatabase } from "./state-core.js";

export class ThirdRailifyPublicState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.service = new PublicStateService(new SqliteStateDatabase(ctx.storage), env.THIRDRAILIFY_COMMUNITY_KV);
    this.ready = ctx.blockConcurrencyWhile(() => this.service.initialize());
  }

  async fetch(request) {
    try {
      await this.ready;
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/diagnostics") {
        return json(this.service.diagnostics());
      }
      if (request.method === "POST" && url.pathname === "/watch/ingest") {
        return json(await this.service.ingestBroadcast(await request.json()));
      }
      if (request.method === "GET" && url.pathname === "/watch/archive") {
        return json(this.service.readArchive());
      }
      const episode = url.pathname.match(/^\/watch\/archive\/(ep_[a-f0-9]{64})$/);
      if (request.method === "GET" && episode) {
        const record = this.service.readEpisode(episode[1]);
        return record ? json(record) : json({ error: "not_found" }, 404);
      }
      if (request.method === "POST" && url.pathname === "/watch/archive/visibility") {
        const body = await request.json();
        return json(await this.service.changeArchiveVisibility(body?.action, body?.episodeId ?? null));
      }
      const match = url.pathname.match(/^\/snapshot\/(community|broadcast)$/);
      if (!match) return json({ error: "not_found" }, 404);
      if (request.method === "GET") {
        const record = this.service.read(match[1]);
        return record ? json(record) : json({ available: false }, 404);
      }
      if (request.method === "POST") {
        return json(await this.service.write(match[1], await request.json()));
      }
      return json({ error: "method_not_allowed" }, 405);
    } catch (error) {
      console.error(`public state request failed type=${error?.constructor?.name ?? "Error"}`);
      if (error?.message === "episode_not_found") return json({ error: "not_found" }, 404);
      if (["invalid_archive_action", "invalid_snapshot_write"].includes(error?.message)) return json({ error: "invalid_request" }, 400);
      return json({ error: "state_backend_unavailable" }, 503);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = env.THIRDRAILIFY_PUBLIC_STATE.idFromName(STATE_SINGLETON_NAME);
    const stub = env.THIRDRAILIFY_PUBLIC_STATE.get(id);
    if (request.method === "GET" && url.pathname === "/health") {
      return stub.fetch("https://thirdrailify-state.internal/diagnostics");
    }
    if (env.LOCAL_STATE_TEST_MODE === "true" && /^\/snapshot\/(community|broadcast)$/.test(url.pathname)) {
      return stub.fetch(new Request(`https://thirdrailify-state.internal${url.pathname}`, request));
    }
    return json({ error: "not_found" }, 404);
  },
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
