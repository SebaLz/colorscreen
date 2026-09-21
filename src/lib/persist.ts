import { hexToHsl, hslToHex } from './color.ts'
import { cloneLook, defaultLook, type Look, type SavedLook } from './look.ts'

const KEY = 'colorscreen.v1'

export type Store = {
  look: Look
  favorites: SavedLook[]
  recents: string[]
  keepAwake: boolean
}

export function loadStore(): Store {
  const fallback: Store = {
    look: defaultLook(),
    favorites: [],
    recents: [],
    keepAwake: true,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return applySearch(fallback)
    const parsed = JSON.parse(raw) as Partial<Store>
    const look = { ...defaultLook(), ...parsed.look }
    return applySearch({
      look,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      keepAwake: parsed.keepAwake !== false,
    })
  } catch {
    return applySearch(fallback)
  }
}

export function saveStore(store: Pick<Store, 'look' | 'favorites' | 'recents' | 'keepAwake'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* quota / private mode */
  }
}

export function pushRecent(recents: string[], hex: string): string[] {
  const next = [hex.toLowerCase(), ...recents.filter((h) => h !== hex.toLowerCase())]
  return next.slice(0, 16)
}

export function lookToSearch(look: Look): string {
  const p = new URLSearchParams()
  p.set('m', look.mode)
  p.set('c', hslToHex(look.color).slice(1))
  if (look.mode === 'mix') {
    p.set('mix', look.mix.map((c) => hslToHex(c).slice(1)).join('-'))
    p.set('mw', look.mixWeights.map((w) => w.toFixed(2)).join('-'))
    p.set('ms', look.mixStyle)
  }
  if (look.mode === 'gradient') {
    p.set('a', hslToHex(look.gradA).slice(1))
    p.set('b', hslToHex(look.gradB).slice(1))
    p.set('gk', look.gradKind)
    p.set('ang', String(Math.round(look.angle)))
  }
  if (look.mode === 'split') {
    p.set('a', hslToHex(look.splitA).slice(1))
    p.set('b', hslToHex(look.splitB).slice(1))
    p.set('ax', look.splitAxis)
    p.set('sr', look.splitRatio.toFixed(2))
  }
  if (look.mode === 'kelvin') p.set('k', String(Math.round(look.kelvin)))
  p.set('br', String(Math.round(look.brightness * 100)))
  p.set('vg', String(Math.round(look.vignette * 100)))
  p.set('gr', String(Math.round(look.grain * 100)))
  if (look.anim !== 'none') p.set('an', look.anim)
  if (look.animSpeed !== 1) p.set('sp', look.animSpeed.toFixed(2))
  if (look.warmShift !== 0) p.set('ws', look.warmShift.toFixed(2))
  return p.toString()
}

export function shareUrl(look: Look): string {
  const url = new URL(window.location.href)
  url.search = lookToSearch(look)
  return url.toString()
}

function applySearch(store: Store): Store {
  if (typeof window === 'undefined') return store
  const q = new URLSearchParams(window.location.search)
  if (![...q.keys()].length) return store
  const look = cloneLook(store.look)
  const mode = q.get('m')
  if (
    mode === 'solid' ||
    mode === 'mix' ||
    mode === 'gradient' ||
    mode === 'split' ||
    mode === 'kelvin'
  ) {
    look.mode = mode
  }
  const c = hexToHsl(`#${q.get('c') ?? ''}`)
  if (c) look.color = c
  const mix = q.get('mix')
  if (mix) {
    const colors = mix
      .split('-')
      .map((h) => hexToHsl(`#${h}`))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
    if (colors.length >= 2) look.mix = colors
  }
  const mw = q.get('mw')
  if (mw) {
    const weights = mw.split('-').map((n) => Number(n)).filter((n) => Number.isFinite(n))
    if (weights.length) look.mixWeights = weights
  }
  if (q.get('ms') === 'blend' || q.get('ms') === 'flat') look.mixStyle = q.get('ms') as 'blend' | 'flat'
  const ga = hexToHsl(`#${q.get('a') ?? ''}`)
  const gb = hexToHsl(`#${q.get('b') ?? ''}`)
  if (look.mode === 'gradient') {
    if (ga) look.gradA = ga
    if (gb) look.gradB = gb
    if (q.get('gk') === 'radial' || q.get('gk') === 'linear') look.gradKind = q.get('gk') as 'linear' | 'radial'
    const ang = Number(q.get('ang'))
    if (Number.isFinite(ang)) look.angle = ang
  }
  if (look.mode === 'split') {
    if (ga) look.splitA = ga
    if (gb) look.splitB = gb
    const ax = q.get('ax')
    if (ax === 'h' || ax === 'v') look.splitAxis = ax
    const sr = Number(q.get('sr'))
    if (Number.isFinite(sr)) look.splitRatio = sr
  }
  const k = Number(q.get('k'))
  if (Number.isFinite(k) && k >= 1000) look.kelvin = k
  const br = Number(q.get('br'))
  if (Number.isFinite(br)) look.brightness = br / 100
  const vg = Number(q.get('vg'))
  if (Number.isFinite(vg)) look.vignette = vg / 100
  const gr = Number(q.get('gr'))
  if (Number.isFinite(gr)) look.grain = gr / 100
  const an = q.get('an')
  if (an === 'breathe' || an === 'pulse' || an === 'flicker' || an === 'aurora' || an === 'none') {
    look.anim = an
  }
  const sp = Number(q.get('sp'))
  if (Number.isFinite(sp)) look.animSpeed = sp
  const ws = Number(q.get('ws'))
  if (Number.isFinite(ws)) look.warmShift = ws
  return { ...store, look }
}
