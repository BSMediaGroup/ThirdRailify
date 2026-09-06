import { useEffect, useState } from "react";

export function ReceiptPage() {
  const [token]=useState(()=>window.location.hash.slice(1));
  const [document,setDocument]=useState<{html:string;text:string;displayReference:string}|null>(null);
  const [message,setMessage]=useState("Loading your protected receipt…");
  useEffect(()=>{
    window.history.replaceState(null,"",window.location.pathname);
    const controller=new AbortController();
    fetch("/api/commerce/document",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),signal:controller.signal})
      .then(async response=>{const payload=await response.json();if(!response.ok||!payload.ok)throw new Error();setDocument(payload.document);})
      .catch(()=>{if(!controller.signal.aborted)setMessage("This receipt link is unavailable. Use the complete agreement in your order-confirmation email or contact support.");});
    return ()=>controller.abort();
  },[token]);
  const download=()=>{
    if(!document)return;
    const url=URL.createObjectURL(new Blob([document.text],{type:"text/plain;charset=utf-8"}));
    const anchor=window.document.createElement("a");anchor.href=url;anchor.download="Third-Railify-receipt-and-agreement.txt";anchor.click();URL.revokeObjectURL(url);
  };
  return <section className="checkout-page"><div className="container"><p className="eyebrow">Your retained order record</p><h1>Receipt &amp; agreement</h1>{document?<><button className="button button--primary" onClick={download}>Download receipt &amp; agreement</button><iframe title="Retainable receipt and agreement" sandbox="" referrerPolicy="no-referrer" srcDoc={document.html} style={{width:"100%",height:"80vh",border:0,background:"white",marginTop:"1rem"}}/></>:<p role="status">{message}</p>}</div></section>;
}
