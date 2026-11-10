# m3e — дизайн-система Material 3 Expressive

Общая дизайн-система для **smart-subtitle** и интерактивного УМК по английскому:

| Пакет | Что внутри |
| --- | --- |
| `@tomato1337/m3e-tokens` | CSS-токены (цвет, типографика, формы, тени, состояния, движение) в слое `m3e.tokens`; TS-утилиты: схема из seed-цвета (`schemeVars`), гармонизированные свои цвета (`customColorTones`), пружины M3 Expressive → `linear()` (`springEasing`). |
| `@tomato1337/m3e-react` | React 19 компоненты: `Dialog`, `Menu`, `Snackbar`/`toast`/`updateToast`, `IconButton`, `Button`, `ButtonGroup`/`ToggleButton`/`Segmented`, `Chip`, `Switch`, `Checkbox`, `Radio`, `Slider`, поля `Field`/`TextField`/`Select` и класс `.m3e-input`, `Spinner`, `WavyProgress`, `WavySpinner`, `Icon`, тултипы `data-tip`, `Presence`/`usePresence` и классы `m3e-motion-*`. |
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

Пакеты опубликованы в npm: [`@tomato1337/m3e-tokens`](https://www.npmjs.com/package/@tomato1337/m3e-tokens) и [`@tomato1337/m3e-react`](https://www.npmjs.com/package/@tomato1337/m3e-react). В пакете собранный JS с `.d.ts` (`dist/`), CSS и исходники (для source maps).

```sh
npm install @tomato1337/m3e-react @tomato1337/m3e-tokens
```

Нужны React 19 и `@types/react` в самом приложении (у кита они peer). `vite.config.ts` приложения:

```ts
export default defineConfig({
  build: { target: ['es2023', 'chrome123', 'safari17.5'], cssTarget: ['chrome123', 'safari17.5'] },
})
```

`cssTarget` важен: со старыми целями Lightning CSS переписывает `light-dark()` в хак с переменными, и цвета ломаются.

TypeScript: подойдёт любой `moduleResolution` (`bundler`, `node16`, `nodenext`); типы — из `dist/*.d.ts`. `@tomato1337/m3e-tokens` не зависит от DOM (`lib: ES2023`), поэтому его можно импортировать и в Node-скриптах через `tsx` или бандлер. Чистый Node ESM его не загрузит: `@material/material-color-utilities` 0.4 содержит импорт без расширения. По той же причине в Vitest добавьте оба пакета в `test.server.deps.inline: ['@tomato1337/m3e-tokens', '@material/material-color-utilities']`.

CSS (Tailwind 4) — порядок слоёв объявляется первым:

```css
@layer theme, base, m3e, components, utilities;
@import 'tailwindcss';
@import '@tomato1337/m3e-react/styles.css';   /* тянет и @tomato1337/m3e-tokens/tokens.css */
```

Так preflight Tailwind оказывается ниже кита, а утилиты (`p-4`, `font-semibold`) — выше. Токены объявлены с нулевой специфичностью (`:where(:root)`) внутри слоя, поэтому любые переменные приложения (`--md-sys-color-*` из живой темы) их перекрывают. Шрифт Roboto Flex приложение подключает само (`@fontsource-variable/roboto-flex/wdth.css`); Material Symbols Rounded подключает кит.

Тема из seed-цвета:

```ts
import { applyVars, schemeVars } from '@tomato1337/m3e-tokens'
applyVars(schemeVars('#6750a4', { dark: true, variant: 'expressive' }))
```

`applyVars(vars, el?)` пишет переменные инлайн-стилями: по умолчанию на корневой элемент, а `el` может быть любым элементом (тема на поддерево) — подходит всё, у чего есть `style.setProperty`.

### Разработка кита вместе с приложением

Чтобы проверить изменение кита в приложении до публикации, подключите локальную копию через `npm link` и пересоберите пакеты:

```sh
(cd ../m3e && npm install && npm run build:packages)
npm link ../m3e/packages/tokens ../m3e/packages/react   # в папке приложения
# …после каждой правки кита: (cd ../m3e && npm run build:packages)
npm install                                           # вернуть версии из npm
```

Связанный кит лежит вне `node_modules` приложения, поэтому приложению нужны `resolve.dedupe: ['react', 'react-dom']` в Vite (один React), `server.fs.allow` с путём к `../m3e` (шрифты кита в dev-сервере) и в `tsconfig` `paths` для `react`/`react-dom` на свои `@types` — иначе `tsc` возьмёт вторую копию из `../m3e/node_modules` и JSX-типы разойдутся.

## Версии

Версия — поле `version` в `packages/*/package.json` (у обоих пакетов одна) и git-тег `v<версия>`. Выпуск: поднять версию в обоих `package.json` (и зависимость `@tomato1337/m3e-react` → `@tomato1337/m3e-tokens`), `npm install`, закоммитить, `git tag v0.3.0 && git push origin main v0.3.0`. Workflow `.github/workflows/publish.yml` прогоняет `npm run check` и публикует пакеты через trusted publishing (OIDC, без токена). Ломающие изменения API или токенов до 1.0 — новая минорная версия; в приложении после обновления прогоните `tsc -b` и сборку.

Первую версию нового пакета npm принимает только вручную: `npm login`, затем `npm publish --workspace packages/tokens --workspace packages/react`; после этого на npmjs.com в настройках каждого пакета включается Trusted publishing → GitHub Actions (`Tomato1337/m3e`, `publish.yml`).

### 0.3.0 — snackbar для задач (ломающее изменение)

- `action: { label, run }` удалён, вместо него `actions: [{ label, run, variant?, dismiss? }]` — одна или две кнопки (`variant: 'tonal' | 'text'`). Перенос: `action: a` → `actions: [a]`. `run` может вернуть `Promise`.
- `toast()` возвращает id сообщения. `updateToast(id, { message?, options? })` меняет текущее сообщение без новой анимации входа, без повторной озвучки и без сброса таймера (сбрасывает только изменённый `durationMs`); для старого id ничего не делает. `hideToast(id)` скрывает только своё сообщение, так что поздний колбэк не закроет новое.
- `durationMs: null` — без автоскрытия; `icon` — тональная плитка со значком; `progress: { value, label, clock? }` — волнистый прогресс (`clock` читается каждый кадр без рендера React); `onInteractionChange(paused)` — пауза, пока на снэкбаре указатель или фокус.
- `Snackbar` получил `placement` и `topOffset` (рядом с `bottomOffset`). Вид — тональная поверхность `surface-container-high`; её рецепт вынесен в класс `.m3e-snackbar-surface` для своих плавающих карточек. Класс `.m3e-snackbar-action` удалён.

## Компоненты: важные договорённости

- `Dialog`: нативный модальный `<dialog>` — фокус, инертность страницы, Esc, возврат фокуса делает браузер. Безопасное действие помечайте `data-autofocus`. `onClose` — запрос закрытия (Esc, «назад», клик по фону при `dismissible`); закрытие и анимация — через `open={false}` или `Presence`. Не вешайте на сам `<dialog>` утилиты `flex`/`grid` — открытый диалог уже flex-колонка.
- Пока открыт модальный диалог, всё вне него инертно — в том числе snackbar. Поэтому озвучка идёт через `announce()`: его live-регион сам переезжает внутрь открытого модального окна.
- Snackbar один на приложение, новое сообщение заменяет текущее (очереди нет). Таймер скрытия стоит на паузе, пока на снэкбаре указатель или фокус, и продолжает с остатка. Кнопка без `dismiss: false` сначала скрывает сообщение, потом выполняет действие; с `dismiss: false` сообщение остаётся, а обе кнопки заблокированы (`aria-disabled`) и таймер стоит до завершения `run` — скрыть или обновить сообщение должен сам вызывающий код. Ошибка `run` уходит в `reportError`, сообщение остаётся. `updateToast` не озвучивает изменения — важную смену этапа озвучьте сами через `announce()`. Уже 480 px кнопки переносятся под текст, уже 320 px — встают в столбик (`data-layout`); текст длиннее двух строк обрезается, полный остаётся в DOM и в `title`.
- `Menu`: `popover="manual"`, позиционирование CSS Anchor Positioning, где оно есть, иначе из скрипта (WebKit). Открытие с клавиатуры переводит фокус на первый пункт, Esc возвращает его на кнопку, Tab закрывает. У триггера — `aria-haspopup="menu"` и `aria-expanded`.
- `IconButton`: подпись (`label`) — это и `aria-label`, и тултип. `selected` → `aria-pressed` (кнопка-переключатель).
- `Button`, `IconButton` и `ToggleButton` с `href` рендерят ссылку `<a>` того же вида; `target`, `rel`, `download` проходят как есть. У ссылки `selected` → `aria-current="page"` (связанная группа `ToggleButton` может быть навигацией). Выключенная ссылка (`disabled`) теряет `href` и обработчик клика и помечается `role="link"`, `aria-disabled="true"` и `data-disabled`; в CSS выключенное состояние — `:is(:disabled, [data-disabled])`, потому что `aria-disabled` у кнопок кита уже значит «занято» (снэкбар). `ButtonProps` и `IconButtonProps` — объединение «кнопка | ссылка», `ref` указывает на `HTMLButtonElement` или `HTMLAnchorElement`; свои типы на их основе выводите через распределяющий `Omit`.
- Поля: класс `.m3e-input` оформляет любой нативный `input`, `textarea` или `select` и без компонентов (залитый по умолчанию, `data-variant="outlined"` — с обводкой; переменные `--m3e-input-container`, `-content`, `-radius`, `-padding-block`, `-padding-inline`, `-ring`). `Field` — подпись сверху, подсказка или ошибка снизу: с `htmlFor` корень — `<div>`, подпись — `<label for>`, а подсказка и ошибка получают id `<htmlFor>-hint` / `<htmlFor>-error` для `aria-describedby`; без `htmlFor` корень — `<label>` вокруг содержимого (текст подсказки тогда входит в имя поля). `TextField` (`multiline` → `textarea`, `trailing` — кнопка у правого края) и `Select` — `Field` и нативное поле: все атрибуты, `onChange` с нативным событием и `ref` уходят на поле, `className` — на корень, `id` — из пропса или `useId()`. Подсказка и ошибка связаны через `aria-describedby`, `error` заменяет подсказку и ставит `aria-invalid`. Без `label` задайте `aria-label`. У `select` остаётся системная стрелка; с `size` > 1 или `multiple` это список.
- `Checkbox` и `Radio` устроены как `Switch` (`label`, `ariaLabel`, `checked`, `disabled`, `onChange(checked)`, `className`, `ref`; остальные атрибуты уходят на `input`), но `label` может быть любым содержимым в несколько строк. Это нативные элементы системного размера с `accent-color: primary` (переменная `--m3e-choice-accent`); с `label` — строка `.m3e-choice`, где элемент стоит по первой строке текста. `Checkbox` принимает `indeterminate`, `Radio` — `name` и `value`; `onChange(true)` у радиокнопки приходит, когда она становится выбранной.
- `Slider` — нативный `input type="range"`: `value`, `onChange(число)`, `min` (0), `max` (100), `step`, `label` (→ `aria-label`), `disabled`; остальное уходит на `input`. Высота 24 px, дорожка 4 px, бегунок 4×20 px, ширина по умолчанию 100 %. Пройденную часть рисует градиент по `--m3e-slider-fill` (доля `(value − min) / (max − min)`, при `max ≤ min` — 0; справа налево градиент разворачивается). Цвета — `--m3e-slider-active` и `--m3e-slider-track`. Оформление — только псевдоэлементы `::-webkit-slider-*` (их понимают оба целевых движка).
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
npm run dev              # playground (берёт пакеты из исходников, без сборки)
npm run check            # свежесть сгенерированных токенов, tsc -b, oxlint, vitest, сборка пакетов и playground
npm run build:packages   # packages/*/dist — то, что уходит в npm
npm run gen              # пересобрать css/color.css, css/motion.css, css/tailwind.css из TS
```
