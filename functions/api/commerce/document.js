export async function onRequestPost({env,request,data={}}) {
  const headers={"Cache-Control":"no-store, private","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff"};
  if(request.headers.get("Origin")!==env.THIRDRAILIFY_PUBLIC_ORIGIN) return Response.json({ok:false,message:"Origin not allowed."},{status:403,headers});
  try {
    const body=await request.text();
    if(body.length>512) throw new Error("invalid_token");
    const {token}=JSON.parse(body);
    if(typeof token!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("invalid_token");
    const response=await (data.fetchImpl || fetch)(`${env.THIRDRAILIFY_ADMIN_ORIGIN}/api/commerce/document`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),redirect:"error",signal:AbortSignal.timeout(15000)});
    const payload=await response.json();
    if(!response.ok || payload.ok!==true) return Response.json({ok:false,message:"The protected receipt is unavailable."},{status:404,headers});
    const doc=payload.document;
    return Response.json({ok:true,document:{html:doc.html,text:doc.text,displayReference:doc.displayReference}},{headers});
  } catch { return Response.json({ok:false,message:"The protected receipt is unavailable."},{status:404,headers}); }
}
