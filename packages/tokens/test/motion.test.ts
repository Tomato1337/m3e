import { describe, expect, it } from 'vitest'
import { emphasizedEasing, settleTime, springAt, springEasing, springs } from '../src/motion.ts'

const peak = (s: { stiffness: number; damping: number }) => {
  let max = 0
  for (let t = 0; t < 3; t += 0.001) max = Math.max(max, springAt(s, t))
  return max
}

describe('springs', () => {
  it('start at 0 and settle at 1', () => {
    for (const scheme of Object.values(springs)) {
      for (const kind of Object.values(scheme)) {
        for (const s of Object.values(kind)) {
          expect(springAt(s, 0)).toBeCloseTo(0, 6)
          const t = settleTime(s)
          expect(Math.abs(springAt(s, t) - 1)).toBeLessThanOrEqual(0.0011)
        }
      }
    }
  })

  it('effects springs never overshoot (safe for opacity and colour)', () => {
    for (const scheme of Object.values(springs)) {
      for (const s of Object.values(scheme.effects)) expect(peak(s)).toBeLessThanOrEqual(1.0001)
    }
  })

  it('expressive spatial springs do overshoot', () => {
    expect(peak(springs.expressive.spatial.fast)).toBeGreaterThan(1.05)
  })

  it('faster springs settle sooner', () => {
    const { fast, slow } = springs.expressive.spatial
    expect(settleTime(fast)).toBeLessThan(settleTime(slow))
  })
})

describe('springEasing', () => {
  it('is a linear() easing that ends exactly at 1, with a whole-millisecond duration', () => {
    const { easing, duration } = springEasing(springs.expressive.spatial.default)
    expect(easing.startsWith('linear(0, ')).toBe(true)
    expect(easing.endsWith(', 1)')).toBe(true)
    expect(Number.isInteger(duration)).toBe(true)
    expect(duration).toBeGreaterThan(100)
    expect(duration).toBeLessThan(2000)
  })

  it('keeps stop positions increasing', () => {
    const { easing } = springEasing(springs.expressive.spatial.fast)
    const pcts = [...easing.matchAll(/ ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(pcts.length).toBeGreaterThan(5)
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThan(pcts[i - 1]!)
  })
})

describe('emphasizedEasing', () => {
  it('is a linear() approximation of the emphasized path', () => {
    expect(emphasizedEasing).toMatch(/^linear\(0, .*, 1\)$/)
  })
})
