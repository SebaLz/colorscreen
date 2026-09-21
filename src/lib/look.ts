import {
  complementary,
  hslToCss,
  hslToHex,
  inkOn,
  kelvinToHsl,
  mixHsl,
  type HSL,
} from './color.ts'

export type Mode = 'solid' | 'mix' | 'gradient' | 'split' | 'kelvin'
export type Anim = 'none' | 'breathe' | 'pulse' | 'flicker' | 'aurora'
export type MixStyle = 'flat' | 'blend'
export type GradKind = 'linear' | 'radial'
export type Axis = 'h' | 'v'

export type Look = {
  mode: Mode
  color: HSL
  mix: HSL[]
  mixWeights: number[]
  mixStyle: MixStyle
  gradA: HSL
  gradB: HSL
  gradKind: GradKind
  angle: number
  splitA: HSL
  splitB: HSL
  splitAxis: Axis
  splitRatio: number
  kelvin: number
  brightness: number
  vignette: number
  grain: number
  anim: Anim
  animSpeed: number
  warmShift: number
}

export type SavedLook = Look & {
  id: string
  name: string
  savedAt: number
}

export const DEFAULT_COLOR: HSL = { h: 22, s: 72, l: 62 }

export function defaultLook(): Look {
  const color = DEFAULT_COLOR
  const pair = complementary({ ...color, s: 48, l: 48 })
  return {
    mode: 'solid',
    color,
    mix: [color, pair],
    mixWeights: [1, 1],
    mixStyle: 'flat',
    gradA: color,
    gradB: { h: 332, s: 58, l: 42 },
    gradKind: 'linear',
    angle: 28,
    splitA: color,
    splitB: { h: 210, s: 36, l: 62 },
    splitAxis: 'v',
    splitRatio: 0.5,
    kelvin: 3200,
    brightness: 0.92,
    vignette: 0.18,
    grain: 0.06,
    anim: 'none',
    animSpeed: 1,
    warmShift: 0,
  }
}

export function effectiveSolid(look: Look): HSL {
  if (look.mode === 'kelvin') return kelvinToHsl(look.kelvin)
  if (look.mode === 'mix') return mixHsl(look.mix, look.mixWeights)
  if (look.mode === 'gradient') return mixHsl([look.gradA, look.gradB])
  if (look.mode === 'split') return mixHsl([look.splitA, look.splitB])
  return look.color
}

export function lookInk(look: Look): 'light' | 'dark' {
  return inkOn(effectiveSolid(look))
}

export function lookHex(look: Look): string {
  return hslToHex(effectiveSolid(look))
}

export function lookBackground(look: Look): string {
  const tint = (hsl: HSL) => hslToCss(shiftHsl(hsl, look.warmShift))

  if (look.mode === 'kelvin') return tint(kelvinToHsl(look.kelvin))
  if (look.mode === 'solid') return tint(look.color)
  if (look.mode === 'mix' && look.mixStyle === 'flat') {
    return tint(mixHsl(look.mix, look.mixWeights))
  }
  if (look.mode === 'mix') {
    return `linear-gradient(${look.angle}deg, ${look.mix.map((c) => tint(c)).join(', ')})`
  }
  if (look.mode === 'gradient') {
    const a = tint(look.gradA)
    const b = tint(look.gradB)
    if (look.gradKind === 'radial') {
      return `radial-gradient(ellipse at 50% 42%, ${a} 0%, ${b} 78%)`
    }
    return `linear-gradient(${look.angle}deg, ${a}, ${b})`
  }
  const a = tint(look.splitA)
  const b = tint(look.splitB)
  const cut = `${Math.round(look.splitRatio * 100)}%`
  if (look.splitAxis === 'h') {
    return `linear-gradient(180deg, ${a} 0% ${cut}, ${b} ${cut} 100%)`
  }
  return `linear-gradient(90deg, ${a} 0% ${cut}, ${b} ${cut} 100%)`
}

function shiftHsl(hsl: HSL, amount: number): HSL {
  if (Math.abs(amount) < 0.001) return hsl
  const warm: HSL = { h: 32, s: 78, l: 58 }
  const cool: HSL = { h: 210, s: 42, l: 64 }
  const target = amount > 0 ? warm : cool
  const t = Math.abs(amount) * 0.36
  return mixHsl([hsl, target], [1 - t, t])
}

export function cloneLook(look: Look): Look {
  return {
    ...look,
    color: { ...look.color },
    mix: look.mix.map((c) => ({ ...c })),
    mixWeights: [...look.mixWeights],
    gradA: { ...look.gradA },
    gradB: { ...look.gradB },
    splitA: { ...look.splitA },
    splitB: { ...look.splitB },
  }
}
