// Copies the knowledge + system-prompt markdown next to the compiled JS so tools.ts
// can readFileSync them at runtime. Run after `tsc` from `npm run build`.
// Fails loudly (non-zero exit) if a source folder is missing or has no .md files —
// otherwise a silent miss here means the bot ships with no system prompt and crashes
// at first request, which is harder to diagnose than a build failure.
const fs = require("fs");
const path = require("path");

const SUBDIRS = ["knowledge", "prompts"];

let totalCopied = 0;
for (const sub of SUBDIRS) {
  const srcDir = path.join("src", sub);
  const distDir = path.join("dist", sub);

  if (!fs.existsSync(srcDir)) {
    console.error(`[copy-assets] FAIL: missing source dir ${srcDir}`);
    process.exit(1);
  }
  fs.mkdirSync(distDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`[copy-assets] FAIL: no .md files in ${srcDir}`);
    process.exit(1);
  }

  for (const f of files) {
    const from = path.join(srcDir, f);
    const to = path.join(distDir, f);
    fs.copyFileSync(from, to);
    console.log(`[copy-assets] ${from} -> ${to}`);
    totalCopied++;
  }
}

console.log(`[copy-assets] OK — copied ${totalCopied} file(s)`);
