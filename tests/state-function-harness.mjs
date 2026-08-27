import { PublicStateService } from "../cloudflare/state-worker/state-core.js";
import { COMMUNITY_KV_KEY } from "../functions/api/community/_community.js";
import { WATCH_ARCHIVE_KIND, WATCH_KV_KEY } from "../functions/api/watch/_watch.js";

const KEY_FOR_KIND = { community: COMMUNITY_KV_KEY, broadcast: WATCH_KV_KEY, [WATCH_ARCHIVE_KIND]: WATCH_ARCHIVE_KIND };

export class MemoryStateNamespace {
  constructor({ legacyValues = new Map(), now = () => Date.now() } = {}) {
    this.values = new Map();
    this.putCalls = 0;
    this.metadata = new Map();
    this.legacyOperations = { reads: 0, puts: 0, deletes: 0, lists: 0 };
    this.legacyKv = {
      get: async (key) => {
        this.legacyOperations.reads += 1;
        return legacyValues.get(key) ?? null;
      },
    };
    const database = {
      initialize: () => {},
      getMetadata: (key) => this.metadata.get(key) ?? null,
      setMetadata: (key, value) => this.metadata.set(key, value),
      getSnapshot: (kind) => this.#row(kind),
      putSnapshot: (row) => this.#putRow(row),
      transaction: (callback) => callback(),
    };
    this.service = new PublicStateService(database, this.legacyKv, { now });
    this.ready = this.service.initialize();
  }

  idFromName(name) {
    return { name };
  }

  get(idOrKey) {
    if (typeof idOrKey === "object") return { fetch: (request) => this.#fetch(request) };
    return Promise.resolve(this.values.get(idOrKey) ?? null);
  }

  async #fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/diagnostics") return response(this.service.diagnostics());
    if (request.method === "POST" && url.pathname === "/watch/ingest") return response(await this.service.ingestBroadcast(await request.json()));
    if (request.method === "GET" && url.pathname === "/watch/archive") return response(this.service.readArchive());
    const episode = url.pathname.match(/^\/watch\/archive\/(ep_[a-f0-9]{64})$/);
    if (request.method === "GET" && episode) {
      const row = this.service.readEpisode(episode[1]);
      return row ? response(row) : response({ error: "not_found" }, 404);
    }
    if (request.method === "POST" && url.pathname === "/watch/archive/visibility") {
      const body = await request.json();
      const result = await this.service.changeArchiveVisibility(body.action, body.episodeId);
      return response(result);
    }
    const match = url.pathname.match(/^\/snapshot\/(community|broadcast)$/);
    if (!match) return response({ error: "not_found" }, 404);
    if (request.method === "GET") {
      const row = this.service.read(match[1]);
      return row ? response(row) : response({ available: false }, 404);
    }
    if (request.method === "POST") return response(await this.service.write(match[1], await request.json()));
    return response({ error: "method_not_allowed" }, 405);
  }

  #row(kind) {
    const raw = this.values.get(KEY_FOR_KIND[kind]);
    if (!raw) return null;
    try {
      const record = typeof raw === "string" ? JSON.parse(raw) : raw;
      const snapshot = record.snapshot ?? record;
      return {
        key: kind,
        schemaVersion: 1,
        semanticHash: record.semanticFingerprint ?? "",
        payloadJson: JSON.stringify(snapshot),
        producerObservedAt: record.producerObservedAt ?? snapshot.generatedAt ?? snapshot.episodes?.[0]?.updatedAt,
        persistedAt: record.persistedAt ?? record.receivedAt ?? snapshot.generatedAt ?? snapshot.episodes?.[0]?.updatedAt,
      };
    } catch {
      return null;
    }
  }

  #putRow(row) {
    const current = this.#row(row.key);
    const reason = current?.semanticHash === row.semanticHash ? "freshness_checkpoint" : "semantic_change";
    this.putCalls += 1;
    const payload = JSON.parse(row.payloadJson);
    this.values.set(KEY_FOR_KIND[row.key], JSON.stringify({
      snapshot: payload,
      semanticFingerprint: row.semanticHash,
      producerObservedAt: row.producerObservedAt,
      persistedAt: row.persistedAt,
      receivedAt: row.persistedAt,
      checkpointReason: reason,
    }));
  }
}

function response(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
