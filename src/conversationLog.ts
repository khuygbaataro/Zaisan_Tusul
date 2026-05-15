// Firestore-backed conversation log under /conversations/{psid}.
// Used for: (a) detecting first-time contact so we send the canned welcome only once
// per PSID across server restarts, and (b) building a training corpus for the Phase 3
// Trainer Bot. All writes are best-effort; failures are logged and swallowed so they
// never break the user-facing reply path.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.js";

const COLLECTION = "conversations";

export interface LoggedMessage {
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

/** True when this PSID already has a /conversations/{psid} doc — i.e. has been greeted before. */
export async function hasConversation(psid: string): Promise<boolean> {
  try {
    const snap = await db.collection(COLLECTION).doc(psid).get();
    return snap.exists;
  } catch (err) {
    console.error("[conversationLog] hasConversation failed", err);
    // On Firestore error, assume not seen — at worst the user gets a duplicate welcome.
    return false;
  }
}

/**
 * Append a user message + the assistant reply to /conversations/{psid}.
 * Creates the doc with createdAt on first call, then appends to messages[] on every turn.
 * Fire-and-forget — caller does not await this on the reply path.
 */
export async function appendTurn(
  psid: string,
  userText: string,
  assistantText: string
): Promise<void> {
  try {
    const ref = db.collection(COLLECTION).doc(psid);
    const now = new Date();
    const userMsg: LoggedMessage = { role: "user", content: userText, ts: now };
    const assistantMsg: LoggedMessage = {
      role: "assistant",
      content: assistantText,
      ts: now,
    };
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        psid,
        messages: [userMsg, assistantMsg],
        lastMessage: assistantText,
        flagged: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await ref.update({
        messages: FieldValue.arrayUnion(userMsg, assistantMsg),
        lastMessage: assistantText,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("[conversationLog] appendTurn failed", err);
  }
}
