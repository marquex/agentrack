#!/usr/bin/env bun

import { normalizeLogs } from "./log.utils";

const [logFilePath] = process.argv.slice(2);

if (!logFilePath) {
  process.stderr.write("Usage: bun log.cli.ts <filepath>\n");
  process.exit(1);
}

try {
  const normalized = normalizeLogs(logFilePath);
  process.stdout.write(`${JSON.stringify(normalized, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
