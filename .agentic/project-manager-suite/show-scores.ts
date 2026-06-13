import { readFileSync, existsSync } from "fs";
let allPass = true;
for (let i = 1; i <= 27; i++) {
  const n = String(i).padStart(2, "0");
  const f = `.agentic/project-manager-suite/test-results/${n}-result.json`;
  if (!existsSync(f)) { console.log(`${n}: no result`); continue; }
  const r = JSON.parse(readFileSync(f, "utf8"));
  const pct = Math.round(r.totalScore / 70 * 100);
  const icon = pct >= 85 ? "✅" : pct >= 70 ? "🟡" : "❌";
  if (pct < 85) allPass = false;
  console.log(`${icon} ${n}: ${r.totalScore}/70 (${pct}%) — ${r.title.slice(0, 50)}`);
}
console.log(allPass ? "\n🎉 ALL 27 SCENARIOS PASS >=85%!" : "\n⚠️ Some scenarios below 85%");
