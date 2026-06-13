#!/usr/bin/env bun
// Wait until at least N result files exist (or timeout), then print all current scores.
import { existsSync, readFileSync, readdirSync } from "fs";
import { sleep } from "bun";

const DIR = ".agentic/project-manager-suite/test-results";
const TARGET = parseInt(process.argv[2] || "7", 10);
const deadline = Date.now() + 50 * 60 * 1000;

function judged(): string[] {
  return readdirSync(DIR)
    .filter(f => /^\d{2}-result\.json$/.test(f))
    .filter(f => {
      try { const r = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")); return r.scores && r.totalScore !== null; } catch { return false; }
    })
    .sort();
}

let prev = 0;
while (Date.now() < deadline) {
  const done = judged();
  if (done.length !== prev) {
    prev = done.length;
    console.log(`[${new Date().toISOString().slice(11,19)}] ${done.length}/27 judged`);
  }
  if (done.length >= TARGET || done.length >= 27) break;
  await sleep(20000);
}

console.log(`\n=== ${judged().length} scenarios judged ===`);
for (const f of judged()) {
  try {
    const r = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
    const s = r.scores;
    const pct = Math.round((r.totalScore / 70) * 100);
    const icon = pct >= 85 ? "✅85" : r.pass ? "🟡pass" : "❌";
    console.log(`${icon} ${f.slice(0,2)} ${r.title.slice(0,40).padEnd(40)} ${String(r.totalScore).padStart(2)}/70 (${pct}%) | H${s.hierarchy} A${s.assignments} D${s.dependencies} Sy${s.syncPattern} St${s.statusManagement} B${s.behavioralAccuracy} C${s.completeness}`);
  } catch {}
}
