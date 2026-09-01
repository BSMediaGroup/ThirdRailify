import { useCallback, useEffect, useState } from "react";
import type { GamingRotationItem } from "./rotation";

export type GameSuggestionInput = {
  gameTitle: string;
  steamUrl: string;
  pitch: string;
  website: string;
  turnstileToken: string;
};

export type GameSuggestionReceipt = {
  ok: true;
  reference: string;
  message: string;
};

export function normalizeSteamStoreUrl(value: string): string {
  const source = value.trim();
  if (!source) return "";
  try {
    const url = new URL(source);
    const match = url.pathname.match(/^\/app\/(\d{1,10})(?:\/[A-Za-z0-9_-]+)?\/?$/);
    if (url.protocol !== "https:" || url.hostname !== "store.steampowered.com" || url.username || url.password || url.port || !match) return "";
    return `https://store.steampowered.com/app/${match[1]}/`;
  } catch {
    return "";
  }
}

export function steamSearchUrl(title: string) {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title.trim())}`;
}

export type RotationResponse = { ok:true;schema:"thirdrailify-gaming-rotation-v1";items:Array<{id:string;title:string;platform:string;description:string;genre:string;artworkUrl:string|null;steam:null|{appId:string;storeUrl:string};position:number}>;updatedAt:string|null };
export function useGamingRotation(){const [items,setItems]=useState<GamingRotationItem[]>([]);const [state,setState]=useState<"loading"|"ready"|"empty"|"unavailable">("loading");const load=useCallback(async()=>{try{const response=await fetch("/api/gaming/rotation",{headers:{Accept:"application/json"}});const payload=await response.json().catch(()=>null) as RotationResponse|null;if(!response.ok||!payload?.ok||!Array.isArray(payload.items))throw new Error("rotation_unavailable");const next=payload.items.sort((a,b)=>a.position-b.position).map(item=>({id:item.id,index:String(item.position).padStart(2,"0"),title:item.title,platform:item.platform,description:item.description,genre:item.genre,artworkUrl:item.artworkUrl,steam:item.steam,visual:visualFor(item.id,item.title)}));setItems(next);setState(next.length?"ready":"empty");}catch{setItems([]);setState("unavailable");}},[]);useEffect(()=>{void load();const interval=window.setInterval(()=>void load(),60_000);return()=>window.clearInterval(interval);},[load]);return{items,state,retry:load};}
function visualFor(id:string,title:string){const value=`${id} ${title}`.toLowerCase();if(value.includes("luminary"))return"luminary";if(value.includes("witcher"))return"runes";if(value.includes("mario")||value.includes("world"))return"world";if(value.includes("party"))return"party";return"signal";}

export async function submitGameSuggestion(input: GameSuggestionInput, csrfToken = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch("/api/gaming/suggestions", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers,
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null) as (GameSuggestionReceipt & { error?: string }) | null;
  if (!response.ok || !body?.ok) throw new Error(body?.message || "The request signal could not be sent. Try again.");
  return body;
}
