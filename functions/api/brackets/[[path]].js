export async function onRequest({ request, env, data }) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const path = new URL(request.url).pathname;
  if (!/^\/api\/brackets(?:\/[a-zA-Z0-9_-]+){0,2}\/?$/.test(path)) return new Response(null, { status: 404 });
  try {
    const target = new URL(path, env.THIRDRAILIFY_ADMIN_ORIGIN || 'https://admin.thirdrailify.com');
    const response = await (data?.bracketsFetch || fetch)(target, { redirect: 'manual', headers: { Accept: 'application/json,image/*' }, signal: AbortSignal.timeout(15000) });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json') && !type.startsWith('image/')) return Response.json({ ok: false, message: 'Roadmap authority unavailable.' }, { status: 502 });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return Response.json({ ok: false, message: 'Roadmap authority unavailable.' }, { status: 503 }); }
}
