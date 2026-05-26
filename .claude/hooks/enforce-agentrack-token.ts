#!/usr/bin/env bun
/**
 * enforce-agentrack-token.ts
 *
 * PreToolUse hook that ensures agents use their own agentrack token
 * when calling the agt CLI.
 *
 * Token resolution:
 *   - Looks up the agent's token from .agentrack/users.json by matching
 *     the agent_type against the user name.
 *   - Strips any token the agent may have manually put in the command and
 *     injects the correct one from users.json.
 *   - Injects the token as AGT_USER_TOKEN=xxx prefix.
 *
 * Decision logic:
 *   1. No agent_type → main agent, allow
 *   2. Not a Bash command → allow
 *   3. Command doesn't contain "agt" → allow (safety net)
 *   4. Look up agent's token from .agentrack/users.json
 *   5. If not found → deny (agent is not registered as an agentrack user)
 *   6. Strip any existing AGENTRACK_TOKEN / AGT_USER_TOKEN from command
 *   7. Inject the resolved token via updatedInput → allow
 *
 * Run with Bun (https://bun.sh). Uses only Node-compatible APIs.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ---------- types ----------

interface HookEvent {
  agent_type?: string;
  cwd?: string;
  tool_name: string;
  tool_input?: Record<string, unknown>;
}

interface UserRecord {
  name: string;
  token: string;
  registeredAt: string;
}

interface UsersFile {
  users: UserRecord[];
}

// ---------- decision helpers ----------

function decide(
  decision: 'allow' | 'deny',
  reason: string,
  updatedInput?: Record<string, unknown>,
): never {
  const output: Record<string, unknown> = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  };
  if (updatedInput && decision === 'allow') {
    output.hookSpecificOutput = {
      ...output.hookSpecificOutput as Record<string, unknown>,
      updatedInput,
    };
  }
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

const allow = (reason: string, updatedInput?: Record<string, unknown>): never =>
  decide('allow', reason, updatedInput);
const deny  = (reason: string): never => decide('deny', reason);

// ---------- stdin ----------

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c: string) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// ---------- helpers ----------

/**
 * Strip any existing AGENTRACK_TOKEN or AGT_USER_TOKEN assignment
 * from a command string, so we can inject the correct one.
 */
function stripExistingTokenEnv(cmd: string): string {
  return cmd
    .replace(/\bAGT_USER_TOKEN=\S+\s*/g, '')
    .replace(/\bAGENTRACK_TOKEN=\S+\s*/g, '')
    .trimStart();
}

/**
 * Look up an agent's agentrack token from the users file by matching
 * the agent_type against the registered user name.
 */
function lookupToken(agentType: string, cwd: string): string | undefined {
  const usersPath = join(cwd, '.agentrack', 'users.json');
  try {
    const raw = readFileSync(usersPath, 'utf-8');
    const data = JSON.parse(raw) as UsersFile;
    const user = data.users.find((u) => u.name === agentType);
    return user?.token;
  } catch {
    return undefined;
  }
}

// ---------- main ----------

async function main(): Promise<never> {
  let event: HookEvent;
  try {
    event = JSON.parse(await readStdin()) as HookEvent;
  } catch {
    process.exit(0);
  }

  const agentType = event.agent_type;
  if (!agentType) return allow('main agent, no token enforcement');

  const toolName = event.tool_name;
  if (toolName !== 'Bash') return allow('not a Bash command');

  const toolInput = event.tool_input ?? {};
  const cmd = (toolInput.command as string | undefined) ?? '';

  // Only enforce for agt commands
  if (!cmd.includes('agt')) return allow('not an agt command');

  // Look up the agent's token from users.json
  const cwd = event.cwd ?? process.cwd();
  const token = lookupToken(agentType, cwd);

  if (!token) {
    return deny(
      `enforce-agentrack-token: agent '${agentType}' is not registered as an agentrack user. ` +
      `Ask your manager to register you with: agt users register "${agentType}"`
    );
  }

  // Strip any existing token env var the agent might have set, then inject the correct one
  const cleanCmd = stripExistingTokenEnv(cmd);
  const injectedCmd = `AGT_USER_TOKEN="${token}" ${cleanCmd}`;

  const updatedInput: Record<string, unknown> = { ...toolInput, command: injectedCmd };

  return allow(
    `enforce-agentrack-token: injected token for agent '${agentType}'`,
    updatedInput,
  );
}

main().catch(() => process.exit(0));
