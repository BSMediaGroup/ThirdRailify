import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/commerce-media/[[path]].js';
test('production image delivery reads only the immutable catalogue prefix',async()=>{
 const filename='b'.repeat(64)+'.png';let key;
 const env={THIRDRAILIFY_CATALOGUE_MEDIA:{get:async value=>{key=value;return {body:new Uint8Array([137,80,78,71]),size:4,httpMetadata:{contentType:'image/png'},httpEtag:'"immutable"'};}}};
 const request=new Request('https://thirdrailify.com/commerce-media/'+filename);
 const result=await onRequest({request,env},()=>{throw new Error('No upstream needed');});
 assert.equal(result.status,200);assert.equal(key,'commerce/catalogue/'+filename);assert.equal((await result.arrayBuffer()).byteLength,4);
 const invalid=await onRequest({request:new Request(request.url+'?private=1'),env});assert.equal(invalid.status,404);
});
test('same-origin immutable image delivery fixes the upstream and preserves cache semantics',async()=>{
 const path='/commerce-media/'+ 'a'.repeat(64)+'.png';let called=0;
 const get=async(url,init)=>{called++;assert.equal(url,'https://thirdrailify-admin.pages.dev/api/public/commerce/media/'+ 'a'.repeat(64)+'.png');assert.equal(init.headers.has('Cookie'),false);return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png','ETag':'"fixture"'}});};
 const response=await onRequest({request:new Request('https://thirdrailify.com'+path,{headers:{Cookie:'private'}})},get);assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal((await response.arrayBuffer()).byteLength,4);
 for(const suffix of ['?url=https://private.test','/../secret','/private-file'])assert.equal((await onRequest({request:new Request('https://thirdrailify.com'+path+suffix)},get)).status,404);
 assert.equal(called,1);assert.equal((await onRequest({request:new Request('https://thirdrailify.com'+path,{method:'POST'})},get)).status,405);
 assert.equal((await onRequest({request:new Request('https://thirdrailify.com'+path)},async()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}))).status,502);
});
