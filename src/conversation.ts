// Per-PSID rolling message history. Kept in memory — sufficient for testing.
// Move to Firestore later if you want to persist across server restarts.
import type Anthropic from "@anthropic-ai/sdk";

export type Msg = Anthropic.MessageParam;

interface Thread {
  messages: Msg[];
  lastSeen: number;
}

// ~15 messages of history → roughly 7 user+assistant pairs. Anything older is dropped
// at the next setHistory() so the prompt stays cheap and focused on the recent turns.
const MAX_TURNS = 8;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours of idle drops the thread
const threads = new Map<string, Thread>();

function gc(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [k, v] of threads) if (v.lastSeen < cutoff) threads.delete(k);
}

export function getHistory(psid: string): Msg[] {
  gc();
  return threads.get(psid)?.messages ?? [];
}

export function setHistory(psid: string, messages: Msg[]): void {
  // Keep only the last MAX_TURNS user-or-assistant turns to bound context size.
  const trimmed = trim(messages, MAX_TURNS);
  threads.set(psid, { messages: trimmed, lastSeen: Date.now() });
}

export function clearHistory(psid: string): void {
  threads.delete(psid);
}

function trim(messages: Msg[], maxTurns: number): Msg[] {
  // A "turn" is one user message + its assistant reply (which may include tool_use cycles).
  // We trim from the start. Be careful not to leave a tool_result without its tool_use.
  if (messages.length <= maxTurns * 2) return messages;
  // Find the first user message after the cutoff so the slice starts on a clean boundary.
  const cut = messages.length - maxTurns * 2;
  for (let i = cut; i < messages.length; i++) {
    if (messages[i].role === "user") {
      // Make sure the user message at index i is not a tool_result block (which must follow tool_use).
      const content = messages[i].content;
      const isToolResult =
        Array.isArray(content) &&
        content.some(
          (b) => typeof b === "object" && (b as { type?: string }).type === "tool_result"
        );
      if (!isToolResult) return messages.slice(i);
    }
  }
  return messages;
}
