export type RGB = { r: number; g: number; b: number }
export type HSL = { h: number; s: number; l: number }

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function hexToRgb(hex: string): RGB | null {
  const raw = hex.trim().replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0)
  else if (max === G) h = (B - R) / d + 2
  else h = (R - G) / d + 4
  return { h: h * 60, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const H = ((h % 360) + 360) % 360
  const S = clamp(s, 0, 100) / 100
  const L = clamp(l, 0, 100) / 100
  if (S === 0) {
    const v = L * 255
    return { r: v, g: v, b: v }
  }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S
  const p = 2 * L - q
  const hk = H / 360
  const hue = (t: number) => {
    let T = t
    if (T < 0) T += 1
    if (T > 1) T -= 1
    if (T < 1 / 6) return p + (q - p) * 6 * T
    if (T < 1 / 2) return q
    if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6
    return p
  }
  return {
    r: hue(hk + 1 / 3) * 255,
    g: hue(hk) * 255,
    b: hue(hk - 1 / 3) * 255,
  }
}

export function hslToCss(hsl: HSL, alpha = 1): string {
  const { r, g, b } = hslToRgb(hsl)
  if (alpha >= 1) return rgbToHex({ r, g, b })
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHsl(rgb) : null
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

function srgbToLinear(c: number): number {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number): number {
  const x = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return clamp(x * 255, 0, 255)
}

export function mixRgb(colors: RGB[], weights?: number[]): RGB {
  const w =
    weights && weights.length === colors.length
      ? weights
      : colors.map(() => 1)
  const sum = w.reduce((a, b) => a + b, 0) || 1
  let r = 0
  let g = 0
  let b = 0
  colors.forEach((c, i) => {
    const t = w[i] / sum
    r += srgbToLinear(c.r) * t
    g += srgbToLinear(c.g) * t
    b += srgbToLinear(c.b) * t
  })
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) }
}

export function mixHsl(colors: HSL[], weights?: number[]): HSL {
  return rgbToHsl(mixRgb(colors.map(hslToRgb), weights))
}

export function kelvinToRgb(kelvin: number): RGB {
  const temp = clamp(kelvin, 1000, 12000) / 100
  let r: number
  let g: number
  let b: number
  if (temp <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(temp) - 161.1195681661
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592
    g = 288.1221695283 * (temp - 60) ** -0.0755148492
  }
  if (temp >= 66) b = 255
  else if (temp <= 19) b = 0
  else b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) }
}

export function kelvinToHsl(kelvin: number): HSL {
  return rgbToHsl(kelvinToRgb(kelvin))
}

export function relativeLuminance(rgb: RGB): number {
  const R = srgbToLinear(rgb.r)
  const G = srgbToLinear(rgb.g)
  const B = srgbToLinear(rgb.b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function inkOn(hsl: HSL): 'light' | 'dark' {
  const y = relativeLuminance(hslToRgb(hsl))
  if (y > 0.7 || y < 0.34) return 'light'
  return 'dark'
}

export function complementary(hsl: HSL): HSL {
  return { ...hsl, h: (hsl.h + 180) % 360 }
}

export function analogous(hsl: HSL, delta = 32): HSL {
  return { ...hsl, h: (hsl.h + delta + 360) % 360 }
}

export function pleasantRandom(): HSL {
  return {
    h: Math.random() * 360,
    s: 42 + Math.random() * 38,
    l: 46 + Math.random() * 22,
  }
}

export function shiftTemperature(rgb: RGB, amount: number): RGB {
  const t = clamp(amount, -1, 1)
  if (Math.abs(t) < 0.001) return rgb
  const warm = { r: 255, g: 168, b: 86 }
  const cool = { r: 176, g: 210, b: 255 }
  const target = t > 0 ? warm : cool
  const a = Math.abs(t) * 0.42
  return mixRgb([rgb, target], [1 - a, a])
}

export function parseHexInput(value: string): string {
  const v = value.trim()
  if (v.startsWith('#')) return v
  return `#${v}`
}

export function hslToHsv(hsl: HSL): { h: number; s: number; v: number } {
  const l = clamp(hsl.l, 0, 100) / 100
  const s = clamp(hsl.s, 0, 100) / 100
  const v = l + s * Math.min(l, 1 - l)
  const sv = v === 0 ? 0 : 2 * (1 - l / v)
  return { h: hsl.h, s: sv, v }
}

export function hsvToHsl(h: number, s: number, v: number): HSL {
  const S = clamp(s, 0, 1)
  const V = clamp(v, 0, 1)
  const l = V * (1 - S / 2)
  const sl = l === 0 || l === 1 ? 0 : (V - l) / Math.min(l, 1 - l)
  return { h, s: sl * 100, l: l * 100 }
}
