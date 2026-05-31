import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';

interface HookInput {
    session_id?: string;
    hook_event_name?: string;
    agent_type?: string;
    prompt?: string;
}

function flagDir(): string {
    const dir = join(tmpdir(), 'claude-new-expertise-hook');
    mkdirSync(dir, {recursive: true});
    return dir;
}

function flagPath(sessionId: string, agentType: string): string {
    return join(flagDir(), `${sessionId}-${agentType}.flag`);
}

function emit(output: unknown): void {
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
}

async function readStdin(): Promise<HookInput | null> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    try {
        return JSON.parse(Buffer.concat(chunks).toString()) as HookInput;
    } catch {
        return null;
    }
}

function handleUserPromptSubmit(input: HookInput): void {
    const {agent_type, session_id} = input;
    if (!agent_type || !session_id) process.exit(0);

    // Only remind once per session — the first time a prompt is submitted.
    // After the agent consults the expertise-manager it will have the context
    // for the rest of the session.
    if (existsSync(flagPath(session_id, agent_type))) process.exit(0);

    writeFileSync(flagPath(session_id, agent_type), '1');

    emit({
        hookSpecificOutput: {
            hookEventName: 'UserPromptSubmit',
            additionalContext:
                `You are agent "${agent_type}". ` +
                'Before doing anything on this task, ask the `expertise-manager` agent for relevant expertise context. ' +
                'Use the bash command `claude -p the Agent tool with subagent_type "expertise-manager" and pass your agent type name along with the task description ' +
                'so it can give you relevant context for resolving the task efficiently. Dont do anything else before that.'
        },
    });
}

async function main(): Promise<void> {
    const input = await readStdin();
    if (!input) process.exit(0);

    switch (input.hook_event_name) {
        case 'UserPromptSubmit':
            return handleUserPromptSubmit(input);
        default:
            process.exit(0);
    }
}

main();
