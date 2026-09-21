import { useEffect, useRef, useState } from 'react'

export function useWakeLock(enabled: boolean): boolean {
  const [active, setActive] = useState(false)
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      void lockRef.current?.release()
      lockRef.current = null
      setActive(false)
      return
    }

    let cancelled = false

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await lock.release()
          return
        }
        lockRef.current = lock
        setActive(true)
        lock.addEventListener('release', () => {
          if (lockRef.current === lock) {
            lockRef.current = null
            setActive(false)
          }
        })
      } catch {
        setActive(false)
      }
    }

    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lockRef.current?.release()
      lockRef.current = null
    }
  }, [enabled])

  return active
}

export function useFullscreen(): {
  active: boolean
  toggle: () => Promise<void>
} {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* user gesture / unsupported */
    }
  }

  return { active, toggle }
}

export function useIdleHide(paused: boolean, ms = 5200): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (paused) {
      setHidden(false)
      return
    }
    let timer = 0
    let armed = false
    const bump = () => {
      setHidden(false)
      window.clearTimeout(timer)
      armed = true
      timer = window.setTimeout(() => {
        if (armed) setHidden(true)
      }, ms)
    }
    window.addEventListener('pointermove', bump, { passive: true })
    window.addEventListener('pointerdown', bump, { passive: true })
    window.addEventListener('keydown', bump)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', bump)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [paused, ms])

  return hidden
}

export function useCountdown(minutes: number | null, onDone: () => void): number | null {
  const [left, setLeft] = useState<number | null>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (minutes == null) {
      setLeft(null)
      return
    }
    const end = Date.now() + minutes * 60_000
    setLeft(minutes * 60)
    const id = window.setInterval(() => {
      const secs = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(secs)
      if (secs <= 0) {
        window.clearInterval(id)
        done.current()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [minutes])

  return left
}
