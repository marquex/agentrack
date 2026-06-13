/**
 * Regenerate test-results/summary.json from the per-scenario *-result.json files.
 *
 * The runner only writes summary.json when you run >1 scenario at once. If you
 * re-run individual scenarios (--scenario N, or --judge-only --scenario N) the
 * per-scenario files update but summary.json goes stale. Run this to rebuild it:
 *
 *   bun run .agentic/project-manager-suite/regenerate-summary.ts
 *
 * Prints the headline stats (pass rate, averages, per-dimension, per-team/loop)
 * so you can eyeball the current state of the suite without re-running anything.
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = join(import.meta.dir, "test-results");

// Team / loop per scenario (mirrors test-runner.ts constants)
const SCENARIO_TEAMS: Record<string, string> = {
  "01":"library-webapp","02":"android","03":"quantedge","04":"library-webapp","05":"android",
  "06":"library-webapp","07":"quantedge","08":"android","09":"library-webapp","10":"quantedge",
  "11":"quantedge","12":"library-webapp","13":"android","14":"android","15":"quantedge",
  "16":"android","17":"library-webapp","18":"library-webapp","19":"quantedge","20":"quantedge",
  "21":"android","22":"quantedge","23":"android","24":"quantedge","25":"android","26":"quantedge","27":"android",
};
const LOOP_MAP: Record<string,string> = {
  "01":"work","02":"work","03":"work","04":"work","05":"work","06":"work",
  "07":"status","08":"status","09":"status","10":"status",
  "11":"ideas","12":"ideas","13":"ideas","14":"ideas","15":"error","16":"ideas",
  "17":"error","18":"error","19":"error","20":"work","21":"work","22":"work","23":"work",
  "24":"error","25":"error","26":"ideas","27":"work",
};
const DIMS = ["hierarchy","assignments","dependencies","syncPattern","statusManagement","behavioralAccuracy","completeness"] as const;
const TEAM_LABELS: Record<string,string> = {"library-webapp":"Library + Webapp", quantedge:"QuantEdge", android:"AndroidApp"};
const LOOP_LABELS: Record<string,string> = {work:"Work Loop", status:"Status Loop", ideas:"Ideas Loop", error:"Error & Edge Cases"};

const files = readdirSync(DIR).filter((f) => /^\d{2}-result\.json$/.test(f)).sort();
const results: any[] = [];
for (const f of files) {
  try { results.push(JSON.parse(readFileSync(join(DIR, f), "utf-8"))); }
  catch (e) { console.error("  skip", f); }
}
results.sort((a, b) => Number(a.scenario) - Number(b.scenario));

writeFileSync(join(DIR, "summary.json"), JSON.stringify(results, null, 2), "utf-8");

const scored = results.filter((r) => r.scores);
const unscored = results.filter((r) => !r.scores);
const passed = scored.filter((r) => r.pass);
const overallAvg = scored.reduce((s, r) => s + r.totalScore, 0) / scored.length;
const dimAvg: Record<string, number> = {};
for (const d of DIMS) dimAvg[d] = scored.reduce((s, r) => s + (r.scores?.[d] ?? 0), 0) / scored.length;

const byTeam: Record<string, {n:number;pass:number;sum:number}> = {};
const byLoop: Record<string, {n:number;pass:number;sum:number}> = {};
for (const r of scored) {
  const t = SCENARIO_TEAMS[r.scenario] ?? r.team;
  const l = LOOP_MAP[r.scenario] ?? r.loop;
  byTeam[t] ??= {n:0,pass:0,sum:0}; byTeam[t].n++; byTeam[t].sum += r.totalScore; if (r.pass) byTeam[t].pass++;
  byLoop[l] ??= {n:0,pass:0,sum:0}; byLoop[l].n++; byLoop[l].sum += r.totalScore; if (r.pass) byLoop[l].pass++;
}
const r2 = (n: number) => Math.round(n * 10) / 10;
const passPct = r2((passed.length / Math.max(scored.length, 1)) * 100);
const avgPct = r2((overallAvg / 70) * 100);

console.log(`\nsummary.json regenerated — ${results.length} scenarios (${scored.length} scored, ${unscored.length} unscored)`);
console.log(`Pass: ${passed.length}/${scored.length} (${passPct}%)  •  Avg: ${r2(overallAvg)}/70 (${avgPct}%)\n`);
console.log("Dimensions:");
for (const d of DIMS) console.log(`  ${d.padEnd(20)} ${r2(dimAvg[d])}/10`);
console.log("\nBy team:");
for (const k of Object.keys(byTeam)) { const v = byTeam[k]; console.log(`  ${(TEAM_LABELS[k]||k).padEnd(18)} ${v.pass}/${v.n} passed  avg ${r2(v.sum/v.n)}`); }
console.log("\nBy loop:");
for (const k of Object.keys(byLoop)) { const v = byLoop[k]; console.log(`  ${(LOOP_LABELS[k]||k).padEnd(18)} ${v.pass}/${v.n} passed  avg ${r2(v.sum/v.n)}`); }
if (unscored.length) console.log(`\nUnscored: ${unscored.map((r) => r.scenario).join(", ")}`);
