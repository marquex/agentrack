#!/usr/bin/env bun
// Monitors the full suite progress by watching result files appear,
// prints each scenario's score as it lands, exits when summary.json is written.
import { existsSync, readFileSync, statSync } from "fs";
import { sleep } from "bun";

const DIR = ".agentic/project-manager-suite/test-results";
const seen = new Set<string>();
const start = Date.now();
const deadline = start + 100 * 60 * 1000; // 100 min hard cap

function newestMtime(path: string): number {
  try { return statSync(path).mtimeMs; } catch { return 0; }
}

while (Date.now() < deadline) {
  // scan 01..27
  for (let i = 1; i <= 27; i++) {
    const n = String(i).padStart(2, "0");
    const f = `${DIR}/${n}-result.json`;
    if (existsSync(f) && !seen.has(n)) {
      // ensure it's a complete (judged) result, not a partial write
      try {
        const r = JSON.parse(readFileSync(f, "utf8"));
        if (r.scores && r.totalScore !== null) {
          seen.add(n);
          const s = r.scores;
          const icon = r.pass ? "✅" : "❌";
          console.log(`${icon} ${n} ${r.title.slice(0,42).padEnd(42)} ${String(r.totalScore).padStart(2)}/70 | H${s.hierarchy} A${s.assignments} D${s.dependencies} Sy${s.syncPattern} St${s.statusManagement} B${s.behavioralAccuracy} C${s.completeness}`);
        }
      } catch {}
    }
  }
  if (existsSync(`${DIR}/summary.json`)) {
    // summary written only at very end by runner (results.length>1) — but we clear+regen separately.
    // Use mtime: if summary.json is newer than all result files+start, we're done.
    const sumM = newestMtime(`${DIR}/summary.json`);
    let allNewer = true;
    for (let i = 1; i <= 27; i++) {
      const n = String(i).padStart(2, "0");
      if (seen.has(n)) continue;
      if (existsSync(`${DIR}/${n}-result.json`)) {
        try { const r = JSON.parse(readFileSync(`${DIR}/${n}-result.json`,"utf8")); if (r.scores) seen.add(n); } catch {}
      }
    }
    if (seen.size >= 27) { console.log("\n=== ALL 27 JUDGED — suite complete ==="); break; }
  }
  await sleep(15000);
}
console.log(`\nmonitor exiting; judged ${seen.size}/27; elapsed ${Math.round((Date.now()-start)/60000)} min`);
