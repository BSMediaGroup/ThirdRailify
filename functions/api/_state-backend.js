import { STATE_SINGLETON_NAME } from "./_state-contract.js";

export async function readStateSnapshot(env, kind) {
  const response = await stateRequest(env, `/snapshot/${kind}`, { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`state_backend_read_${response.status}`);
  const value = await response.json();
  return value?.available === true && value.snapshot ? value : null;
}

export async function writeStateSnapshot(env, kind, snapshot, checkpointSeconds) {
  const response = await stateRequest(env, `/snapshot/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, checkpointSeconds }),
  });
  if (!response.ok) throw new Error(`state_backend_write_${response.status}`);
  return response.json();
}

export async function ingestWatchState(env, snapshot, checkpointSeconds) {
  const response = await stateRequest(env, "/watch/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, checkpointSeconds }),
  });
  if (!response.ok) throw new Error(`state_backend_watch_ingest_${response.status}`);
  return response.json();
}

export async function readWatchArchive(env) {
  const response = await stateRequest(env, "/watch/archive", { method: "GET" });
  if (!response.ok) throw new Error(`state_backend_archive_read_${response.status}`);
  return response.json();
}

export async function readWatchEpisode(env, episodeId) {
  const response = await stateRequest(env, `/watch/archive/${encodeURIComponent(episodeId)}`, { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`state_backend_episode_read_${response.status}`);
  return response.json();
}

export async function changeWatchVisibility(env, action, episodeId = null) {
  const response = await stateRequest(env, "/watch/archive/visibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, episodeId }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`state_backend_visibility_${response.status}`);
  return response.json();
}

export async function readStateDiagnostics(env) {
  const response = await stateRequest(env, "/diagnostics", { method: "GET" });
  if (!response.ok) throw new Error(`state_backend_diagnostics_${response.status}`);
  return response.json();
}

function stateRequest(env, path, init) {
  const namespace = env.THIRDRAILIFY_PUBLIC_STATE;
  if (!namespace) throw new Error("state_backend_binding_missing");
  const id = namespace.idFromName(STATE_SINGLETON_NAME);
  return namespace.get(id).fetch(new Request(`https://thirdrailify-state.internal${path}`, init));
}

