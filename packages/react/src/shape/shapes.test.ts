import { describe, expect, it } from 'vitest'
import { shapeClip, type ShapeName } from './shapes.ts'

const SHAPES: ShapeName[] = ['cookie9', 'cookie12', 'sunny', 'clover4', 'clover8', 'burst12', 'pentagon']
const POLYGON_RE = /^polygon\((?:-?\d+(?:\.\d+)?% -?\d+(?:\.\d+)?%(?:, )?)+\)$/

describe('shapeClip', () => {
  it('defines valid CSS polygon() strings for all 7 shapes', () => {
    expect(Object.keys(shapeClip).sort()).toEqual([...SHAPES].sort())
    for (const name of SHAPES) {
      const value = shapeClip[name]
      expect(value).toMatch(POLYGON_RE)
      const coords = value
        .slice('polygon('.length, -1)
        .split(', ')
        .map((pair) => pair.split(' ').map((n) => Number.parseFloat(n)))
      expect(coords.length).toBeGreaterThanOrEqual(5)
      for (const [x, y] of coords) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(100)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(100)
      }
    }
  })

  it('keeps pentagon pointing straight up and horizontally symmetric', () => {
    const coords = shapeClip.pentagon
      .slice('polygon('.length, -1)
      .split(', ')
      .map((pair) => pair.split(' ').map((n) => Number.parseFloat(n)))
    const minY = Math.min(...coords.map(([, y]) => y!))
    const topPoints = coords.filter(([, y]) => y === minY)
    expect(minY).toBe(0)
    expect(topPoints.some(([x]) => x === 50)).toBe(true)
    const minX = Math.min(...coords.map(([x]) => x!))
    const maxX = Math.max(...coords.map(([x]) => x!))
    expect(minX + maxX).toBeCloseTo(100, 1)
  })
})
