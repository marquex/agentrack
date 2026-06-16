#!/usr/bin/env bun
// Temp helper to print scores from result JSONs
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
const dir = join(import.meta.dir, "test-results");
const files = readdirSync(dir).filter(f => /-result\.json$/.test(f)).sort();
for (const f of files) {
  try {
    const r = JSON.parse(readFileSync(join(dir, f), "utf-8"));
    const s = r.scores;
    if (!s) { console.log(`${r.scenario} ${r.title.slice(0,46).padEnd(46)} (no scores — ${(r.error||"pending").slice(0,60)})`); continue; }
    console.log(`${r.scenario} ${r.title.slice(0,46).padEnd(46)} ${String(r.totalScore).padStart(2)}/70 ${r.pass ? "PASS" : "FAIL"} | sync=${s.syncPattern} status=${s.statusManagement} behav=${s.behavioralAccuracy} compl=${s.completeness}`);
  } catch (e) { console.log(f, "read error"); }
}
