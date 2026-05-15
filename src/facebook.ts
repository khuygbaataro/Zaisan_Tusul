// Facebook Messenger integration: signature verification, send-text, image attachments, sender actions.
import crypto from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

function token(): string {
  const t = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!t) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not set");
  return t;
}

/**
 * Verifies the X-Hub-Signature-256 header against the raw request body using the app secret.
 * Reject any unsigned or mismatching webhook to prevent spoofed messages.
 */
export function verifySignature(rawBody: Buffer, signatureHeader?: string): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) {
    console.warn("[facebook] FACEBOOK_APP_SECRET not set — skipping signature check (DO NOT do this in prod)");
    return true;
  }
  if (!signatureHeader) return false;
  const [scheme, theirs] = signatureHeader.split("=");
  if (scheme !== "sha256" || !theirs) return false;
  const ours = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(ours, "hex"), Buffer.from(theirs, "hex"));
  } catch {
    return false;
  }
}

/** GET /webhook handshake. Returns the challenge to FB if the verify token matches. */
export function verifyWebhook(query: Record<string, string | undefined>):
  | { ok: true; challenge: string }
  | { ok: false; reason: string } {
  const mode = query["hub.mode"];
  const verifyToken = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && verifyToken === process.env.FACEBOOK_VERIFY_TOKEN) {
    return { ok: true, challenge: String(challenge ?? "") };
  }
  return { ok: false, reason: "verify_token mismatch" };
}

async function fbCall(path: string, body: unknown): Promise<void> {
  const url = `${GRAPH}${path}?access_token=${encodeURIComponent(token())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[facebook] send failed", res.status, text);
    throw new Error(`Facebook API ${res.status}: ${text}`);
  }
}

export async function sendTypingOn(psid: string): Promise<void> {
  await fbCall("/me/messages", {
    recipient: { id: psid },
    sender_action: "typing_on",
  }).catch(() => undefined);
}

/**
 * Send a single image attachment. URL must be a public https:// resource Facebook can fetch.
 * is_reusable=true lets FB cache the attachment id so repeat sends are cheap.
 */
export async function sendImageAttachment(psid: string, imageUrl: string): Promise<void> {
  await fbCall("/me/messages", {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: {
      attachment: {
        type: "image",
        payload: { url: imageUrl, is_reusable: true },
      },
    },
  });
}

export async function sendText(psid: string, text: string): Promise<void> {
  // Facebook hard caps text at 2000 chars; chunk to be safe.
  const chunks = chunkText(text, 1900);
  for (const chunk of chunks) {
    await fbCall("/me/messages", {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: chunk },
    });
  }
}

function chunkText(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
  return out;
}
