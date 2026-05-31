# Build And Package

## When To Use This

Tasks involving the build pipeline, tsup configuration, package.json exports, publishing, CJS/ESM dual output, or TypeScript compilation. "Build fails", "change build output", "add export", "publish package", "tsup config".

## Mental Model

**Build tool**: tsup v8.5.1 with two entry points:
1. **Library** (`src/index.ts`) — ESM + CJS + dts, commander externalized
2. **CLI binary** (`src/bin.ts`) — bundled, node shebang via tsup banner

**Build output**:
- `dist/index.js` (ESM)
- `dist/index.cjs` (CJS)
- `dist/index.d.ts` (ESM types)
- `dist/index.d.cts` (CJS types)
- `dist/bin.js` (CLI binary)
- All with sourcemaps

**package.json configuration**:
- `main` → `dist/index.cjs`
- `module` → `dist/index.js`
- `types` → `dist/index.d.ts`
- Dual exports with `types` conditions
- `bin` → `dist/bin.js`
- `files` → `['dist/']`
- `engines` → `node>=20`

**Quality gates**: `prepublishOnly` runs `bun run quality` (typecheck + lint + test:coverage).

**Runtime**: Bun for dev/test, but no Bun-specific APIs — all file I/O uses `node:fs/promises`. Fully Node.js compatible.

**Scripts**: build, lint, lint:fix, format, format:check, docs:generate, docs:check, quality (typecheck + lint + test:coverage).

**TypeScript**: `bun x tsc` doesn't work (resolves wrong tsc) — must use npm script or full path. tsconfig uses `types: ['@types/bun']` not `'bun-types'`.

## Code Map

- `tsup.config.ts` — build configuration
- `package.json` — package metadata, scripts, exports
- `tsconfig.json` — TypeScript configuration
- `eslint.config.js` — ESLint 9 flat config
- `.prettierrc` or prettier config — semi: true, double quotes, trailing comma: all, printWidth: 100
- `src/bin.ts` — CLI entry (no hardcoded shebang)
- `src/index.ts` — barrel exports

## Related Topics

- [testing-patterns.expertise.md](testing-patterns.expertise.md): test scripts and coverage

## Business Rules And Invariants

- No Bun-specific APIs — must stay Node.js compatible
- Commander must be externalized in library build (not bundled)
- CLI binary must be bundled with shebang via tsup banner (not hardcoded)
- `files: ['dist/']` ensures only built output is published
- engines: node>=20 is the minimum supported version

## Gaps And Validation Needs

- typedoc and typedoc-plugin-markdown are still devDependencies but planned for removal per user-docs spec
