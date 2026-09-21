import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { hslToCss, hslToHsv, hsvToHsl, type HSL } from '../lib/color.ts'

type Props = {
  color: HSL
  onChange: (color: HSL) => void
}

export function ColorPad({ color, onChange }: Props) {
  const pad = useRef<HTMLDivElement>(null)
  const hsv = hslToHsv(color)

  const setFromEvent = useCallback(
    (event: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
      const el = pad.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
      onChange(hsvToHsl(color.h, x, 1 - y))
    },
    [color.h, onChange],
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setFromEvent(event)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 && event.pressure === 0 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setFromEvent(event)
  }

  return (
    <div
      ref={pad}
      className="pad"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{
        backgroundImage: `linear-gradient(to top, #0a0a0a, transparent), linear-gradient(to right, #fff, ${hslToCss({ h: color.h, s: 100, l: 50 })})`,
      }}
      role="slider"
      aria-label="Saturación y luminosidad"
      aria-valuenow={Math.round(color.s)}
    >
      <span
        className="pad-thumb"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </div>
  )
}
