# shadcn / Tailwind v4 theme tokens missing (frontend CSS bug)

## When To Use This

"shadcn styles not applied", "inputs render transparent", "components have no background/border", "text unreadable in dialogs/selects", "bg-background / border-input / text-foreground do nothing", "validate the missing theme tokens fix", "reproduce `mqgza7xio7`", "`@theme inline`", "Tailwind v4 semantic utilities not generated".

Routes here for any report that webapp UI elements (Input, Select, Dialog, DropdownMenu, Card, etc.) appear transparent or unstyled.

## Mental Model

The webapp frontend is on **Tailwind v4** (`tailwindcss ^4.1.0` + `@tailwindcss/vite`, `@import "tailwindcss"` syntax in `packages/webapp/frontend/src/index.css`). This materially changes how shadcn semantic utilities work compared to Tailwind v3:

- In **v3**, `tailwind.config.js` + a CSS `:root`/`@layer base` block drive everything, and shadcn's default theme is wired up in the generated CSS.
- In **v4**, the config file is optional, and semantic utility classes like `bg-background`, `bg-card`, `bg-primary`, `bg-popover`, `text-foreground`, `border-input`, `border-ring`, `ring-ring` are **only emitted if they are declared in CSS** via:
  - `@theme inline { --color-background: var(--background); --color-foreground: var(--foreground); ... }` mapping each semantic name to a CSS var, **and**
  - `:root { --background: <oklch/hsl>; ... }` / `.dark { ... }` blocks giving those vars concrete values.
- If neither block exists, Tailwind v4 has no definition for those tokens and **emits zero CSS rules** for the utilities. The class names still appear in the HTML but resolve to nothing → elements render with no background/border/text color (transparent / unreadable).

### The bug (as diagnosed 2026-06-16, issue `mqgza7xio7`)

`packages/webapp/frontend/src/index.css` is only ~14 lines: `@import "tailwindcss";` plus a small `@layer utilities` transition block. It has **no `:root`, no `.dark`, no `@theme inline`** defining the shadcn semantic color tokens. Therefore every `components/ui/*` component (Input, Select, Dialog, DropdownMenu, Card, …) — which all reference `bg-background`, `border-input`, `text-foreground`, etc. — renders unstyled.

`components.json` uses `"style": "base-nova"` (the `@base-ui/react`-based shadcn style). The `@base-ui/react/*` imports resolve and the build succeeds, so the component plumbing is fine — **only the theme/token CSS is missing.**

Secondary, same class of bug: the `@layer utilities` transition helpers reference `--agentrack-transition-duration-fast/normal/slow`, which are also **never defined** anywhere in `src/` or `index.html` — so those utilities likewise resolve to nothing (lower severity).

### Definitive proof technique (build then grep the dist CSS)

The conclusive evidence came from building and inspecting the compiled stylesheet, not from reading source alone:

1. `cd packages/webapp/frontend && npm run build` — succeeds, no CSS warnings.
2. Inspect `dist/assets/index-*.css` (~41 kB):
   - The single `:root` block contains **only Tailwind's default palette** (`--color-red-*`, `--color-amber-*`, `--color-slate-*`, …).
   - `grep -oE '--color-(background|foreground|primary|card|popover|input|ring|muted|accent|destructive|border|secondary)' dist/assets/index-*.css` → **empty**.
   - `.bg-background`, `.bg-primary`, `.bg-card`, `.text-foreground`, `.border-input` → **0 matches** in the built CSS.

This is the canonical way to confirm "shadcn token X is not being generated" on Tailwind v4.

### Remediation (for the implementer — out of validator scope)

- Restore the standard shadcn Tailwind-v4 theme block in `src/index.css`: a `@theme inline { ... }` block mapping every semantic token used by the components, **plus** `:root { ... }` / `.dark { ... }` blocks with concrete oklch/hsl values for `--background`, `--foreground`, `--primary`, `--card`, `--popover`, `--input`, `--ring`, `--border`, `--muted`, `--accent`, `--secondary`, `--destructive` and their `-foreground` variants.
- Also define `--agentrack-transition-duration-fast/normal/slow` (e.g. in `:root`) so the transition utilities work.
- A clean way to regenerate this correctly is `npx shadcn@latest init` (or `npx shadcn@latest add` on the affected components) against the existing `components.json`; for the `base-nova` / Tailwind v4 setup it emits the correct `@theme` + `:root`/`.dark` blocks into `src/index.css`.
- Implementation is tracked by the downstream blocked issue **`mqgzae4ayr`**. The diagnosis write-up is on issue **`mqgza7xio7`**.

## Validation State (as of 2026-06-16)

- `npx tsc --noEmit -p tsconfig.app.json` → **PASS** (no type errors).
- `npm run build` → **PASS** (no CSS warnings/errors; ~2104 modules; ~41.38 kB CSS).
- Built CSS inspected — semantic tokens/rules confirmed absent (see above).
- **No code modified** (diagnose-only task). The fix has not been made or validated yet.

## Related Topics

- [webapp-overview.expertise.md](webapp-overview.expertise.md): webapp stack & build commands.
- [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md): a different bug class (server-side 401/500), kept separate from this frontend/CSS bug.
- [webapp-validator-gotchas.md](webapp-validator-gotchas.md): sandbox restrictions that affect how you inspect CSS/build output.

## Timeline

- 2026-06-16: Diagnosed root cause for `mqgza7xio7` (shadcn styles not applied). Confirmed via build + dist-CSS inspection that `src/index.css` is missing the `@theme inline` / `:root` / `.dark` blocks, so Tailwind v4 emits no semantic utility rules. Handed off to PM; fix tracked by `mqgzae4ayr`.

## Gaps And Validation Needs

- The fix has **not** been made yet. When `mqgzae4ayr` is implemented, re-run `npm run build`, grep the dist CSS for `--color-background` / `.bg-background` (should now be present), and visually/E2E-confirm components are styled.
- `--agentrack-transition-duration-*` values are unspecified — the implementer should choose concrete durations; verify the transition utilities actually apply afterwards.
- Exact shadcn token list needed depends on what `components/ui/*` reference; re-grep `src/components/ui/` for `(bg|text|border|ring)-(background|foreground|primary|card|popover|input|ring|muted|accent|secondary|destructive|border)` before finalizing the `@theme inline` mapping.
