export type ContactPayload = {
  name: string;
  email: string;
  topic: string;
  message: string;
  website: string;
  consent: boolean;
  turnstileToken: string;
};

export async function sendContactMessage(payload: ContactPayload) {
  const response = await fetch("/api/contact", {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
  if (!response.ok || !body?.ok) throw new Error(body?.message || "Your message could not be sent. Try again.");
  return body;
}
