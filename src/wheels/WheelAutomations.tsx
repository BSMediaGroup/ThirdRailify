import { AutomationRuleList } from '../components/AutomationRuleList';
import { mergeRules, publishRule, removeRule, toggleRule, useRuleStore } from '../lib/automation-rule-store';
import { useCallback, useEffect, useState } from 'react';
import { AutomationRuleEditor } from '../components/AutomationRuleEditor';
import { AutomationRequestError, type Rule, type Readiness, type Discovery, type WheelChoice } from '../lib/automation-client';
import { defaultAction } from '../lib/automation-model.mjs';
import '../styles/trigger-studio.css';

type Payload = { rules: Rule[]; readiness: Readiness; discovery: Discovery; wheels: WheelChoice[]; activity: { id: string; actor_label: string; outcome: string; awarded_entries: number }[] };
export function WheelAutomations({ slug, csrf }: { slug: string; csrf: string }) {
  useRuleStore();
  const [data, setData] = useState<Payload | null>(null), [editor, setEditor] = useState<Rule | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [issues, setIssues] = useState<Record<string, string>>({});
  const request = useCallback(async <T,>(path: string, token?: string, body?: unknown): Promise<T> => {
    const action = path === 'rules' ? 'save' : path === 'rules/delete' ? 'delete' : path;
    const response = await fetch(`/api/wheels/${encodeURIComponent(slug)}/automations${body ? `/${action}` : path.includes('?') ? `?${path.split('?')[1]}` : ''}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': token || '' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new AutomationRequestError(result.message || 'Automation request failed.', result.issues || [], response.status);
    return result;
  }, [slug]);
  const load = useCallback(async () => { try { setData(await request<Payload>('rules')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load automations.'); } }, [request]);
  useEffect(() => { void load(); }, [load]);
  const mutate = async (path: string, rule: Rule | object) => { setBusy(true); setError(''); setIssues({}); try { const result = await request<{ rule?: Rule }>(path, csrf, rule); if (result.rule) publishRule(result.rule); else if (path === 'rules/delete') removeRule((rule as Rule).id!); setEditor(null); } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); if (e instanceof AutomationRequestError) setIssues(Object.fromEntries(e.issues.map(i => [i.field, i.message]))); } finally { setBusy(false); } };
  return <section className="event-studio wheel-automations" aria-label="Wheel automations"><h3>Automations</h3><p>Rules save independently of Wheel appearance. Enabling a rule starts a new activation boundary.</p>
    {error ? <p role="alert">{error}</p> : null}
    <div className="event-actions"><button type="button" disabled={busy} onClick={() => void load()}>Refresh rules</button><button type="button" disabled={!data?.wheels.length || busy} onClick={() => { setIssues({}); setEditor({ name: '', description: '', enabled: false, sourceScope: data?.discovery?.source?.scope || '', eventType: 'rumble.chat.exact', conditions: {}, actionType: 'wheel.add_actor', targetWheelId: data!.wheels[0].id, duplicatePolicy: 'skip', actionConfig: defaultAction() }); }}>Create automation</button></div>
    {editor && data ? <AutomationRuleEditor rule={editor} rules={data.rules} wheels={data.wheels} discovery={data.discovery} readiness={data.readiness} request={request} csrf={csrf} busy={busy} canManage serverErrors={issues} onChange={r => { setEditor(r); setIssues({}); }} onSave={() => void mutate('rules', editor)} onClose={() => setEditor(null)} /> : null}
    <AutomationRuleList rules={mergeRules(data?.rules || [], data?.wheels[0]?.id || '__loading__')} scoped canManage={Boolean(data)} onEdit={rule => { setIssues({}); setEditor(rule); }} onToggle={rule => void toggleRule(rule, csrf, request)} onDelete={rule => { if (window.confirm(`Delete ${rule.name}? Existing entries remain.`)) void mutate('rules/delete', { id: rule.id, revision: rule.revision, confirm: 'DELETE' }); }} />
    {data?.activity.length ? <details><summary>Recent activity</summary>{data.activity.map(a => <p key={a.id}>{a.actor_label}: {a.outcome} · {a.awarded_entries} entries</p>)}</details> : null}
  </section>;
}
