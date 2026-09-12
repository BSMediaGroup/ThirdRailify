// Immutable, public catalogue objects only. No caller-supplied upstream origin,
// credentials, private object keys or query strings cross this boundary.
export async function onRequest({request,env}, fetchImpl = fetch) {
  const url = new URL(request.url);
  const match = /^\/commerce-media\/([a-f0-9]{64}\.(?:jpg|png|webp))$/.exec(url.pathname);
  const failure = status => new Response('Image unavailable', {status, headers:{'Cache-Control':'no-store','Content-Type':'text/plain','X-Content-Type-Options':'nosniff'}});
  if (!['GET','HEAD'].includes(request.method)) return failure(405);
  if (!match || url.search) return failure(404);
  try {
    if (env?.THIRDRAILIFY_CATALOGUE_MEDIA) {
      const object = await env.THIRDRAILIFY_CATALOGUE_MEDIA.get(`commerce/catalogue/${match[1]}`);
      if (!object) return failure(404);
      const type = object.httpMetadata?.contentType;
      if (!/^image\/(?:png|jpeg|webp)$/.test(type || '')) return failure(502);
      const headers = new Headers({'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
      if (object.httpEtag) headers.set('ETag',object.httpEtag);
      if (Number.isFinite(object.size)) headers.set('Content-Length',String(object.size));
      return new Response(request.method==='HEAD'?null:object.body,{headers});
    }
    const headers = new Headers();
    if(request.headers.has('If-None-Match')) headers.set('If-None-Match',request.headers.get('If-None-Match'));
    const upstream = await fetchImpl(`https://thirdrailify-admin.pages.dev/api/public/commerce/media/${match[1]}`, {method:request.method,headers,redirect:'error',signal:AbortSignal.timeout(15000)});
    if (![200,304].includes(upstream.status)) return failure(upstream.status===404?404:502);
    if(upstream.status===200&&!/^image\/(?:png|jpeg|webp)$/.test(upstream.headers.get('Content-Type')||''))return failure(502);
    const output = new Headers({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'cross-origin'});
    for(const key of ['Content-Type','Content-Length','ETag'])if(upstream.headers.has(key))output.set(key,upstream.headers.get(key));
    if(upstream.status===304)output.delete('Content-Length');
    return new Response(request.method==='HEAD'||upstream.status===304?null:upstream.body,{status:upstream.status,headers:output});
  }catch{return failure(502);}
}
