# Webapp styling, fonts, and theme tokens

## When To Use This

"change the font", "wire up Geist", "the UI looks unpolished", "update theme colors", "shadcn theme tokens", "font-family", "fontsource", "base styles", "index.css", "visual polish".

## Mental Model

The frontend's base/styling lives in two places under `packages/webapp/frontend/`:

- **`src/index.css`** — the sole stylesheet. Holds the shadcn theme tokens and a `@layer base` block for `html, body` where global properties like `font-family` belong.
- **`src/main.tsx`** — the entry point where side-effect imports for assets (e.g. `@fontsource-variable/geist`) must be added, **before** the `./index.css` import.

The webapp uses a **shadcn** component layer on top of these tokens. As of 2026-06-16 the shadcn theme tokens were recently corrected (part of the same visual-polish arc as the Geist font decision).

Font dependencies are npm packages (e.g. `@fontsource-variable/geist@^5.2.9`) declared in `frontend/package.json`. `@fontsource-variable/*` packages ship a single self-hosted variable woff2 (no external CDN / Google Fonts request) with a regular `@font-face`, so there is no FOUT-to-CDN dependency and the font works offline.

### Pending: wire up Geist (decision ACCEPT, implementation not yet done)

Issue `mqh1he4m3q` (review, ACCEPT — comment `mqh1lrc9z5`, 2026-06-16) decided to **wire up** the `@fontsource-variable/geist` dependency rather than remove it. As of that review the dependency was in `package.json` but imported nowhere, and **no `font-family` was declared** in any base/body style, so the UI fell back to the browser default serif (Times-like). The actual wiring is delegated to blocked child issue `mqh1hkjvso` and had NOT been applied yet at the time of this expertise entry.

Approved implementation guidance for `mqh1hkjvso`:
- In `frontend/src/main.tsx`: add `import "@fontsource-variable/geist";` (side-effect import, before `./index.css`).
- In `frontend/src/index.css` `@layer base` `html, body` block: set `font-family: "Geist Variable", ui-sans-serif, system-ui, -apple-system, sans-serif;` — keep `system-ui` in the fallback stack so SSR/no-JS and pre-load render stay sane.
- Verify with `cd packages/webapp/frontend && bun run build`, then run Phase 1 e2e (most likely to care about layout) to confirm no visual assertions break.

## Related Topics

- [webapp-overview.expertise.md](webapp-overview.expertise.md): file layout and build commands.
- [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md): page/AppLayout structure (distinct from base styling).
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): run Phase 1 e2e to check for layout regressions after a styling change.

## Timeline

- 2026-06-16: Reviewed the unused `@fontsource-variable/geist` dependency (`mqh1he4m3q`). Decision: ACCEPT — wire it up. Confirmed the dep is imported nowhere and no `font-family` is set, so the UI uses the browser default serif. Left implementation guidance for child issue `mqh1hkjvso`.

## Gaps And Validation Needs

- The Geist wiring above is a **decision, not applied code** — verify the actual state of `main.tsx` / `index.css` before acting on it, since child `mqh1hkjvso` may have landed by the time you read this. If `font-family` is already declared, this guidance is stale.
- No lint is configured for the webapp; `bun run build` (`tsc -b` + Vite) is the closest gate. Styling-only changes still warrant an e2e Phase 1 run to catch layout-assertion regressions.
