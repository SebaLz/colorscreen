import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { ColorPad } from './components/ColorPad.tsx'
import { useCountdown, useFullscreen, useIdleHide, useWakeLock } from './hooks.ts'
import {
  complementary,
  hexToHsl,
  hslToHex,
  hslToRgb,
  parseHexInput,
  pleasantRandom,
  rgbToHsl,
  type HSL,
} from './lib/color.ts'
import {
  cloneLook,
  defaultLook,
  lookBackground,
  lookHex,
  lookInk,
  type Look,
  type Mode,
  type SavedLook,
} from './lib/look.ts'
import { loadStore, pushRecent, saveStore, shareUrl } from './lib/persist.ts'
import { applyPreset, CATEGORIES, PRESETS, QUICK, type PresetCategory } from './lib/presets.ts'

type Tab = 'color' | 'mix' | 'styles' | 'light'
type StyleFilter = PresetCategory | 'fav'
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

const MODES: { id: Mode; label: string }[] = [
  { id: 'solid', label: 'Sólido' },
  { id: 'mix', label: 'Mix' },
  { id: 'gradient', label: 'Degradé' },
  { id: 'split', label: 'Split' },
  { id: 'kelvin', label: 'Kelvin' },
]

export default function App() {
  const boot = useMemo(() => loadStore(), [])
  const [look, setLook] = useState<Look>(boot.look)
  const [favorites, setFavorites] = useState<SavedLook[]>(boot.favorites)
  const [recents, setRecents] = useState<string[]>(boot.recents)
  const [keepAwake, setKeepAwake] = useState(boot.keepAwake)
  const [tab, setTab] = useState<Tab>('color')
  const [cat, setCat] = useState<StyleFilter>('call')
  const [hexDraft, setHexDraft] = useState(hslToHex(boot.look.color))
  const [toast, setToast] = useState('')
  const [pinnedHidden, setPinnedHidden] = useState(false)
  const [timerMin, setTimerMin] = useState<number | null>(null)
  const [mixIndex, setMixIndex] = useState(0)
  const idle = useIdleHide(pinnedHidden)
  const awake = useWakeLock(keepAwake)
  const fs = useFullscreen()
  const left = useCountdown(timerMin, () => {
    setLook((prev) => ({ ...prev, brightness: 0 }))
    setTimerMin(null)
    ping('Timer: se atenuó la luz')
  })

  const ink = lookInk(look)
  const hex = lookHex(look)
  const fill = lookBackground(look)
  const hidden = pinnedHidden || idle

  useEffect(() => {
    saveStore({ look, favorites, recents, keepAwake })
  }, [look, favorites, recents, keepAwake])

  useEffect(() => {
    document.documentElement.style.background = fill
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex)
  }, [fill, hex])

  useEffect(() => {
    setHexDraft(hslToHex(look.color))
  }, [look.color])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        void fs.toggle()
      }
      if (event.key === 'h' || event.key === 'H' || event.key === ' ') {
        event.preventDefault()
        setPinnedHidden((v) => !v)
      }
      if (event.key === 'ArrowLeft') {
        patchColor({ ...look.color, h: (look.color.h + 359) % 360 })
      }
      if (event.key === 'ArrowRight') {
        patchColor({ ...look.color, h: (look.color.h + 1) % 360 })
      }
      if (event.key === 'ArrowUp') {
        setLook((prev) => ({ ...prev, brightness: Math.min(1, prev.brightness + 0.03) }))
      }
      if (event.key === 'ArrowDown') {
        setLook((prev) => ({ ...prev, brightness: Math.max(0.04, prev.brightness - 0.03) }))
      }
      if (event.key === 'r' || event.key === 'R') randomize()
      if (event.key === 's' || event.key === 'S') void share()
      if (event.key === 'c' || event.key === 'C') void copyHex()
      if (event.key >= '1' && event.key <= '8') {
        const preset = PRESETS[Number(event.key) - 1]
        if (preset) apply(preset.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [look.color, look.brightness, fs])

  function ping(text: string) {
    setToast(text)
    window.setTimeout(() => setToast(''), 1800)
  }

  function setMode(mode: Mode) {
    setLook((prev) => ({ ...prev, mode }))
    if (mode === 'mix') setTab('mix')
    else if (mode === 'solid' || mode === 'kelvin') setTab('color')
  }

  function patchColor(color: HSL) {
    setLook((prev) => {
      const mix = [...prev.mix]
      mix[0] = color
      return {
        ...prev,
        mode: prev.mode === 'kelvin' ? 'solid' : prev.mode,
        color,
        mix,
        gradA: prev.mode === 'gradient' ? color : prev.gradA,
      }
    })
    setRecents((prev) => pushRecent(prev, hslToHex(color)))
  }

  function apply(id: string) {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    setLook((prev) => applyPreset(prev, preset))
    ping(preset.name)
  }

  function randomize() {
    const color = pleasantRandom()
    patchColor(color)
    setLook((prev) => ({
      ...prev,
      mode: 'solid',
      color,
      mix: [color, complementary(color)],
    }))
  }

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(hex)
      ping(`Copiado ${hex}`)
    } catch {
      ping(hex)
    }
  }

  async function share() {
    const url = shareUrl(look)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Color Screen', url })
      } else {
        await navigator.clipboard.writeText(url)
        ping('Link copiado')
      }
    } catch {
      await navigator.clipboard.writeText(url)
      ping('Link copiado')
    }
  }

  async function eyedrop() {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
    if (!Ctor) {
      ping('Eyedropper no está en este browser')
      return
    }
    try {
      const { sRGBHex } = await new Ctor().open()
      const hsl = hexToHsl(sRGBHex)
      if (hsl) patchColor(hsl)
    } catch {
      /* cancelled */
    }
  }

  function saveFavorite() {
    const item: SavedLook = {
      ...cloneLook(look),
      id: crypto.randomUUID(),
      name: hex,
      savedAt: Date.now(),
    }
    setFavorites((prev) => [item, ...prev].slice(0, 24))
    ping('Look guardado')
  }

  function commitHex() {
    const hsl = hexToHsl(parseHexInput(hexDraft))
    if (hsl) patchColor(hsl)
    else setHexDraft(hslToHex(look.color))
  }

  const rgb = hslToRgb(look.color)

  return (
    <div data-ink={ink}>
      <div
        className="stage"
        data-anim={look.anim}
        style={
          {
            '--fill': fill,
            '--br': look.brightness,
            '--vg': look.vignette,
            '--gr': look.grain,
            '--spd': look.animSpeed,
          } as CSSProperties
        }
      >
        <div className="dim" />
        <div className="vignette" />
        <div className="grain" />
      </div>

      {hidden ? (
        <button className="help-tap" aria-label="Mostrar controles" onClick={() => setPinnedHidden(false)} />
      ) : null}

      <div className={`chrome${hidden ? ' is-hidden' : ''}`}>
        <header className="topbar">
          <div className="brand">
            <b>Color Screen</b>
            <span>{awake ? 'Pantalla despierta' : 'Luz para calls y cuartos'}</span>
          </div>
          <button className="hex" onClick={() => void copyHex()} title="Copiar hex">
            {hex}
          </button>
          <button className="icon-btn" onClick={saveFavorite} title="Guardar look">
            <HeartIcon />
          </button>
          <button className="icon-btn" onClick={() => void share()} title="Compartir">
            <ShareIcon />
          </button>
          <button
            className={`icon-btn${fs.active ? ' is-on' : ''}`}
            onClick={() => void fs.toggle()}
            title="Fullscreen"
          >
            <FullIcon />
          </button>
          <button className="icon-btn" onClick={() => setPinnedHidden((v) => !v)} title="Ocultar UI">
            <HideIcon />
          </button>
        </header>

        <div className="dock">
          <div className="quick" aria-label="Colores rápidos">
            {QUICK.map((q) => (
              <button
                key={q.name}
                className="swatch"
                title={q.name}
                style={{ background: hslToHex(q.color) }}
                onClick={() => {
                  patchColor(q.color)
                  setLook((prev) => ({ ...prev, mode: 'solid', color: q.color }))
                }}
              >
                <small>{q.name}</small>
              </button>
            ))}
          </div>

          <section className="sheet">
            <nav className="seg" aria-label="Modo">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={look.mode === m.id ? 'is-on' : ''}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </nav>
            <nav className="seg" aria-label="Panel" style={{ marginTop: 8 }}>
              {(
                [
                  ['color', 'Color'],
                  ['mix', 'Mix'],
                  ['styles', 'Estilos'],
                  ['light', 'Luz'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="panel">
              {tab === 'color' ? (
                look.mode === 'kelvin' ? (
                  <KelvinPanel look={look} setLook={setLook} />
                ) : look.mode === 'gradient' ? (
                  <GradientPanel look={look} setLook={setLook} />
                ) : look.mode === 'split' ? (
                  <SplitPanel look={look} setLook={setLook} />
                ) : (
                  <>
                    <ColorPad color={look.color} onChange={patchColor} />
                    <input
                      className="hue"
                      type="range"
                      min={0}
                      max={360}
                      value={look.color.h}
                      onChange={(e) => patchColor({ ...look.color, h: Number(e.target.value) })}
                      aria-label="Matiz"
                    />
                    <div className="row">
                      <input
                        className="field grow"
                        value={hexDraft}
                        onChange={(e) => setHexDraft(e.target.value)}
                        onBlur={commitHex}
                        onKeyDown={(e) => e.key === 'Enter' && commitHex()}
                        spellCheck={false}
                        aria-label="Hex"
                      />
                      <button className="pill" onClick={() => void eyedrop()}>
                        Drop
                      </button>
                      <button className="pill" onClick={randomize}>
                        Random
                      </button>
                    </div>
                    <div className="rgb">
                      {(['r', 'g', 'b'] as const).map((ch) => (
                        <label key={ch}>
                          {ch}
                          <input
                            className="field"
                            type="number"
                            min={0}
                            max={255}
                            value={Math.round(rgb[ch])}
                            onChange={(e) => {
                              const next = { ...rgb, [ch]: Number(e.target.value) }
                              patchColor(rgbToHsl(next))
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    {recents.length ? (
                      <div className="quick" style={{ marginTop: 12 }}>
                        {recents.map((h) => (
                          <button
                            key={h}
                            className="swatch"
                            style={{ background: h, width: 28, height: 28 }}
                            onClick={() => {
                              const hsl = hexToHsl(h)
                              if (hsl) patchColor(hsl)
                            }}
                            title={h}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                )
              ) : null}

              {tab === 'mix' ? (
                <MixPanel
                  look={look}
                  setLook={setLook}
                  mixIndex={mixIndex}
                  setMixIndex={setMixIndex}
                />
              ) : null}

              {tab === 'styles' ? (
                <>
                  <div className="cats">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        className={cat === c.id ? 'is-on' : ''}
                        onClick={() => setCat(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                    {favorites.length ? (
                      <button className={cat === 'fav' ? 'is-on' : ''} onClick={() => setCat('fav')}>
                        Guardados
                      </button>
                    ) : null}
                  </div>
                  {cat === 'fav' ? (
                    <div className="grid">
                      {favorites.map((fav) => (
                        <button
                          key={fav.id}
                          className="look"
                          style={{ background: lookBackground(fav) }}
                          onClick={() => setLook(cloneLook(fav))}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setFavorites((prev) => prev.filter((x) => x.id !== fav.id))
                          }}
                        >
                          <b>{fav.name}</b>
                          <span>mantener para borrar</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid">
                      {PRESETS.filter((p) => p.category === cat).map((p) => {
                        const preview = applyPreset(defaultLook(), p)
                        return (
                          <button
                            key={p.id}
                            className="look"
                            style={{ background: lookBackground(preview) }}
                            onClick={() => apply(p.id)}
                          >
                            <b>{p.name}</b>
                            <span>{p.blurb}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}

              {tab === 'light' ? (
                <LightPanel
                  look={look}
                  setLook={setLook}
                  keepAwake={keepAwake}
                  setKeepAwake={setKeepAwake}
                  awake={awake}
                  timerMin={timerMin}
                  setTimerMin={setTimerMin}
                  left={left}
                />
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <div className={`hint${hidden ? ' is-on' : ''}`}>tocá la pantalla para volver</div>
      <div className={`toast${toast ? ' is-on' : ''}`}>{toast}</div>
    </div>
  )
}

function KelvinPanel({
  look,
  setLook,
}: {
  look: Look
  setLook: Dispatch<SetStateAction<Look>>
}) {
  return (
    <>
      <Slider
        label="Temperatura"
        value={look.kelvin}
        min={1800}
        max={7500}
        suffix={`${Math.round(look.kelvin)}K`}
        onChange={(kelvin) => setLook((prev) => ({ ...prev, kelvin }))}
      />
      <div className="row" style={{ marginTop: 14 }}>
        {[1900, 2700, 3200, 4000, 5600, 6500].map((k) => (
          <button
            key={k}
            className={`pill${look.kelvin === k ? ' is-on' : ''}`}
            onClick={() => setLook((prev) => ({ ...prev, kelvin: k }))}
          >
            {k}
          </button>
        ))}
      </div>
    </>
  )
}

function GradientPanel({
  look,
  setLook,
}: {
  look: Look
  setLook: Dispatch<SetStateAction<Look>>
}) {
  return (
    <>
      <div className="row">
        <ColorMini
          label="A"
          color={look.gradA}
          onChange={(gradA) => setLook((prev) => ({ ...prev, gradA }))}
        />
        <ColorMini
          label="B"
          color={look.gradB}
          onChange={(gradB) => setLook((prev) => ({ ...prev, gradB }))}
        />
      </div>
      <div className="row">
        <button
          className={`pill${look.gradKind === 'linear' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, gradKind: 'linear' }))}
        >
          Linear
        </button>
        <button
          className={`pill${look.gradKind === 'radial' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, gradKind: 'radial' }))}
        >
          Radial
        </button>
      </div>
      <Slider
        label="Ángulo"
        value={look.angle}
        min={0}
        max={360}
        suffix={`${Math.round(look.angle)}°`}
        onChange={(angle) => setLook((prev) => ({ ...prev, angle }))}
      />
    </>
  )
}

function SplitPanel({
  look,
  setLook,
}: {
  look: Look
  setLook: Dispatch<SetStateAction<Look>>
}) {
  return (
    <>
      <div className="row">
        <ColorMini
          label="Izq / arriba"
          color={look.splitA}
          onChange={(splitA) => setLook((prev) => ({ ...prev, splitA }))}
        />
        <ColorMini
          label="Der / abajo"
          color={look.splitB}
          onChange={(splitB) => setLook((prev) => ({ ...prev, splitB }))}
        />
      </div>
      <div className="row">
        <button
          className={`pill${look.splitAxis === 'v' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, splitAxis: 'v' }))}
        >
          Vertical
        </button>
        <button
          className={`pill${look.splitAxis === 'h' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, splitAxis: 'h' }))}
        >
          Horizontal
        </button>
      </div>
      <Slider
        label="Corte"
        value={look.splitRatio * 100}
        min={15}
        max={85}
        suffix={`${Math.round(look.splitRatio * 100)}%`}
        onChange={(n) => setLook((prev) => ({ ...prev, splitRatio: n / 100 }))}
      />
    </>
  )
}

function MixPanel({
  look,
  setLook,
  mixIndex,
  setMixIndex,
}: {
  look: Look
  setLook: Dispatch<SetStateAction<Look>>
  mixIndex: number
  setMixIndex: (n: number) => void
}) {
  const active = look.mix[mixIndex] ?? look.mix[0]
  return (
    <>
      <div className="mix-list">
        {look.mix.map((c, i) => (
          <div className="mix-row" key={`${i}-${hslToHex(c)}`}>
            <button
              className="dot"
              style={{ background: hslToHex(c), outline: mixIndex === i ? '2px solid white' : undefined }}
              onClick={() => setMixIndex(i)}
              aria-label={`Color ${i + 1}`}
            />
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={look.mixWeights[i] ?? 1}
              onChange={(e) => {
                const mixWeights = [...look.mixWeights]
                mixWeights[i] = Number(e.target.value)
                setLook((prev) => ({ ...prev, mode: 'mix', mixWeights }))
              }}
              aria-label={`Peso ${i + 1}`}
            />
            <button
              className="pill"
              disabled={look.mix.length <= 2}
              onClick={() => {
                setLook((prev) => ({
                  ...prev,
                  mix: prev.mix.filter((_, j) => j !== i),
                  mixWeights: prev.mixWeights.filter((_, j) => j !== i),
                }))
                setMixIndex(0)
              }}
            >
              −
            </button>
          </div>
        ))}
      </div>
      <ColorPad
        color={active}
        onChange={(color) => {
          setLook((prev) => {
            const mix = [...prev.mix]
            mix[mixIndex] = color
            return { ...prev, mode: 'mix', mix, color: mixIndex === 0 ? color : prev.color }
          })
        }}
      />
      <input
        className="hue"
        type="range"
        min={0}
        max={360}
        value={active.h}
        onChange={(e) => {
          const color = { ...active, h: Number(e.target.value) }
          setLook((prev) => {
            const mix = [...prev.mix]
            mix[mixIndex] = color
            return { ...prev, mode: 'mix', mix }
          })
        }}
        aria-label="Matiz mix"
      />
      <div className="row">
        <button
          className="pill"
          disabled={look.mix.length >= 4}
          onClick={() => {
            setLook((prev) => ({
              ...prev,
              mode: 'mix',
              mix: [...prev.mix, complementary(prev.mix.at(-1) ?? prev.color)],
              mixWeights: [...prev.mixWeights, 1],
            }))
            setMixIndex(look.mix.length)
          }}
        >
          + color
        </button>
        <button
          className={`pill${look.mixStyle === 'flat' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, mixStyle: 'flat', mode: 'mix' }))}
        >
          Uniforme
        </button>
        <button
          className={`pill${look.mixStyle === 'blend' ? ' is-on' : ''}`}
          onClick={() => setLook((prev) => ({ ...prev, mixStyle: 'blend', mode: 'mix' }))}
        >
          Fundido
        </button>
      </div>
    </>
  )
}

function LightPanel({
  look,
  setLook,
  keepAwake,
  setKeepAwake,
  awake,
  timerMin,
  setTimerMin,
  left,
}: {
  look: Look
  setLook: Dispatch<SetStateAction<Look>>
  keepAwake: boolean
  setKeepAwake: (v: boolean) => void
  awake: boolean
  timerMin: number | null
  setTimerMin: (n: number | null) => void
  left: number | null
}) {
  return (
    <>
      <Slider
        label="Brillo"
        value={look.brightness * 100}
        min={4}
        max={100}
        suffix={`${Math.round(look.brightness * 100)}%`}
        onChange={(n) => setLook((prev) => ({ ...prev, brightness: n / 100 }))}
      />
      <Slider
        label="Softbox / viñeta"
        value={look.vignette * 100}
        min={0}
        max={80}
        suffix={`${Math.round(look.vignette * 100)}%`}
        onChange={(n) => setLook((prev) => ({ ...prev, vignette: n / 100 }))}
      />
      <Slider
        label="Grano"
        value={look.grain * 100}
        min={0}
        max={28}
        suffix={`${Math.round(look.grain * 100)}%`}
        onChange={(n) => setLook((prev) => ({ ...prev, grain: n / 100 }))}
      />
      <Slider
        label="Warm / cool"
        value={look.warmShift * 100}
        min={-100}
        max={100}
        suffix={look.warmShift === 0 ? 'neutro' : look.warmShift > 0 ? 'warm' : 'cool'}
        onChange={(n) => setLook((prev) => ({ ...prev, warmShift: n / 100 }))}
      />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {(['none', 'breathe', 'pulse', 'flicker', 'aurora'] as const).map((anim) => (
          <button
            key={anim}
            className={`pill${look.anim === anim ? ' is-on' : ''}`}
            onClick={() => setLook((prev) => ({ ...prev, anim }))}
          >
            {anim === 'none' ? 'Quieto' : anim}
          </button>
        ))}
      </div>
      <Slider
        label="Velocidad"
        value={look.animSpeed * 100}
        min={40}
        max={180}
        suffix={`${look.animSpeed.toFixed(2)}×`}
        onChange={(n) => setLook((prev) => ({ ...prev, animSpeed: n / 100 }))}
      />
      <div className="row">
        <button className={`pill${keepAwake ? ' is-on' : ''}`} onClick={() => setKeepAwake(!keepAwake)}>
          {awake ? 'Keep awake on' : 'Keep awake'}
        </button>
        {[15, 30, 60].map((m) => (
          <button
            key={m}
            className={`pill${timerMin === m ? ' is-on' : ''}`}
            onClick={() => setTimerMin(timerMin === m ? null : m)}
          >
            {m}m
          </button>
        ))}
      </div>
      {left != null ? (
        <p className="kbd">
          Apaga en {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </p>
      ) : null}
      <p className="kbd">
        F fullscreen · H / espacio oculta UI · ← → matiz · ↑ ↓ brillo · R random · S share · C hex ·
        1–8 estilos
      </p>
    </>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (n: number) => void
}) {
  return (
    <label className="slider-block">
      <header>
        <span>{label}</span>
        <span>{suffix}</span>
      </header>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function ColorMini({
  label,
  color,
  onChange,
}: {
  label: string
  color: HSL
  onChange: (c: HSL) => void
}) {
  return (
    <label className="grow">
      <span className="kbd">{label}</span>
      <input
        type="color"
        className="field"
        value={hslToHex(color)}
        onChange={(e) => {
          const hsl = hexToHsl(e.target.value)
          if (hsl) onChange(hsl)
        }}
        style={{ height: 44, padding: 4 }}
      />
    </label>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20s-7-4.4-9.2-8.2C1 9.2 2.2 6 5.4 6c1.8 0 3 1.2 3.6 2.2C9.6 7.2 10.8 6 12.6 6c3.2 0 4.4 3.2 2.6 5.8C13 15.6 12 20 12 20z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.7 15.4 6.8M8.6 13.3l6.8 3.9" />
    </svg>
  )
}

function FullIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
    </svg>
  )
}

function HideIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12s3.2-6 8-6 8 6 8 6-3.2 6-8 6-8-6-8-6z" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  )
}
