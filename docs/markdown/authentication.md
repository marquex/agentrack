# Authentication

Agentrack supports a lightweight token-based authentication system for attributing actions to specific users. This is useful when multiple agents or humans share the same tracker and you need to know who did what.

Authentication is **not** about security -- tokens are simple random strings, not cryptographic secrets. The goal is attribution: recording which user created an issue, added a comment, or resolved a blockage.

## Auth modes

The auth mode is configured in `.agentrack/config.json` and controls when a token is required.

### `open` -- No token required

All commands work without a token. If a mutating command runs without a token, the action is attributed to the configured `defaultUser`.

```json
{
  "auth": {
    "mode": "open",
    "defaultUser": "anonymous"
  }
}
```

Use this for single-agent setups, local development, or when attribution is nice-to-have but not essential.

### `read-only` -- Tokens for writes only

Read commands (`list`, `view`, `history`, `comments list`, `blockages list`) work without a token. Mutating commands (`create`, `update`, `comments add/update/delete`, `blockages add/resolve/delete`) require a valid token.

```json
{
  "auth": {
    "mode": "read-only",
    "defaultUser": "anonymous"
  }
}
```

This is the default mode, balancing convenience for querying with accountability for changes.

### `strict` -- Tokens for everything

All commands require a valid token -- both reads and writes.

```json
{
  "auth": {
    "mode": "strict",
    "defaultUser": "anonymous"
  }
}
```

Use this when you want full traceability of who is accessing issues.

### Summary

| Mode | Reads without token | Writes without token |
|------|--------------------|----------------------|
| `open` | Allowed | Allowed (attributed to `defaultUser`) |
| `read-only` | Allowed | Rejected (`TOKEN_REQUIRED`) |
| `strict` | Rejected (`TOKEN_REQUIRED`) | Rejected (`TOKEN_REQUIRED`) |

## Tokens

When you register a user, agentrack generates a short token prefixed with `tk_` followed by 8 random characters:

```
tk_k7x2m9p4
```

Tokens are stored in `.agentrack/users.json` and used to identify the user for each action.

### Passing the token

Set the `AGT_USER_TOKEN` environment variable before running commands:

```bash
export AGT_USER_TOKEN=tk_k7x2m9p4
agt create "Fix login bug" --status todo
```

This keeps tokens out of command-line arguments (where they could appear in shell history or process listings) and makes it easy for agents and scripts to authenticate once per session.

## User management

### Register a user

Create a new user and get a token:

```bash
agt users register alice
```

Output:

```json
{ "result": "OK", "name": "alice", "token": "tk_k7x2m9p4" }
```

Save the token -- it won't be shown again.

Notes:
- User names are case-insensitive and stored in lowercase.
- The name `anonymous` is reserved for the default unauthenticated user.
- Registration does not require a token (it's how you obtain one).

### List users

See all registered users:

```bash
agt users list
```

Output:

```json
[
  { "name": "alice", "registeredAt": "2025-01-15T10:00:00.000Z" },
  { "name": "bob", "registeredAt": "2025-01-16T14:30:00.000Z" }
]
```

Tokens are **never** included in list output.

### Revoke a user

Remove a user's access:

```bash
export AGT_USER_TOKEN=tk_k7x2m9p4
agt users revoke bob
```

Output:

```json
{ "result": "OK" }
```

The revoked user's token will no longer be accepted.

### Regenerate a token

If a token is accidentally exposed, generate a new one (the old token is invalidated):

```bash
export AGT_USER_TOKEN=tk_k7x2m9p4
agt users regenerate alice
```

Output:

```json
{ "result": "OK", "name": "alice", "token": "tk_r5t1y8u2" }
```

Only the user themselves can regenerate their token (the `AGT_USER_TOKEN` must match the user's current token).

> **Library API:** When calling `tracker.usersRegenerate(name, params?)` programmatically in open-auth mode (no `AGT_USER_TOKEN` set), pass `{ token: "tk_…" }` as the second argument to prove the caller's identity. The explicit token overrides the ambient environment variable. This is how the webapp forwards the authenticated session's token.

## Author field in events

Every mutating action generates an event with an `author` field containing the resolved user name:

```json
{
  "timestamp": "2025-01-15T10:00:00.000Z",
  "type": "update",
  "author": "alice",
  "content": { "status": "in-progress" }
}
```

In `open` mode without a token, the author is set to the configured `defaultUser`.

## Multi-agent setup example

Here's how to set up authentication for a team of three agents:

```bash
# Register each agent
agt users register researcher
# { "result": "OK", "name": "researcher", "token": "tk_aaaa1111" }

agt users register coder
# { "result": "OK", "name": "coder", "token": "tk_bbbb2222" }

agt users register reviewer
# { "result": "OK", "name": "reviewer", "token": "tk_cccc3333" }
```

Then each agent sets its token in its environment:

```bash
# In the researcher's session
export AGT_USER_TOKEN=tk_aaaa1111
agt create "Research caching strategies" --status todo --assignee researcher

# In the coder's session
export AGT_USER_TOKEN=tk_bbbb2222
agt update m1x2k9ab --status "in-progress" --assignee coder

# In the reviewer's session
export AGT_USER_TOKEN=tk_cccc3333
agt comments add m1x2k9ab --content "Looks good, approved."
```

When you view the issue history, each event shows which agent performed the action:

```bash
agt history m1x2k9ab
```

## Error codes

| Error | Meaning |
|-------|---------|
| `TOKEN_REQUIRED` | A token is required by the current auth mode but none was provided |
| `INVALID_TOKEN` | The provided token doesn't match any registered user |
| `DEFAULT_USER_MISSING` | Auth mode is `open` but no `defaultUser` is configured |
| `USER_ALREADY_EXISTS` | A user with that name is already registered |
| `USER_NOT_FOUND` | No user with that name exists |

## See also

- [The issue object](./issue-object.md) -- How the author field appears in issue events
- [CLI reference](./cli-reference.md) -- Full command documentation
- [JavaScript reference](./javascript-reference.md) -- User management methods on the Tracker class
