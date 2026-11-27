import { OPEN, CLOSE } from './helpers.js'
import { useEffect, useState } from 'react'

const loadedAt = Date.now()

// Real clock during canteen hours (handles after-midnight close > 1440). Outside them, a demo clock inside open hours.
export function readClock(hours) {
  const open = hours?.open ?? OPEN
  const close = hours?.close ?? CLOSE
  const d = new Date()
  let real = d.getHours() * 60 + d.getMinutes()
  if (close > 1440 && real < close - 1440) real += 1440
  if (real >= open && real < close - 15) return { min: real, demo: false }
  const demoStart = Math.max(open + 30, Math.min(11 * 60 + 30, close - 60))
  return { min: demoStart + Math.floor((Date.now() - loadedAt) / 60000), demo: true }
}

export function useClock(hours) {
  const [c, setC] = useState(() => readClock(hours))
  useEffect(() => {
    setC(readClock(hours))
    const t = setInterval(() => setC(readClock(hours)), 15000)
    return () => clearInterval(t)
  }, [hours?.open, hours?.close])
  return c
}
