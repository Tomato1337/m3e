# m3e — дизайн-система Material 3 Expressive

Общая дизайн-система для **smart-subtitle** и интерактивного УМК по английскому:

| Пакет | Что внутри |
| --- | --- |
| `@m3e/tokens` | CSS-токены (цвет, типографика, формы, тени, состояния, движение) в слое `m3e.tokens`; TS-утилиты: схема из seed-цвета (`schemeVars`), гармонизированные свои цвета (`customColorTones`), пружины M3 Expressive → `linear()` (`springEasing`). |
| `@m3e/react` | React 19 компоненты: `Dialog`, `Menu`, `Snackbar`/`toast`, `IconButton`, `Button`, `ButtonGroup`/`ToggleButton`/`Segmented`, `Chip`, `Switch`, `Spinner`, `WavyProgress`, `WavySpinner`, `Icon`, тултипы `data-tip`, `Presence`/`usePresence` и классы `m3e-motion-*`. |
| `apps/playground` | Витрина всех компонентов и анимаций (`npm run dev`). |

## Главное: анимации входа **и выхода**

Элемент больше не пропадает в один кадр:

- **Dialog / Menu / Snackbar** живут в top layer (`<dialog>.showModal()`, `popover="manual"`). В Chromium выход идёт нативно (`overlay` + `display` с `allow-discrete`); в WebKit (Tauri на Linux/macOS) `overlay` нет, поэтому компонент ставит `data-closing`, ждёт конца переходов (`getAnimations()`, страховочный таймаут 2 с) и только потом вызывает `close()` / `hidePopover()`.
- **Любой условный рендер** — оберните в `<Presence>`; верхние элементы получат `data-closing` и исчезнут после своих переходов:

  ```tsx
  <Presence>{open && <div className="m3e-motion-pop">…</div>}</Presence>
  <Presence>{open && <SettingsDialog onClose={() => setOpen(false)} />}</Presence>
  ```

- **Элемент, который влияет на раскладку** (колонка сайдбара): `usePresence(open, ref)` держит его смонтированным до конца выхода.
- Свои компоненты: закрытое состояние — это и есть выход. Вход — `@starting-style`, выход — переход к закрытому состоянию (`[data-closing]` или правило без `[open]`). `@starting-style` для выхода не используется.
- Пружины M3 Expressive сгенерированы в `linear()` вместе с длительностью (`--md-sys-motion-spring-<fast|default|slow>-<spatial|effects>` и `…-duration`). Пространственные пружины (с отскоком) — только для положения, размера, формы; прозрачность и цвет — пружины `effects` без перелёта.
- `prefers-reduced-motion: reduce`: остаются короткие затухания, движение убирается; спиннеры замедляются, а не замирают. Глобальных `* { transition: none }` нет.
- `data-motion-scheme="standard"` на любом элементе переключает поддерево на спокойную схему.

## Подключение к приложению

Репозиторий кладётся рядом с приложением (`…/m3e` и `…/smart-subtitle`), зависимости — через `file:`:

```jsonc
// package.json приложения
"@m3e/react": "file:../m3e/packages/react",
"@m3e/tokens": "file:../m3e/packages/tokens"
```

```sh
(cd ../m3e && npm install)   # у кита свои node_modules (шрифт Material Symbols, color utilities)
npm install
```

`vite.config.ts` приложения:

```ts
import { searchForWorkspaceRoot } from 'vite'
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },          // один React на всё дерево
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../m3e'] } },
  build: { target: ['es2023', 'chrome123', 'safari17.5'], cssTarget: ['chrome123', 'safari17.5'] },
})
```

`cssTarget` важен: со старыми целями Lightning CSS переписывает `light-dark()` в хак с переменными, и цвета ломаются.

CSS (Tailwind 4) — порядок слоёв объявляется первым:

```css
@layer theme, base, m3e, components, utilities;
@import 'tailwindcss';
@import '@m3e/react/styles.css';   /* тянет и @m3e/tokens/tokens.css */
```

Так preflight Tailwind оказывается ниже кита, а утилиты (`p-4`, `font-semibold`) — выше. Токены объявлены с нулевой специфичностью (`:where(:root)`) внутри слоя, поэтому любые переменные приложения (`--md-sys-color-*` из живой темы) их перекрывают. Шрифт Roboto Flex приложение подключает само (`@fontsource-variable/roboto-flex/wdth.css`); Material Symbols Rounded подключает кит.

Тема из seed-цвета:

```ts
import { applyVars, schemeVars } from '@m3e/tokens'
applyVars(schemeVars('#6750a4', { dark: true, variant: 'expressive' }))
```

## Компоненты: важные договорённости

- `Dialog`: нативный модальный `<dialog>` — фокус, инертность страницы, Esc, возврат фокуса делает браузер. Безопасное действие помечайте `data-autofocus`. `onClose` — запрос закрытия (Esc, «назад», клик по фону при `dismissible`); закрытие и анимация — через `open={false}` или `Presence`. Не вешайте на сам `<dialog>` утилиты `flex`/`grid` — открытый диалог уже flex-колонка.
- Пока открыт модальный диалог, всё вне него инертно — в том числе snackbar. Поэтому озвучка идёт через `announce()`: его live-регион сам переезжает внутрь открытого модального окна.
- `Menu`: `popover="manual"`, позиционирование CSS Anchor Positioning, где оно есть, иначе из скрипта (WebKit). Открытие с клавиатуры переводит фокус на первый пункт, Esc возвращает его на кнопку, Tab закрывает. У триггера — `aria-haspopup="menu"` и `aria-expanded`.
- `IconButton`: подпись (`label`) — это и `aria-label`, и тултип. `selected` → `aria-pressed` (кнопка-переключатель).
- Классы — `.m3e-<компонент>`, варианты и части — атрибуты `data-variant`, `data-size`, `data-part`; без BEM.

## Поддержка движков

Целевые: **WebKitGTK ≥ 2.46 / Safari ≥ 17.5** (Tauri на Linux и macOS) и **Chromium ≥ 123** (WebView2 на Windows). Что есть не везде и как закрыто:

| Возможность | WebKit | Chromium | Фолбэк |
| --- | --- | --- | --- |
| `overlay` (выход из top layer) | нет | да | `data-closing` → анимация → `close()` |
| `closedby="any"` | нет | да | клик по `::backdrop` в `Dialog` |
| CSS Anchor Positioning | нет | да | координаты из скрипта в `Menu`, абсолютный тултип |
| `@starting-style` на `::backdrop`/`::after` | нет | да | вход через `@keyframes … backwards` |
| `<input switch>` | нет | нет | `appearance: none` + `role="switch"` |

## Команды

```sh
npm install
npm run dev          # playground
npm run check        # свежесть сгенерированных токенов, tsc -b, oxlint, vitest, сборка playground
npm run gen          # пересобрать css/color.css, css/motion.css, css/tailwind.css из TS
```
