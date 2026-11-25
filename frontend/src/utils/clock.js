import { OPEN, CLOSE } from './helpers.js'
import { useEffect, useState } from 'react'

const loadedAt = Date.now()

// Real clock during canteen hours. Outside them, a demo clock starting at 11:30 AM so the app is always demoable.
export function readClock() {
  const d = new Date()
  const real = d.getHours() * 60 + d.getMinutes()
  if (real >= OPEN && real < CLOSE - 30) return { min: real, demo: false }
  return { min: 11 * 60 + 30 + Math.floor((Date.now() - loadedAt) / 60000), demo: true }
}

export function useClock() {
  const [c, setC] = useState(readClock)
  useEffect(() => {
    const t = setInterval(() => setC(readClock()), 15000)
    return () => clearInterval(t)
  }, [])
  return c
}
