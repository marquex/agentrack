import { afterEach, describe, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  WORKTREE_BRANCH,
  WORKTREE_DIR,
  commitGitignoreChange,
  commitWorktreeData,
  detectInitScenario,
  initWorktree,
  initFreshWorktree,
  initJoinWorktree,
  isWorktreeInitialized,
  pullWorktree,
  pushWorktree,
} from '../../src/core/worktree';
import { AgentrackError } from '../../src/core/errors';
import { Tracker } from '../../src/core/tracker';

describe('worktree', () => {
  const tmpDirs: string[] = [];

  function createTempDir(): string {
    const dir = join(
      tmpdir(),
      'agentrack-wt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    );
    mkdirSync(dir, { recursive: true });
    tmpDirs.push(dir);
    return realpathSync(dir);
  }

  function createGitRepo(dir: string): string {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.email test@test.com', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.name Test', { cwd: dir, stdio: 'ignore' });
    writeFileSync(join(dir, 'README.md'), '# Test\n');
    execSync('git add .', { cwd: dir, stdio: 'ignore' });
    execSync('git commit -m initial', { cwd: dir, stdio: 'ignore' });
    return dir;
  }

  function createBareRepo(dir: string): string {
    mkdirSync(dir, { recursive: true });
    execSync('git init --bare', { cwd: dir, stdio: 'ignore' });
    return dir;
  }

  function createGitRepoWithRemote(): { local: string; remote: string; base: string } {
    const base = createTempDir();
    const remote = join(base, 'remote.git');
    const local = join(base, 'local');
    createBareRepo(remote);
    mkdirSync(local);
    createGitRepo(local);
    execSync('git remote add origin ' + remote, { cwd: local, stdio: 'ignore' });
    execSync('git push -u origin main', { cwd: local, stdio: 'ignore' });
    return { local, remote, base };
  }

  function cleanupWorktree(dir: string): void {
    try {
      execSync('git worktree remove -f ' + join(dir, WORKTREE_DIR) + ' 2>/dev/null || true', {
        cwd: dir,
        stdio: 'ignore',
      });
    } catch { /* worktree may not exist */ }
    try {
      execSync('git worktree prune', { cwd: dir, stdio: 'ignore' });
    } catch { /* prune is best-effort */ }
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      cleanupWorktree(dir);
    }
    for (const dir of tmpDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  describe('constants', () => {
    test('WORKTREE_BRANCH is _agentrack', () => {
      expect(WORKTREE_BRANCH).toBe('_agentrack');
    });
    test('WORKTREE_DIR is .agentrack', () => {
      expect(WORKTREE_DIR).toBe('.agentrack');
    });
  });

  describe('detectInitScenario', () => {
    test('returns fresh when no remote branch exists', () => {
      const { local } = createGitRepoWithRemote();
      expect(detectInitScenario(local)).toBe('fresh');
    });
    test('returns join when remote branch exists', () => {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git push origin ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git branch -D ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      expect(detectInitScenario(local)).toBe('join');
    });
    test('returns fresh when no remote is configured', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      expect(detectInitScenario(dir)).toBe('fresh');
    });
  });

  describe('isWorktreeInitialized', () => {
    test('returns false when no worktree exists', () => {
      const { local } = createGitRepoWithRemote();
      expect(isWorktreeInitialized(local)).toBe(false);
    });
    test('returns true after successful initWorktree', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      expect(isWorktreeInitialized(local)).toBe(true);
    });
    test('returns false when .agentrack is a plain directory', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      mkdirSync(join(dir, WORKTREE_DIR));
      expect(isWorktreeInitialized(dir)).toBe(false);
    });
    test('returns false when .agentrack does not exist', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      expect(isWorktreeInitialized(dir)).toBe(false);
    });
  });

  describe('initWorktree: fresh scenario (AC1)', () => {
    test('creates orphan _agentrack branch', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const branches = execSync('git branch --list', { cwd: local, encoding: 'utf-8' });
      expect(branches).toContain(WORKTREE_BRANCH);
    });
    test('pushes _agentrack branch to remote', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const remoteBranches = execSync('git branch -r', { cwd: local, encoding: 'utf-8' });
      expect(remoteBranches).toContain('origin/' + WORKTREE_BRANCH);
    });
    test('mounts worktree at .agentrack/', () => {
      const { local } = createGitRepoWithRemote();
      const result = initWorktree(local);
      expect(existsSync(join(local, WORKTREE_DIR))).toBe(true);
      expect(result.path).toBe(resolve(local, WORKTREE_DIR));
    });
    test('adds /.agentrack/ to .gitignore', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const gitignorePath = join(local, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
      expect(readFileSync(gitignorePath, 'utf-8')).toContain('/.agentrack/');
    });
    test('creates initial data files', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const wtDir = join(local, WORKTREE_DIR);
      expect(existsSync(join(wtDir, 'config.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'index.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'dependencies.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'users.json'))).toBe(true);
    });
    test('data files have correct content', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const wtDir = join(local, WORKTREE_DIR);
      const config = JSON.parse(readFileSync(join(wtDir, 'config.json'), 'utf-8'));
      expect(config).toEqual({ auth: { mode: 'open', defaultUser: 'anonymous' } });
      const index = JSON.parse(readFileSync(join(wtDir, 'index.json'), 'utf-8'));
      expect(index).toEqual({ open: [], closed: [], childrenOf: {} });
      const deps = JSON.parse(readFileSync(join(wtDir, 'dependencies.json'), 'utf-8'));
      expect(deps).toEqual({ blockedBy: {}, blocks: {} });
      const users = JSON.parse(readFileSync(join(wtDir, 'users.json'), 'utf-8'));
      expect(users).toEqual({ users: [] });
    });
    test('returns fresh scenario with path', () => {
      const { local } = createGitRepoWithRemote();
      const result = initWorktree(local);
      expect(result.scenario).toBe('fresh');
      expect(result.path).toBe(resolve(local, WORKTREE_DIR));
    });
    test('does not modify the current code branch', () => {
      const { local } = createGitRepoWithRemote();
      const before = execSync('git rev-parse --abbrev-ref HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      initWorktree(local);
      const after = execSync('git rev-parse --abbrev-ref HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      expect(after).toBe(before);
    });
    test('does not change HEAD commit', () => {
      const { local } = createGitRepoWithRemote();
      const before = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      initWorktree(local);
      const after = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      expect(after).toBe(before);
    });
    test('works without remote (local-only branch)', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      const result = initWorktree(dir);
      expect(result.scenario).toBe('fresh');
      expect(existsSync(join(dir, WORKTREE_DIR, 'config.json'))).toBe(true);
    });
  });

  describe('initWorktree: join scenario (AC2)', () => {
    function setupJoinScenario(): string {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git push origin ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git branch -D ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git worktree prune', { cwd: local, stdio: 'ignore' });
      return local;
    }
    test('fetches remote branch and mounts worktree', () => {
      const local = setupJoinScenario();
      const result = initWorktree(local);
      expect(result.scenario).toBe('join');
      expect(existsSync(join(local, WORKTREE_DIR))).toBe(true);
    });
    test('returns join scenario with path', () => {
      const local = setupJoinScenario();
      const result = initWorktree(local);
      expect(result.scenario).toBe('join');
      expect(result.path).toBe(resolve(local, WORKTREE_DIR));
    });
    test('ensures .gitignore entry but does not duplicate', () => {
      const local = setupJoinScenario();
      writeFileSync(join(local, '.gitignore'), '/.agentrack/\n');
      initWorktree(local);
      const gitignore = readFileSync(join(local, '.gitignore'), 'utf-8');
      const matches = gitignore.match(/.agentrack/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe('initWorktree: already initialized (AC3)', () => {
    test('returns without error when worktree already exists', () => {
      const { local } = createGitRepoWithRemote();
      const first = initWorktree(local);
      const second = initWorktree(local);
      expect(second.path).toBe(first.path);
    });
  });

  describe('initWorktree: error paths (AC4)', () => {
    test('throws NOT_A_GIT_REPO when not in a git repository', () => {
      const dir = createTempDir();
      try { initWorktree(dir); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('NOT_A_GIT_REPO');
        expect(e.message).toBe('Not inside a git repository');
        expect(e.exitCode).toBe(13);
      }
    });
    test('throws MIGRATION_REQUIRED when .agentrack is a regular directory', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      mkdirSync(join(dir, WORKTREE_DIR));
      try { initWorktree(dir); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('MIGRATION_REQUIRED');
        expect(e.message).toContain('not a git worktree');
        expect(e.exitCode).toBe(14);
      }
    });
    test('throws MIGRATION_REQUIRED when .agentrack is a file', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      writeFileSync(join(dir, WORKTREE_DIR), 'not a directory');
      try { initWorktree(dir); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('MIGRATION_REQUIRED');
        expect(e.exitCode).toBe(14);
      }
    });
    test('throws INVALID_STATE when on _agentrack branch', () => {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git checkout ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      try { initWorktree(local); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('INVALID_STATE');
        expect(e.message).toContain('currently on the _agentrack branch');
        expect(e.exitCode).toBe(15);
      } finally {
        execSync('git checkout main', { cwd: local, stdio: 'ignore' });
      }
    });
  });

  describe('pushWorktree (AC5)', () => {
    test('stages, commits, and pushes changes', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      const result = pushWorktree(local);
      expect(result.synced).toBe(true);
      expect(result.commitCount).toBe(1);
    });
    test('uses custom message when provided', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      pushWorktree(local, 'custom message');
      const log = execSync('git log -1 --format=%s', {
        cwd: join(local, WORKTREE_DIR), encoding: 'utf-8',
      }).trim();
      expect(log).toBe('custom message');
    });
    test('auto-generates sync timestamp message', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      pushWorktree(local);
      const log = execSync('git log -1 --format=%s', {
        cwd: join(local, WORKTREE_DIR), encoding: 'utf-8',
      }).trim();
      expect(log).toMatch(/^sync: \d{4}-\d{2}-\d{2}T/);
    });
    test('returns synced false when no changes to sync', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const result = pushWorktree(local);
      expect(result.synced).toBe(false);
      expect(result.message).toBe('No changes to sync');
    });
    test('returns synced true when there are unpushed commits', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      execSync('git add -A', { cwd: join(local, WORKTREE_DIR), stdio: 'ignore' });
      execSync('git commit -m manual', { cwd: join(local, WORKTREE_DIR), stdio: 'ignore' });
      const result = pushWorktree(local);
      expect(result.synced).toBe(true);
      expect(result.commitCount).toBe(0);
    });
    test('throws NOT_INITIALIZED when no worktree', () => {
      const { local } = createGitRepoWithRemote();
      try { pushWorktree(local); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('NOT_INITIALIZED');
        expect(e.message).toContain('agt init');
        expect(e.exitCode).toBe(1);
      }
    });
    test('throws PUSH_FAILED when push fails', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      execSync('git remote set-url origin /nonexistent/path.git', { cwd: local, stdio: 'ignore' });
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      try { pushWorktree(local); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('PUSH_FAILED');
        expect(e.exitCode).toBe(16);
      }
    });
  });

  describe('pullWorktree (AC6)', () => {
    test('returns updated true when remote has new commits', () => {
      const { local, remote } = createGitRepoWithRemote();
      initWorktree(local);
      const otherBase = createTempDir();
      const other = join(otherBase, 'other');
      execSync('git clone ' + remote + ' ' + other, { stdio: 'ignore' });
      execSync('git config user.email test@test.com', { cwd: other, stdio: 'ignore' });
      execSync('git config user.name Test', { cwd: other, stdio: 'ignore' });
      execSync('git checkout ' + WORKTREE_BRANCH, { cwd: other, stdio: 'ignore' });
      writeFileSync(join(other, 'remote-update.txt'), 'from remote');
      execSync('git add -A', { cwd: other, stdio: 'ignore' });
      execSync('git commit -m remote-update', { cwd: other, stdio: 'ignore' });
      execSync('git push', { cwd: other, stdio: 'ignore' });
      const result = pullWorktree(local);
      expect(result.updated).toBe(true);
    });
    test('returns updated false when already up to date', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const result = pullWorktree(local);
      expect(result.updated).toBe(false);
    });
    test('throws NOT_INITIALIZED when no worktree', () => {
      const { local } = createGitRepoWithRemote();
      try { pullWorktree(local); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('NOT_INITIALIZED');
        expect(e.exitCode).toBe(1);
      }
    });
    test('throws PULL_FAILED when pull fails', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      execSync('git remote set-url origin /nonexistent/path.git', { cwd: local, stdio: 'ignore' });
      try { pullWorktree(local); expect(true).toBe(false); } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('PULL_FAILED');
        expect(e.exitCode).toBe(17);
      }
    });
  });

  describe('AC7: existing commands work with worktree', () => {
    async function initWithTracker(): Promise<string> {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const tracker = new Tracker(local);
      await tracker.init();
      return local;
    }
    test('tracker.create works after worktree init', async () => {
      const local = await initWithTracker();
      const tracker = new Tracker(local);
      const result = await tracker.create({ title: 'Test Issue' });
      expect('id' in result).toBe(true);
      if ('id' in result) expect(result.id).toHaveLength(10);
    });
    test('tracker.list works after worktree init', async () => {
      const local = await initWithTracker();
      const tracker = new Tracker(local);
      await tracker.create({ title: 'Issue A' });
      await tracker.create({ title: 'Issue B' });
      const list = await tracker.list({});
      expect(list).toHaveLength(2);
    });
    test('tracker.view works after worktree init', async () => {
      const local = await initWithTracker();
      const tracker = new Tracker(local);
      const created = await tracker.create({ title: 'Viewable' });
      if ('id' in created) {
        const view = await tracker.view(created.id);
        if ('title' in view) expect(view.title).toBe('Viewable');
      }
    });
    test('tracker.update works after worktree init', async () => {
      const local = await initWithTracker();
      const tracker = new Tracker(local);
      const created = await tracker.create({ title: 'Before' });
      if ('id' in created) {
        await tracker.update(created.id, { title: 'After' });
        const view = await tracker.view(created.id);
        if ('title' in view) expect(view.title).toBe('After');
      }
    });
    test('tracker.history works after worktree init', async () => {
      const local = await initWithTracker();
      const tracker = new Tracker(local);
      const created = await tracker.create({ title: 'History Test' });
      if ('id' in created) {
        const history = await tracker.history(created.id);
        expect(Array.isArray(history)).toBe(true);
        if (Array.isArray(history)) expect(history.length).toBeGreaterThan(0);
      }
    });
  });

  describe('AC8: directory structure after init', () => {
    test('.agentrack/ contains expected files', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const wtDir = join(local, WORKTREE_DIR);
      expect(existsSync(join(wtDir, 'config.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'index.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'dependencies.json'))).toBe(true);
      expect(existsSync(join(wtDir, 'users.json'))).toBe(true);
    });
    test('.agentrack/.git is a file (worktree pointer)', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const gitFile = join(local, WORKTREE_DIR, '.git');
      expect(existsSync(gitFile)).toBe(true);
      const stat = statSync(gitFile);
      expect(stat.isFile()).toBe(true);
    });
    test('worktree is listed in git worktree list', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const list = execSync('git worktree list --porcelain', {
        cwd: local, encoding: 'utf-8',
      });
      expect(list).toContain(join(local, WORKTREE_DIR));
      expect(list).toContain(WORKTREE_BRANCH);
    });
  });

  describe('gitignore handling', () => {
    test('creates .gitignore if it does not exist', () => {
      const { local } = createGitRepoWithRemote();
      const gitignorePath = join(local, '.gitignore');
      if (existsSync(gitignorePath)) unlinkSync(gitignorePath);
      initWorktree(local);
      expect(existsSync(gitignorePath)).toBe(true);
      expect(readFileSync(gitignorePath, 'utf-8')).toContain('/.agentrack/');
    });
    test('appends to existing .gitignore', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\ndist/\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('/.agentrack/');
    });
    test('does not duplicate when /.agentrack/ already present', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\n/.agentrack/\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      const matches = content.match(/\/\.agentrack\/+/g);
      expect(matches).toHaveLength(1);
    });
    test('recognizes .agentrack/ pattern (no leading slash)', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\n.agentrack/\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      const matches = content.match(/\.agentrack\/+/g);
      expect(matches).toHaveLength(1);
    });
    test('ignores commented-out .agentrack entries', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\n# /.agentrack/\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      expect(content).toContain('# /.agentrack/');
      expect(content).toContain('/.agentrack/');
      const realMatches = content.split('\n').filter((l) => l.trim() === '/.agentrack/');
      expect(realMatches).toHaveLength(1);
    });
  });

  describe('error codes match specification', () => {
    test('NOT_A_GIT_REPO exitCode 13', () => {
      const dir = createTempDir();
      try { initWorktree(dir); } catch (err) {
        expect((err as AgentrackError).result).toBe('NOT_A_GIT_REPO');
        expect((err as AgentrackError).exitCode).toBe(13);
      }
    });
    test('MIGRATION_REQUIRED exitCode 14', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      mkdirSync(join(dir, WORKTREE_DIR));
      try { initWorktree(dir); } catch (err) {
        expect((err as AgentrackError).result).toBe('MIGRATION_REQUIRED');
        expect((err as AgentrackError).exitCode).toBe(14);
      }
    });
    test('INVALID_STATE exitCode 15', () => {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git checkout ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      try { initWorktree(local); } catch (err) {
        expect((err as AgentrackError).result).toBe('INVALID_STATE');
        expect((err as AgentrackError).exitCode).toBe(15);
      }
      execSync('git checkout main', { cwd: local, stdio: 'ignore' });
    });
    test('PUSH_FAILED exitCode 16', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      execSync('git remote set-url origin /nonexistent/path.git', { cwd: local, stdio: 'ignore' });
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      try { pushWorktree(local); } catch (err) {
        expect((err as AgentrackError).result).toBe('PUSH_FAILED');
        expect((err as AgentrackError).exitCode).toBe(16);
      }
    });
    test('PULL_FAILED exitCode 17', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      execSync('git remote set-url origin /nonexistent/path.git', { cwd: local, stdio: 'ignore' });
      try { pullWorktree(local); } catch (err) {
        expect((err as AgentrackError).result).toBe('PULL_FAILED');
        expect((err as AgentrackError).exitCode).toBe(17);
      }
    });
  });

  describe('edge cases', () => {
    test('initFreshWorktree handles branch already existing locally', () => {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      const result = initFreshWorktree(local);
      expect(result.scenario).toBe('fresh');
      expect(existsSync(join(local, WORKTREE_DIR))).toBe(true);
    });
    test('initJoinWorktree handles branch already existing locally', () => {
      const { local } = createGitRepoWithRemote();
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git push origin ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      const result = initJoinWorktree(local);
      expect(result.scenario).toBe('join');
    });
    test('push after creating issues works end-to-end', async () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const tracker = new Tracker(local);
      await tracker.init();
      await tracker.create({ title: 'Issue 1' });
      await tracker.create({ title: 'Issue 2' });
      const result = pushWorktree(local);
      expect(result.synced).toBe(true);
      expect(result.commitCount).toBe(1);
    });
    test('pull after remote push reflects changes', () => {
      const { local, remote } = createGitRepoWithRemote();
      initWorktree(local);
      const otherBase = createTempDir();
      const other = join(otherBase, 'other');
      execSync('git clone ' + remote + ' ' + other, { stdio: 'ignore' });
      execSync('git config user.email test@test.com', { cwd: other, stdio: 'ignore' });
      execSync('git config user.name Test', { cwd: other, stdio: 'ignore' });
      execSync('git branch ' + WORKTREE_BRANCH + ' origin/' + WORKTREE_BRANCH, { cwd: other, stdio: 'ignore' });
      execSync('git worktree add ' + WORKTREE_DIR + ' ' + WORKTREE_BRANCH, { cwd: other, stdio: 'ignore' });
      writeFileSync(join(local, WORKTREE_DIR, 'from-first.txt'), 'hello');
      pushWorktree(local);
      const result = pullWorktree(other);
      expect(result.updated).toBe(true);
      expect(existsSync(join(other, WORKTREE_DIR, 'from-first.txt'))).toBe(true);
    });
    test('data files on _agentrack branch match plumbing output', () => {
      const { local } = createGitRepoWithRemote();
      initFreshWorktree(local);
      const branchFiles = execSync('git ls-tree -r ' + WORKTREE_BRANCH + ' --name-only', {
        cwd: local, encoding: 'utf-8',
      });
      expect(branchFiles).toContain('config.json');
      expect(branchFiles).toContain('index.json');
      expect(branchFiles).toContain('dependencies.json');
      expect(branchFiles).toContain('users.json');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FIX VALIDATIONS — verifying the 3 spec deviation fixes
  // ═══════════════════════════════════════════════════════════════════════

  describe('Fix 1 validation: .gitignore committed in fresh scenario (AC1 step 3)', () => {
    test('commitGitignoreChange stages and commits .gitignore on code branch', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const headBefore = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      commitGitignoreChange(local);
      const headAfter = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      // HEAD should have moved because .gitignore was committed
      expect(headAfter).not.toBe(headBefore);
      // Commit message matches spec
      const msg = execSync('git log -1 --format=%s', { cwd: local, encoding: 'utf-8' }).trim();
      expect(msg).toBe('chore: add .agentrack/ to .gitignore');
    });

    test('commitGitignoreChange is no-op when no changes to commit', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      // Commit the gitignore change first
      commitGitignoreChange(local);
      const headAfterFirst = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      // Call again — should be no-op
      commitGitignoreChange(local);
      const headAfterSecond = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      expect(headAfterSecond).toBe(headAfterFirst);
    });

    test('commitGitignoreChange commits on the code branch, not _agentrack branch', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      commitGitignoreChange(local);
      // Verify the commit is on main (code branch), not _agentrack
      const mainMsg = execSync('git log -1 --format=%s', { cwd: local, encoding: 'utf-8' }).trim();
      expect(mainMsg).toBe('chore: add .agentrack/ to .gitignore');
      // _agentrack branch should not have this commit message
      const agentrackMsg = execSync('git log -1 --format=%s ' + WORKTREE_BRANCH, {
        cwd: local, encoding: 'utf-8',
      }).trim();
      expect(agentrackMsg).toBe('init _agentrack branch');
    });
  });

  describe('Fix 2 validation: auto-commit after tracker.init() (AC1 step 6)', () => {
    test('commitWorktreeData commits changes on _agentrack branch', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      // Manually add a file to simulate data that needs committing
      mkdirSync(join(local, WORKTREE_DIR, 'issues'), { recursive: true });
      writeFileSync(join(local, WORKTREE_DIR, 'issues', '.gitkeep'), '');
      commitWorktreeData(local, 'init agentrack data');
      // Verify commit exists on _agentrack branch
      const log = execSync('git log -1 --format=%s', {
        cwd: join(local, WORKTREE_DIR), encoding: 'utf-8',
      }).trim();
      expect(log).toBe('init agentrack data');
    });

    test('commitWorktreeData with no changes is a no-op', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const headBefore = execSync('git rev-parse HEAD', {
        cwd: join(local, WORKTREE_DIR), encoding: 'utf-8',
      }).trim();
      // No changes made — commitWorktreeData should not create a commit
      commitWorktreeData(local, 'should not appear');
      const headAfter = execSync('git rev-parse HEAD', {
        cwd: join(local, WORKTREE_DIR), encoding: 'utf-8',
      }).trim();
      expect(headAfter).toBe(headBefore);
    });

    test('full init flow: data files are committed on _agentrack branch after worktree init', async () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const tracker = new Tracker(local);
      await tracker.init();
      commitWorktreeData(local, 'init agentrack data');
      // Verify the committed data on _agentrack branch has initial defaults
      const indexContent = execSync('git show ' + WORKTREE_BRANCH + ':index.json', {
        cwd: local, encoding: 'utf-8',
      });
      const index = JSON.parse(indexContent);
      expect(index).toHaveProperty('open');
      expect(index).toHaveProperty('closed');
      expect(index).toHaveProperty('childrenOf');
      // Verify code branch is unchanged
      const mainLog = execSync('git log -1 --format=%s', { cwd: local, encoding: 'utf-8' }).trim();
      expect(mainLog).toBe('initial');
    });
  });

  describe('Fix 3 validation: already_initialized scenario (AC3)', () => {
    test('initWorktree returns scenario "already_initialized" when worktree exists', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const result = initWorktree(local);
      expect(result.scenario).toBe('already_initialized');
      expect(result.path).toBe(resolve(local, WORKTREE_DIR));
    });

    test('initWorktree does not throw or modify state on repeated init', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      const headBefore = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      expect(() => initWorktree(local)).not.toThrow();
      const headAfter = execSync('git rev-parse HEAD', { cwd: local, encoding: 'utf-8' }).trim();
      expect(headAfter).toBe(headBefore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // COVERAGE GAP TESTS — error paths and edge cases
  // ═══════════════════════════════════════════════════════════════════════

  describe('initFreshWorktree: network error during push', () => {
    test('proceeds with local branch when push fails for network reasons', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      // Add a broken remote so hasRemote returns true but push fails
      execSync('git remote add origin /nonexistent/path.git', { cwd: dir, stdio: 'ignore' });
      const result = initFreshWorktree(dir);
      expect(result.scenario).toBe('fresh');
      expect(existsSync(join(dir, WORKTREE_DIR))).toBe(true);
      // Branch exists locally even though push failed
      const branches = execSync('git branch --list', { cwd: dir, encoding: 'utf-8' });
      expect(branches).toContain(WORKTREE_BRANCH);
    });
  });

  describe('initFreshWorktree: worktree mount failure', () => {
    test('throws INVALID_STATE when worktree add fails', () => {
      const dir = createTempDir();
      createGitRepo(dir);
      // Create .agentrack as a regular file to block worktree mount
      writeFileSync(join(dir, WORKTREE_DIR), 'blocking');
      try {
        initFreshWorktree(dir);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('INVALID_STATE');
        expect(e.message).toContain('Failed to mount worktree');
        expect(e.exitCode).toBe(15);
      }
    });
  });

  describe('initJoinWorktree: error paths', () => {
    test('throws INVALID_STATE when fetch fails', () => {
      const { local } = createGitRepoWithRemote();
      // Break remote URL to cause fetch failure
      execSync('git remote set-url origin /nonexistent/path.git', { cwd: local, stdio: 'ignore' });
      try {
        initJoinWorktree(local);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('INVALID_STATE');
        expect(e.message).toContain('Failed to fetch remote branch');
        expect(e.exitCode).toBe(15);
      }
    });

    test('throws INVALID_STATE when worktree add fails', () => {
      const { local } = createGitRepoWithRemote();
      // Create remote branch
      execSync('git branch ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      execSync('git push origin ' + WORKTREE_BRANCH, { cwd: local, stdio: 'ignore' });
      // Block worktree mount with a file
      writeFileSync(join(local, WORKTREE_DIR), 'blocking');
      try {
        initJoinWorktree(local);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('INVALID_STATE');
        expect(e.message).toContain('Failed to mount worktree');
        expect(e.exitCode).toBe(15);
      }
    });
  });

  describe('pushWorktree: commit failure', () => {
    test('throws PUSH_FAILED when git commit fails', () => {
      const { local } = createGitRepoWithRemote();
      initWorktree(local);
      // Create a pre-commit hook that always fails
      const hooksDir = join(local, '.git', 'hooks');
      mkdirSync(hooksDir, { recursive: true });
      writeFileSync(join(hooksDir, 'pre-commit'), '#!/bin/sh\nexit 1\n');
      execSync('chmod +x ' + join(hooksDir, 'pre-commit'), { stdio: 'ignore' });
      // Add a file to trigger a commit
      writeFileSync(join(local, WORKTREE_DIR, 'test.txt'), 'hello');
      try {
        pushWorktree(local);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(AgentrackError);
        const e = err as AgentrackError;
        expect(e.result).toBe('PUSH_FAILED');
        expect(e.message).toContain('git commit failed');
        expect(e.exitCode).toBe(16);
      }
    });
  });

  describe('gitignore pattern recognition', () => {
    test('recognizes /.agentrack pattern (no trailing slash)', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\n/.agentrack\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      const matches = content.split('\n').filter((l) => l.trim() === '/.agentrack');
      expect(matches).toHaveLength(1);
    });

    test('recognizes .agentrack pattern (no slashes)', () => {
      const { local } = createGitRepoWithRemote();
      writeFileSync(join(local, '.gitignore'), 'node_modules/\n.agentrack\n');
      initWorktree(local);
      const content = readFileSync(join(local, '.gitignore'), 'utf-8');
      const matches = content.split('\n').filter((l) => l.trim() === '.agentrack');
      expect(matches).toHaveLength(1);
    });
  });
});
