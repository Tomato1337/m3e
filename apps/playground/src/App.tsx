import { applyVars, schemeVars } from '@tomato1337/m3e-tokens'
import {
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  Dialog,
  IconButton,
  Menu,
  MenuDivider,
  MenuItem,
  Presence,
  Radio,
  Segmented,
  Select,
  Snackbar,
  Spinner,
  Switch,
  TextField,
  toast,
  ToggleButton,
  usePresence,
  WavyProgress,
  WavySpinner,
} from '@tomato1337/m3e-react'
import { useEffect, useRef, useState } from 'react'
import { startTask } from './taskDemo.ts'

const MODES = [
  { value: 'expressive', label: 'Expressive' },
  { value: 'standard', label: 'Standard' },
] as const
const PLACES = [
  { value: 'bottom', label: 'Снизу' },
  { value: 'top', label: 'Сверху' },
] as const
const PAGES = [
  { value: 'lessons', label: 'Уроки' },
  { value: 'words', label: 'Слова' },
  { value: 'book', label: 'Книга' },
] as const
const SPEEDS = [
  { value: '0.75', label: '0.75×' },
  { value: '1', label: 'Обычная' },
  { value: '1.25', label: '1.25×' },
] as const

export function App() {
  const [seed, setSeed] = useState('#6750a4')
  const [dark, setDark] = useState(false)
  const [motion, setMotion] = useState<'expressive' | 'standard'>('expressive')
  const [dialog, setDialog] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [menu, setMenu] = useState(false)
  const [card, setCard] = useState(true)
  const [panel, setPanel] = useState(false)
  const [chips, setChips] = useState({ idioms: true, slang: false })
  const [langs, setLangs] = useState({ en: true, ru: false })
  const [autoplay, setAutoplay] = useState(true)
  const [value, setValue] = useState(0.35)
  const [place, setPlace] = useState<'bottom' | 'top'>('bottom')
  const [held, setHeld] = useState(false)
  const [editor, setEditor] = useState(false)
  const [page, setPage] = useState<(typeof PAGES)[number]['value']>('lessons')
  const [secret, setSecret] = useState(false)
  const [cards, setCards] = useState([true, false])
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]['value']>('1')

  useEffect(() => {
    applyVars(schemeVars(seed, { dark }))
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [seed, dark])

  const sideRef = useRef<HTMLElement>(null)
  const side = usePresence(panel, sideRef)

  return (
    <main data-motion-scheme={motion}>
      <h1 className="type-headline-medium type-emph">m3e</h1>

      <section aria-labelledby="theme-title">
        <h2 id="theme-title" className="type-title-large">Тема и движение</h2>
        <div className="row">
          <label className="row">
            <span className="type-label-large">Seed</span>
            <input type="color" value={seed} onChange={(e) => setSeed(e.target.value)} />
          </label>
          <Switch label="Тёмная тема" checked={dark} onChange={setDark} />
          <Segmented label="Схема движения" value={motion} options={MODES} onChange={setMotion} />
        </div>
      </section>

      <section aria-labelledby="buttons-title">
        <h2 id="buttons-title" className="type-title-large">Кнопки</h2>
        <div className="row">
          <Button>Filled</Button>
          <Button variant="tonal" icon="bolt">Tonal</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="elevated">Elevated</Button>
          <Button size="md" icon="play_arrow">Medium</Button>
        </div>
        <div className="row">
          <IconButton icon="settings" label="Настройки" />
          <IconButton icon="favorite" label="В избранное" variant="tonal" />
          <IconButton icon="add" label="Добавить" variant="filled" size="lg" />
          <IconButton icon="star" label="Звезда" variant="secondary" size="xl" shape="cookie9" />
          <IconButton icon="mic" label="Микрофон" variant="outlined" selected={autoplay} onClick={() => setAutoplay(!autoplay)} />
        </div>
        <ButtonGroup label="Языки субтитров" connected>
          <ToggleButton selected={langs.en} onClick={() => setLangs((l) => ({ ...l, en: !l.en }))}>EN</ToggleButton>
          <ToggleButton selected={langs.ru} onClick={() => setLangs((l) => ({ ...l, ru: !l.ru }))}>РУ</ToggleButton>
        </ButtonGroup>
        <div className="row">
          <Button href="https://m3.material.io/components/buttons/overview" target="_blank" rel="noreferrer" variant="outlined" icon="open_in_new">
            Ссылка-кнопка
          </Button>
          <IconButton href="#buttons-title" icon="link" label="Ссылка с иконкой" variant="tonal" />
          <Button href="#buttons-title" variant="text" disabled>Недоступная ссылка</Button>
        </div>
        <ButtonGroup label="Разделы" connected>
          {PAGES.map((p) => (
            <ToggleButton key={p.value} href={`#${p.value}`} selected={page === p.value} onClick={() => setPage(p.value)}>
              {p.label}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </section>

      <section aria-labelledby="fields-title">
        <h2 id="fields-title" className="type-title-large">Поля</h2>
        <div className="fields">
          <TextField label="Название колоды" placeholder="English::Movies" hint="Подсказка под полем" />
          <TextField label="Outlined" variant="outlined" placeholder="Поле с обводкой" />
          <TextField label="Модель" defaultValue="gpt-5" error="Такой модели нет" />
          <TextField label="Outlined с ошибкой" variant="outlined" defaultValue="—" error="Введите число" />
          <TextField label="Недоступно" defaultValue="Только чтение" disabled />
          <TextField label="Недоступно, outlined" variant="outlined" defaultValue="Только чтение" disabled />
          <TextField
            label="Ключ API"
            type={secret ? 'text' : 'password'}
            defaultValue="sk-demo-1234"
            autoComplete="off"
            trailing={<IconButton icon={secret ? 'visibility_off' : 'visibility'} label={secret ? 'Скрыть ключ' : 'Показать ключ'} size="sm" tipPos="left" onClick={() => setSecret(!secret)} />}
          />
          <Select label="Язык" defaultValue="en" hint="Системная стрелка остаётся">
            <optgroup label="Частые">
              <option value="en">Английский</option>
              <option value="de">Немецкий</option>
            </optgroup>
            <optgroup label="Другие">
              <option value="ja">Японский</option>
              <option value="ko">Корейский</option>
            </optgroup>
          </Select>
          <TextField multiline label="Промпт" rows={3} placeholder="Многострочное поле тянется по вертикали" />
          <Select label="Модель (список)" size={6} defaultValue="claude">
            <option value="gpt">gpt-5</option>
            <option value="gpt-mini">gpt-5-mini</option>
            <option value="claude">claude-sonnet</option>
            <option value="gemini">gemini-pro</option>
            <option value="llama">llama-4</option>
            <option value="mistral">mistral-large</option>
            <option value="qwen">qwen-3</option>
          </Select>
        </div>
        <input className="m3e-input search" type="search" placeholder="Поиск по субтитрам" aria-label="Поиск по субтитрам" />
      </section>

      <section aria-labelledby="sel-title">
        <h2 id="sel-title" className="type-title-large">Выбор</h2>
        <div className="row">
          <Chip label="Идиомы" selected={chips.idioms} onClick={() => setChips((c) => ({ ...c, idioms: !c.idioms }))} />
          <Chip label="Сленг" selected={chips.slang} onClick={() => setChips((c) => ({ ...c, slang: !c.slang }))} />
          <Chip label="Недоступно" selected={false} disabled />
        </div>
        <Switch label="Автовоспроизведение" checked={autoplay} onChange={setAutoplay} />
        <div className="choices">
          <div>
            <Checkbox
              label="Все карточки"
              checked={cards.every(Boolean)}
              indeterminate={cards.some(Boolean) && !cards.every(Boolean)}
              onChange={(v) => setCards(cards.map(() => v))}
            />
            {['excited', 'take off'].map((w, i) => (
              <Checkbox
                key={w}
                className="nested"
                label={<>Добавить <b>{w}</b> в колоду: пример из фильма и перевод займут несколько строк, флажок стоит по первой</>}
                checked={cards[i]!}
                onChange={(v) => setCards(cards.map((c, j) => (j === i ? v : c)))}
              />
            ))}
            <Checkbox label="Недоступно" checked disabled onChange={() => {}} />
          </div>
          <div role="radiogroup" aria-label="Скорость">
            {SPEEDS.map((s) => (
              <Radio key={s.value} name="speed" value={s.value} label={s.label} checked={speed === s.value} onChange={() => setSpeed(s.value)} />
            ))}
            <Radio name="speed-off" label="Недоступно" checked={false} disabled onChange={() => {}} />
          </div>
        </div>
      </section>

      <section aria-labelledby="over-title">
        <h2 id="over-title" className="type-title-large">Поверх страницы</h2>
        <div className="row">
          <Button id="open-dialog" onClick={() => setDialog(true)}>Диалог</Button>
          <Button id="open-confirm" variant="tonal" onClick={() => setConfirm(true)}>Подтверждение</Button>
          <span className="anchor">
            <Button id="open-menu" variant="outlined" icon="more_vert" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              Меню
            </Button>
            <Menu open={menu} onClose={() => setMenu(false)} label="Действия">
              <MenuItem icon="content_copy" label="Копировать" hint="Ctrl+C" onClick={() => setMenu(false)} />
              <MenuItem icon="share" label="Поделиться" onClick={() => setMenu(false)} />
              <MenuDivider title="Субтитры" />
              <MenuItem label="Английские" selected={langs.en} onClick={() => setLangs((l) => ({ ...l, en: !l.en }))} />
              <MenuItem label="Автопрокрутка" on={autoplay} onClick={() => setAutoplay(!autoplay)} />
              <MenuItem label="Недоступно" disabled onClick={() => {}} />
            </Menu>
          </span>
        </div>
      </section>

      <section aria-labelledby="snack-title">
        <h2 id="snack-title" className="type-title-large">Snackbar</h2>
        <div className="row">
          <Button id="toast" variant="text" onClick={() => toast('Удалено из недавних', { actions: [{ label: 'Отменить', run: () => { toast('Восстановлено') } }], durationMs: 8000 })}>
            Простой
          </Button>
          <Button id="task" variant="tonal" icon="add_card" onClick={() => startTask({ onHeld: setHeld, onEdit: () => setEditor(true) })}>
            Задача с отменой
          </Button>
          <Segmented label="Место снэкбара" value={place} options={PLACES} onChange={setPlace} />
        </div>
        <p className="type-body-medium">
          Таймер: <output id="task-state">{held ? 'на паузе — указатель или фокус на снэкбаре' : 'идёт'}</output>
        </p>
        <p className="type-body-small hint">
          Уже 480 px кнопки уходят под текст, уже 320 px — в столбик. Текст длиннее двух строк обрезается, полностью он в title.
        </p>
      </section>

      <section aria-labelledby="motion-title">
        <h2 id="motion-title" className="type-title-large">Появление и исчезновение</h2>
        <div className="row">
          <Button id="toggle-card" variant="tonal" onClick={() => setCard(!card)}>{card ? 'Скрыть карточку' : 'Показать карточку'}</Button>
          <Button id="toggle-panel" variant="tonal" onClick={() => setPanel(!panel)}>Боковая панель</Button>
        </div>
        <Presence>
          {card && (
            <div id="card" className="card m3e-motion-pop">
              <p className="type-body-large">Карточка входит пружиной и уходит, а не пропадает.</p>
            </div>
          )}
        </Presence>
      </section>

      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className="type-title-large">Прогресс</h2>
        <div className="row">
          <Spinner label="Загрузка" />
          <Spinner size={24} width={3} />
          <WavySpinner label="Поиск субтитров" />
        </div>
        <input type="range" min={0} max={1} step={0.01} value={value} aria-label="Значение" onChange={(e) => setValue(Number(e.target.value))} />
        <WavyProgress className="wave" value={value} amp={3} len={24} stroke={4} animated={false} />
      </section>

      <Presence>
        {dialog && (
          <Dialog id="dialog" aria-labelledby="dialog-title" onClose={() => setDialog(false)} dismissible>
            <h2 id="dialog-title" className="type-headline-small">Горячие клавиши</h2>
            <p className="type-body-medium">Esc, клик по фону или кнопка — выход анимируется в любом движке.</p>
            <div className="actions">
              <Button variant="text" data-autofocus onClick={() => setDialog(false)}>Закрыть</Button>
            </div>
          </Dialog>
        )}
      </Presence>
      <Dialog id="confirm" open={confirm} aria-labelledby="confirm-title" onClose={() => setConfirm(false)}>
        <h2 id="confirm-title" className="type-headline-small">Удалить карточку?</h2>
        <p className="type-body-medium">Её можно будет восстановить из корзины.</p>
        <div className="actions">
          <Button variant="text" data-autofocus onClick={() => setConfirm(false)}>Отмена</Button>
          <Button variant="text" onClick={() => { setConfirm(false); toast('Карточка удалена') }}>Удалить</Button>
        </div>
      </Dialog>
      <Dialog id="editor" open={editor} aria-labelledby="editor-title" onClose={() => setEditor(false)}>
        <h2 id="editor-title" className="type-headline-small">Карточка «excited»</h2>
        <p className="type-body-medium">Редактор открыт по кнопке снэкбара, добавление ждёт сохранения.</p>
        <div className="actions">
          <Button variant="text" data-autofocus onClick={() => setEditor(false)}>Закрыть</Button>
        </div>
      </Dialog>

      {side.mounted && (
        <aside id="panel" ref={sideRef} className="panel m3e-motion-from-right" aria-label="Боковая панель">
          <IconButton icon="close" label="Закрыть панель" tipPos="left" onClick={() => setPanel(false)} />
          <p className="type-body-medium">Панель выезжает и уезжает обратно.</p>
        </aside>
      )}

      <Snackbar placement={place} topOffset={16} />
    </main>
  )
}
