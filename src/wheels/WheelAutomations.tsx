import { useCallback, useEffect, useState } from 'react';
import { AutomationRuleEditor } from '../components/AutomationRuleEditor';
import { AutomationRequestError, families, type Rule, type Readiness, type Discovery, type WheelChoice } from '../lib/automation-client';
import { defaultAction } from '../lib/automation-model.mjs';
import '../styles/trigger-studio.css';

type Payload = { rules: Rule[]; readiness: Readiness; discovery: Discovery; wheels: WheelChoice[]; activity: { id: string; actor_label: string; outcome: string; awarded_entries: number }[] };
export function WheelAutomations({ slug, csrf }: { slug: string; csrf: string }) {
  const [data, setData] = useState<Payload | null>(null), [editor, setEditor] = useState<Rule | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [issues, setIssues] = useState<Record<string, string>>({});
  const request = useCallback(async <T,>(path: string, token?: string, body?: unknown): Promise<T> => {
    const action = path === 'rules' ? 'save' : path === 'rules/delete' ? 'delete' : path;
    const response = await fetch(`/api/wheels/${encodeURIComponent(slug)}/automations${body ? `/${action}` : ''}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': token || '' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new AutomationRequestError(result.message || 'Automation request failed.', result.issues || []);
    return result;
  }, [slug]);
  const load = useCallback(async () => { try { setData(await request<Payload>('rules')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load automations.'); } }, [request]);
  useEffect(() => { void load(); }, [load]);
  const mutate = async (path: string, rule: Rule | object) => { setBusy(true); setError(''); setIssues({}); try { await request(path, csrf, rule); setEditor(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); if (e instanceof AutomationRequestError) setIssues(Object.fromEntries(e.issues.map(i => [i.field, i.message]))); } finally { setBusy(false); } };
  return <section className="event-studio wheel-automations" aria-label="Wheel automations"><h3>Automations</h3><p>Rules save independently of Wheel appearance. Enabling a rule starts a new activation boundary.</p>
    {error ? <p role="alert">{error}</p> : null}
    <div className="event-actions"><button type="button" disabled={busy} onClick={() => void load()}>Refresh rules</button><button type="button" disabled={!data?.wheels.length || busy} onClick={() => { setIssues({}); setEditor({ name: '', description: '', enabled: false, sourceScope: data?.discovery?.source?.scope || '', eventType: 'rumble.chat.exact', conditions: {}, actionType: 'wheel.add_actor', targetWheelId: data!.wheels[0].id, duplicatePolicy: 'skip', actionConfig: defaultAction() }); }}>Create automation</button></div>
    {editor && data ? <AutomationRuleEditor rule={editor} rules={data.rules} wheels={data.wheels} discovery={data.discovery} readiness={data.readiness} request={request} csrf={csrf} busy={busy} canManage serverErrors={issues} onChange={r => { setEditor(r); setIssues({}); }} onSave={() => void mutate('rules', editor)} onClose={() => setEditor(null)} /> : null}
    {data?.rules.map(rule => <article className="event-rule" key={rule.id}><h3>{rule.name}</h3><p>{families.find(f => f[0] === rule.eventType)?.[1]} · {rule.enabled ? rule.runtimeStatus === 'pending_capable_bot' ? 'Pending capable Bot' : 'Enabled' : 'Paused'}</p><p>{rule.counters?.executed || 0} successful awards · {rule.lastFault || rule.lastOutcome || 'No events yet'}</p><div className="event-actions"><button type="button" disabled={busy} onClick={() => { setIssues({}); setEditor(rule); }}>Edit</button><button type="button" disabled={busy} onClick={() => void mutate('rules', { ...rule, enabled: !rule.enabled })}>{rule.enabled ? 'Pause' : 'Enable'}</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete ${rule.name}? Existing entries remain.`)) void mutate('rules/delete', { id: rule.id, revision: rule.revision, confirm: 'DELETE' }); }}>Delete</button></div></article>)}
    {data?.activity.length ? <details><summary>Recent activity</summary>{data.activity.map(a => <p key={a.id}>{a.actor_label}: {a.outcome} · {a.awarded_entries} entries</p>)}</details> : null}
  </section>;
}
