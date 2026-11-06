# m3e — notes for coding agents

Material 3 Expressive design system shared by smart-subtitle (Tauri 2 desktop player) and the
interactive English course. npm workspaces: `packages/tokens` (`@m3e/tokens`), `packages/react`
(`@m3e/react`), `apps/playground`. Consumers link it with `file:../m3e/packages/*`; there is no
build step — packages export TypeScript and CSS sources. User docs: `README.md` (Russian).

## Commands

```sh
npm install
npm run check      # gen --check, tsc -b, oxlint --deny-warnings, vitest, playground build — run before handing back
npm run gen        # regenerate packages/tokens/css/{color,motion,tailwind}.css (never edit them by hand)
npm run dev        # playground
```

## Browser-support policy

Targets: WebKitGTK ≥ 2.46 / Safari ≥ 17.5 (Tauri on Linux and macOS) and Chromium ≥ 123
(WebView2 on Windows). Keep `build.cssTarget` at `['chrome123', 'safari17.5']` or newer in every
consumer: older targets make Lightning CSS rewrite `light-dark()` and break the colour tokens.

Every feature outside both engines needs a working fallback in the same change, verified in real
WebKitGTK (see "Verifying motion"). Known gaps in WebKit: no `overlay`, no `closedby`, no
`requestClose()`, no CSS Anchor Positioning, no `@starting-style` on `::backdrop`/`::after`,
no `interpolate-size`, no `<input switch>`, no invoker commands (`command`/`commandfor`),
no `overscroll-behavior` on non-scrollable boxes.

## Conventions

- Cascade layers: `m3e.tokens`, `m3e.base`, `m3e.components`, `m3e.utilities`. Consumers declare
  `@layer theme, base, m3e, components, utilities;` so Tailwind utilities win over the kit.
  Tokens use `:where(:root)`; no global `*` rules, no `!important` except `.m3e-visually-hidden`.
- Naming: `.m3e-<component>`; variants, sizes and parts are `data-variant`, `data-size`,
  `data-part` attributes. No BEM.
- Motion:
  - The closed rule is the exit. Entry uses `@starting-style` nested in the open selector; never
    use `@starting-style` for an exit.
  - Open selectors are `:is([open] | :popover-open):where(:not([data-closing]))` (or
    `:not([data-closing])` for `m3e-motion-*`), so `data-closing` drives the exit wherever
    `overlay` is missing. `display`/`overlay` transitions with a separate
    `transition-behavior: allow-discrete` live inside `@supports (overlay: auto)`.
  - Close top-layer elements only through `closeTopLayer()`; unmount conditionally rendered UI
    through `<Presence>` / `usePresence(open, ref)`; never on a timer.
  - `linear()` springs always come with their `-duration` token. Spatial springs (overshoot) for
    position/size/shape/scale only; opacity and colour take the `effects` springs.
  - Movement goes inside `@media (prefers-reduced-motion: no-preference)` (or is removed under
    `reduce`); fades may stay. Spinners slow down instead of stopping.
  - Menus: under 150 ms, opacity and a 4 px translate only.
- React: no ref reads or writes during render (oxlint `react(refs)`); latest-value refs are
  updated in layout effects (`useLatest`). Components run their own exit when they are
  Presence participants (`usePresenceParticipant`).
- Accessibility: native `<dialog>`/popover semantics, no `role="dialog"`/`aria-modal`, no focus
  traps. Status text goes through `announce()` (one polite region that follows the open modal).
- Keep `@types/react`/`@types/react-dom` pinned to the same versions as the consumers; two
  copies break JSX types across the `file:` link.
- Consumers type-check the kit sources with their own `tsc` (`moduleResolution: bundler`,
  `allowImportingTsExtensions`). Relative imports carry explicit `.ts`/`.tsx` extensions;
  `@material/material-color-utilities` 0.4 ships extensionless `.d.ts` imports, so do not switch
  the kit to `node16`/`nodenext` resolution.
- `@m3e/tokens` is DOM-free (`lib: ES2023`; `applyVars` takes a `StyleTarget`), so Node-side
  scripts can import it. Keep DOM and React code in `@m3e/react`.
- Releases are git tags (`v0.1.0`, …). Consumers' CI clones the kit at a pinned tag
  (smart-subtitle: `M3E_REF` in `.github/workflows/release.yml`); breaking API or token changes
  need a new tag and a note in the README.

## Verifying motion

Unit tests (vitest, jsdom) cover `Presence`, `animateExit`, the toast store, `announce`, springs
and colour generation. Exit motion itself must be checked in real engines: build the playground,
serve `apps/playground/dist`, then sample `getComputedStyle(el).opacity` (and `translate`/`scale`)
while closing — values strictly between 0 and 1 mid-exit, the element removed afterwards, focus
back on the opener. WebKitGTK is driven through `WebKit2` GObject bindings under `xvfb-run`;
Chromium through Playwright.
