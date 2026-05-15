// Claude tool-use orchestration for the Zaisan High Land bot.
// Single tool: show_photos. We run a short tool loop because Claude may decide to
// call show_photos before producing its text reply. The actual Facebook image send
// happens server-side based on the categories Claude picked.
import Anthropic from "@anthropic-ai/sdk";
import { tools, SYSTEM_PROMPT } from "./tools.js";
import type { Msg } from "./conversation.js";

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
const MAX_TOOL_LOOPS = 3;

export type PhotoCategory = "exterior" | "interior";

export interface TurnResult {
  reply: string;
  photoCategories: PhotoCategory[];
  history: Msg[];
}

export async function runTurn(
  history: Msg[],
  userText: string
): Promise<TurnResult> {
  const messages: Msg[] = [...history, { role: "user", content: userText }];

  const photoCategories: PhotoCategory[] = [];
  let finalText = "";

  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.3,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ] as unknown as Anthropic.TextBlockParam[],
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "show_photos") {
        const input = block.input as { category?: string };
        const cat = input.category === "interior" ? "interior" : "exterior";
        if (!photoCategories.includes(cat)) photoCategories.push(cat);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Photos for "${cat}" will be delivered to the customer by the system.`,
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: unknown tool '${block.name}'`,
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText =
      "Уучлаарай, түр алдаа гарлаа. Дахин оролдоно уу, эсвэл борлуулалтын алба 8861-2088 руу холбогдоно уу.";
  }

  return { reply: finalText, photoCategories, history: messages };
}
