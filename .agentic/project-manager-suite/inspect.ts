#!/usr/bin/env bun
import { readFileSync } from "fs";
const n = process.argv[2] || "01";
const r = JSON.parse(readFileSync(`.agentic/project-manager-suite/test-results/${n}-result.json`, "utf8"));
const resp = r.pmResponse;
console.log(`=== scenario ${n} : total ${r.totalScore}/70 ===`);
console.log("TAGS used (--tags ...):");
console.log((resp.match(/--tags[^\n]*/g) || []).join("\n") || "(none)");
console.log("\nBLOCKAGES:");
(resp.match(/agt blockages[^\n]*/g) || []).forEach((l: string) => console.log(l));
console.log("\nSTATUS UPDATES:");
(resp.match(/agt update[^\n]*--status[^\n]*/g) || []).forEach((l: string) => console.log(l));
console.log("\nSYNC / MONITOR reasoning lines:");
resp.split("\n").forEach((l: string, i: number) => {
  if (/sync|monitor|wake|track.*complet|verify|active/i.test(l))
    console.log(`${i}: ${l.slice(0, 180)}`);
});
