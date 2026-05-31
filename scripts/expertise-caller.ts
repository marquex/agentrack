#!/usr/bin/env bun

import { resolve } from "node:path";
import { spawn } from "bun";

const [agentName, ...promptParts] = process.argv.slice(2);
const prompt = promptParts.join(" ").trim();

if (!agentName || !prompt) {
  console.error("Usage: bun scripts/expertise-caller.ts <agentName> <prompt>");
  process.exit(1);
}

const ROOT = resolve(import.meta.dir, "..");
const progressIntervalMs = 5_000;
const minuteTicks = 60_000 / progressIntervalMs;

process.stdout.write("Searching through the expertise, please wait");

let ticks = 0;
const progressTimer = setInterval(() => {
  ticks += 1;
  process.stdout.write(".");

  if (ticks % minuteTicks === 0) {
    process.stdout.write("*");
  }
}, progressIntervalMs);

const managerPrompt = `The agent "${agentName}" is asking for: \n\n ${prompt}`;

const proc = spawn(["claude", "--agent", "expertise-manager", "-p", managerPrompt], {
  cwd: ROOT,
  stdout: "pipe",
  stderr: "pipe",
  env: process.env,
});

const stdoutPromise = new Response(proc.stdout).text();
const stderrPromise = new Response(proc.stderr).text();
const exitCode = await proc.exited;

clearInterval(progressTimer);
process.stdout.write("\n");

const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);

if (stdout) {
  process.stdout.write(stdout);
}

if (stderr) {
  process.stderr.write(stderr);
}

process.exit(exitCode);