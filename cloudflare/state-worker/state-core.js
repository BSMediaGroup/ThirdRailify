import {
  STATE_BACKEND_CONTRACT_VERSION,
  STATE_BACKEND_NAME,
  STATE_BACKEND_SCHEMA_VERSION,
  STATE_BACKEND_SOURCE_FINGERPRINT,
  STATE_BACKEND_SOURCE_RELEASE,
} from "../../functions/api/_state-contract.js";
import { semanticFingerprint } from "../../functions/api/_snapshot-persistence.js";
import {
  COMMUNITY_KV_KEY,
  communitySemanticSnapshot,
  normalizeSnapshot,
} from "../../functions/api/community/_community.js";
import {
  WATCH_ARCHIVE_KIND,
  WATCH_ARCHIVE_LIMIT,
  WATCH_ARCHIVE_SCHEMA,
  WATCH_KV_KEY,
  archiveEpisodeFromSnapshot,
  normalizeWatchSnapshot,
  normalizeWatchArchive,
  sortArchiveEpisodes,
  watchSemanticSnapshot,
} from "../../functions/api/watch/_watch.js";

const MIGRATION_COMPLETED_KEY = "legacy_kv_migration_completed";
const KIND_CONFIG = {
  community: {
    legacyKey: COMMUNITY_KV_KEY,
    normalize: normalizeSnapshot,
    semantic: communitySemanticSnapshot,
  },
  broadcast: {
    legacyKey: WATCH_KV_KEY,
    normalize: normalizeWatchSnapshot,
    semantic: watchSemanticSnapshot,
  },
};

export class PublicStateService {
  constructor(database, legacyKv, { now = () => Date.now() } = {}) {
    this.database = database;
    this.legacyKv = legacyKv;
    this.now = now;
    this.mutationQueue = Promise.resolve();
  }

  async initialize() {
    this.database.initialize();
    if (this.database.getMetadata("schema_version") !== String(STATE_BACKEND_SCHEMA_VERSION)) {
      this.database.setMetadata("schema_version", String(STATE_BACKEND_SCHEMA_VERSION));
    }
    if (this.database.getMetadata(MIGRATION_COMPLETED_KEY) === "true") return;
    if (!this.legacyKv || typeof this.legacyKv.get !== "function") throw new Error("legacy_kv_binding_missing");

    const migrationTime = new Date(this.now()).toISOString();
    for (const [kind, config] of Object.entries(KIND_CONFIG)) {
      const existing = this.database.getSnapshot(kind);
      if (existing) {
        this.database.setMetadata(`legacy_kv_${kind}`, "preserved_newer_state");
        continue;
      }
      const raw = await this.legacyKv.get(config.legacyKey);
      const legacy = parseLegacyRecord(raw);
      const snapshot = config.normalize(legacy?.snapshot);
      if (!snapshot) {
        this.database.setMetadata(`legacy_kv_${kind}`, raw ? "invalid" : "absent");
        continue;
      }
      const persistedAt = validIso(legacy.persistedAt) ?? validIso(legacy.receivedAt) ?? migrationTime;
      this.database.putSnapshot({
        key: kind,
        schemaVersion: 1,
        semanticHash: await semanticFingerprint(config.semantic(snapshot)),
        payloadJson: JSON.stringify(snapshot),
        producerObservedAt: snapshot.generatedAt,
        persistedAt,
      });
      this.database.setMetadata(`legacy_kv_${kind}`, "seeded");
    }
    this.database.setMetadata("legacy_kv_migration_completed_at", migrationTime);
    this.database.setMetadata(MIGRATION_COMPLETED_KEY, "true");
  }

  async write(kind, value) {
    return this.serializeMutation(() => this.writeUnlocked(kind, value));
  }

  async writeUnlocked(kind, value) {
    const config = KIND_CONFIG[kind];
    if (!config) throw new Error("invalid_snapshot_kind");
    const snapshot = config.normalize(value?.snapshot);
    const checkpointSeconds = Number(value?.checkpointSeconds);
    if (!snapshot || !Number.isFinite(checkpointSeconds) || checkpointSeconds < 60 || checkpointSeconds > 86400) {
      throw new Error("invalid_snapshot_write");
    }
    const incomingHash = await semanticFingerprint(config.semantic(snapshot));
    const current = this.database.getSnapshot(kind);
    const nowMilliseconds = this.now();
    const unchanged = current?.semanticHash === incomingHash;
    const persistedMilliseconds = Date.parse(current?.persistedAt);
    const checkpointDue = !Number.isFinite(persistedMilliseconds)
      || Math.max(0, nowMilliseconds - persistedMilliseconds) >= checkpointSeconds * 1000;
    if (unchanged && !checkpointDue) {
      return { persisted: false, reason: "unchanged", storageWrites: 0 };
    }
    const reason = unchanged ? "freshness_checkpoint" : "semantic_change";
    this.database.putSnapshot({
      key: kind,
      schemaVersion: 1,
      semanticHash: incomingHash,
      payloadJson: JSON.stringify(snapshot),
      producerObservedAt: snapshot.generatedAt,
      persistedAt: new Date(nowMilliseconds).toISOString(),
    });
    return { persisted: true, reason, storageWrites: 1 };
  }

  async ingestBroadcast(value) {
    return this.serializeMutation(async () => {
      const snapshot = normalizeWatchSnapshot(value?.snapshot);
      const checkpointSeconds = Number(value?.checkpointSeconds);
      if (!snapshot || !Number.isFinite(checkpointSeconds) || checkpointSeconds < 60 || checkpointSeconds > 86400) {
        throw new Error("invalid_snapshot_write");
      }

      const currentPlan = await this.planSnapshotWrite("broadcast", snapshot, checkpointSeconds);
      const archive = this.readArchive();
      const candidate = snapshot.primary;
      let nextArchive = archive;
      let archiveReason = "ineligible";
      let archiveRow = null;
      if (candidate) {
        const identity = archive.episodes.find((episode) => episode.identityKey === candidate.key) ?? null;
        const episode = await archiveEpisodeFromSnapshot(snapshot, identity);
        if (episode) {
          const episodes = sortArchiveEpisodes([
            ...archive.episodes.filter((entry) => entry.id !== episode.id),
            episode,
          ]).slice(0, WATCH_ARCHIVE_LIMIT);
          nextArchive = normalizeWatchArchive({ schema: WATCH_ARCHIVE_SCHEMA, episodes });
          const nextHash = await semanticFingerprint(nextArchive);
          const currentHash = this.database.getSnapshot(WATCH_ARCHIVE_KIND)?.semanticHash ?? null;
          if (nextHash !== currentHash) {
            archiveReason = identity ? "episode_updated" : "episode_inserted";
            archiveRow = this.archiveRow(nextArchive, nextHash, snapshot.generatedAt);
          } else {
            archiveReason = "unchanged";
          }
        }
      }

      this.database.transaction(() => {
        if (currentPlan.row) this.database.putSnapshot(currentPlan.row);
        if (archiveRow) this.database.putSnapshot(archiveRow);
      });
      return {
        persisted: Boolean(currentPlan.row || archiveRow),
        reason: currentPlan.reason,
        storageWrites: Number(Boolean(currentPlan.row)) + Number(Boolean(archiveRow)),
        currentPersisted: Boolean(currentPlan.row),
        archivePersisted: Boolean(archiveRow),
        archiveReason,
        archiveCount: nextArchive.episodes.length,
      };
    });
  }

  readArchive() {
    const row = this.database.getSnapshot(WATCH_ARCHIVE_KIND);
    if (!row) return { schema: WATCH_ARCHIVE_SCHEMA, episodes: [] };
    try {
      return normalizeWatchArchive(JSON.parse(row.payloadJson)) ?? { schema: WATCH_ARCHIVE_SCHEMA, episodes: [] };
    } catch {
      return { schema: WATCH_ARCHIVE_SCHEMA, episodes: [] };
    }
  }

  readEpisode(episodeId) {
    return this.readArchive().episodes.find((episode) => episode.id === episodeId) ?? null;
  }

  async changeArchiveVisibility(action, episodeId = null) {
    return this.serializeMutation(async () => {
      if (!["show", "hide", "show_all", "hide_all"].includes(action)) throw new Error("invalid_archive_action");
      const archive = this.readArchive();
      const visible = action === "show" || action === "show_all";
      if ((action === "show" || action === "hide") && !archive.episodes.some((episode) => episode.id === episodeId)) {
        throw new Error("episode_not_found");
      }
      const episodes = archive.episodes.map((episode) => {
        if (action.endsWith("_all") || episode.id === episodeId) return episode.visible === visible ? episode : { ...episode, visible };
        return episode;
      });
      const nextArchive = normalizeWatchArchive({ schema: WATCH_ARCHIVE_SCHEMA, episodes });
      const nextHash = await semanticFingerprint(nextArchive);
      const currentHash = this.database.getSnapshot(WATCH_ARCHIVE_KIND)?.semanticHash ?? null;
      if (nextHash === currentHash) return { persisted: false, reason: "unchanged", storageWrites: 0, archive: nextArchive };
      this.database.transaction(() => this.database.putSnapshot(this.archiveRow(nextArchive, nextHash, new Date(this.now()).toISOString())));
      return { persisted: true, reason: "visibility_changed", storageWrites: 1, archive: nextArchive };
    });
  }

  async planSnapshotWrite(kind, snapshot, checkpointSeconds) {
    const config = KIND_CONFIG[kind];
    const incomingHash = await semanticFingerprint(config.semantic(snapshot));
    const current = this.database.getSnapshot(kind);
    const nowMilliseconds = this.now();
    const unchanged = current?.semanticHash === incomingHash;
    const persistedMilliseconds = Date.parse(current?.persistedAt);
    const checkpointDue = !Number.isFinite(persistedMilliseconds)
      || Math.max(0, nowMilliseconds - persistedMilliseconds) >= checkpointSeconds * 1000;
    if (unchanged && !checkpointDue) return { row: null, reason: "unchanged" };
    return {
      reason: unchanged ? "freshness_checkpoint" : "semantic_change",
      row: {
        key: kind,
        schemaVersion: 1,
        semanticHash: incomingHash,
        payloadJson: JSON.stringify(snapshot),
        producerObservedAt: snapshot.generatedAt,
        persistedAt: new Date(nowMilliseconds).toISOString(),
      },
    };
  }

  archiveRow(archive, semanticHash, observedAt) {
    return {
      key: WATCH_ARCHIVE_KIND,
      schemaVersion: 1,
      semanticHash,
      payloadJson: JSON.stringify(archive),
      producerObservedAt: observedAt,
      persistedAt: new Date(this.now()).toISOString(),
    };
  }

  serializeMutation(operation) {
    const run = this.mutationQueue.then(operation, operation);
    this.mutationQueue = run.catch(() => {});
    return run;
  }

  read(kind) {
    if (!KIND_CONFIG[kind]) throw new Error("invalid_snapshot_kind");
    const row = this.database.getSnapshot(kind);
    if (!row) return null;
    let snapshot;
    try {
      snapshot = KIND_CONFIG[kind].normalize(JSON.parse(row.payloadJson));
    } catch {
      snapshot = null;
    }
    return snapshot ? {
      available: true,
      snapshot,
      producerObservedAt: row.producerObservedAt,
      persistedAt: row.persistedAt,
    } : null;
  }

  diagnostics() {
    return {
      available: true,
      status: "ready",
      contract_version: STATE_BACKEND_CONTRACT_VERSION,
      source_release: STATE_BACKEND_SOURCE_RELEASE,
      source_fingerprint: STATE_BACKEND_SOURCE_FINGERPRINT,
      state_backend: STATE_BACKEND_NAME,
      schema_version: STATE_BACKEND_SCHEMA_VERSION,
      community_snapshot_available: Boolean(this.read("community")),
      broadcast_snapshot_available: Boolean(this.read("broadcast")),
      broadcast_archive_available: true,
      broadcast_archive_count: this.readArchive().episodes.length,
      legacy_kv_migration: this.database.getMetadata(MIGRATION_COMPLETED_KEY) === "true" ? "complete" : "pending",
      legacy_kv_read_only: true,
      expected_steady_state_kv_puts_per_day: 0,
      expected_steady_state_kv_deletes_per_day: 0,
      expected_steady_state_kv_lists_per_day: 0,
      expected_steady_state_kv_reads_per_day: 0,
    };
  }
}

export class SqliteStateDatabase {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
  }

  initialize() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS snapshots (
      key TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      semantic_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      producer_observed_at TEXT NOT NULL,
      persisted_at TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
  }

  getMetadata(key) {
    return first(this.sql.exec("SELECT value FROM metadata WHERE key = ?", key))?.value ?? null;
  }

  setMetadata(key, value) {
    this.sql.exec(
      "INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  }

  getSnapshot(key) {
    const row = first(this.sql.exec(
      `SELECT key, schema_version, semantic_hash, payload_json, producer_observed_at, persisted_at
       FROM snapshots WHERE key = ?`,
      key,
    ));
    return row ? {
      key: row.key,
      schemaVersion: row.schema_version,
      semanticHash: row.semantic_hash,
      payloadJson: row.payload_json,
      producerObservedAt: row.producer_observed_at,
      persistedAt: row.persisted_at,
    } : null;
  }

  putSnapshot(row) {
    this.sql.exec(
      `INSERT INTO snapshots
        (key, schema_version, semantic_hash, payload_json, producer_observed_at, persisted_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
        schema_version = excluded.schema_version,
        semantic_hash = excluded.semantic_hash,
        payload_json = excluded.payload_json,
        producer_observed_at = excluded.producer_observed_at,
        persisted_at = excluded.persisted_at`,
      row.key,
      row.schemaVersion,
      row.semanticHash,
      row.payloadJson,
      row.producerObservedAt,
      row.persistedAt,
    );
  }

  transaction(callback) {
    return this.storage.transactionSync(callback);
  }
}

function first(cursor) {
  return [...cursor][0] ?? null;
}

function parseLegacyRecord(raw) {
  if (!raw) return null;
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value.snapshot ? value : { snapshot: value };
  } catch {
    return null;
  }
}

function validIso(value) {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}
