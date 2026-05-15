// Tool schemas exposed to Claude. Single tool: show_photos. Claude calls it when the
// customer asks about the building exterior or interior layout; the server handles the
// actual Facebook image-attachment send based on which category Claude picked.
//
// System prompt loading: combines `prompts/zaisan-system-prompt.md` (rules + flow) with
// `knowledge/zaisan-high-land.md` (facts) at module load. The {{KNOWLEDGE}} placeholder
// is substituted once. Both files are copied next to this module during `npm run build`.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "show_photos",
    description:
      "Zaisan High Land хотхоны бодит зургуудыг харилцагчид илгээнэ. Хэрэглэгч барилгын хийцлэл/гадна тал/архитектур/орчны талаар асуувал category='exterior'. Өрөөний зохион байгуулалт/A type/B type/дотор тал/гал тогоо/зочны өрөө асуувал category='interior'. Зөвхөн холбогдох сэдвээр асуусан үед дуудна — өөрөөсөө шахаж явуулахгүй. Нэг сэдэвт нэг л удаа.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["exterior", "interior"],
          description: "exterior = гадна барилгын зургууд. interior = дотор өрөөний зургууд.",
        },
      },
      required: ["category"],
    },
  },
];

const here = dirname(fileURLToPath(import.meta.url));

function loadCombinedSystemPrompt(): string {
  const promptPath = join(here, "prompts", "zaisan-system-prompt.md");
  const knowledgePath = join(here, "knowledge", "zaisan-high-land.md");
  const template = readFileSync(promptPath, "utf-8");
  const knowledge = readFileSync(knowledgePath, "utf-8");
  return template.replace("{{KNOWLEDGE}}", knowledge);
}

// Computed once at module load — no disk reads on the hot path.
export const SYSTEM_PROMPT: string = loadCombinedSystemPrompt();
