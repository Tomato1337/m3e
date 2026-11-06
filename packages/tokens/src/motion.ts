/**
 * M3 Expressive motion: springs as CSS `linear()` easings with an explicit duration.
 *
 * CSS cannot run a spring, so the curve is sampled once (at build time, see scripts/gen.ts) and
 * stored in custom properties. The duration is where the spring settles within `SETTLE`: past that
 * point the remaining wobble is far below a pixel and only delays `transitionend`.
 */

/** Stiffness (N/m, unit mass) and damping ratio, as in Jetpack Compose `spring()`. */
export type Spring = { stiffness: number; damping: number }

export type MotionSpeed = 'fast' | 'default' | 'slow'
export type MotionKind = 'spatial' | 'effects'
export type MotionScheme = 'expressive' | 'standard'

/** Spring tokens of the two M3 motion schemes (Compose `MotionScheme.expressive()/standard()`). */
export const springs: Record<MotionScheme, Record<MotionKind, Record<MotionSpeed, Spring>>> = {
  expressive: {
    spatial: {
      fast: { stiffness: 800, damping: 0.6 },
      default: { stiffness: 380, damping: 0.8 },
      slow: { stiffness: 200, damping: 0.8 },
    },
    effects: {
      fast: { stiffness: 3800, damping: 1 },
      default: { stiffness: 1600, damping: 1 },
      slow: { stiffness: 800, damping: 1 },
    },
  },
  standard: {
    spatial: {
      fast: { stiffness: 1400, damping: 0.9 },
      default: { stiffness: 700, damping: 0.9 },
      slow: { stiffness: 300, damping: 0.9 },
    },
    effects: {
      fast: { stiffness: 3800, damping: 1 },
      default: { stiffness: 1600, damping: 1 },
      slow: { stiffness: 800, damping: 1 },
    },
  },
}

/** Distance from the target (in units of the travel) below which the spring counts as settled. */
export const SETTLE = 0.001

/** Position of a unit-mass spring released at 0 with no velocity, travelling to 1, at time `t` seconds. */
export function springAt({ stiffness, damping }: Spring, t: number): number {
  const w0 = Math.sqrt(stiffness)
  if (damping < 1) {
    const wd = w0 * Math.sqrt(1 - damping * damping)
    const decay = Math.exp(-damping * w0 * t)
    return 1 - decay * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t))
  }
  if (damping === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  // Overdamped: two real roots.
  const r = w0 * Math.sqrt(damping * damping - 1)
  const s1 = -damping * w0 + r
  const s2 = -damping * w0 - r
  return 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1)
}

/** Seconds until the spring stays within `settle` of the target for good. */
export function settleTime(spring: Spring, settle = SETTLE): number {
  const dt = 0.0005
  let last = 0
  for (let t = 0; t < 10; t += dt) if (Math.abs(springAt(spring, t) - 1) >= settle) last = t
  return last + dt
}

type Point = [x: number, y: number]

/** Ramer–Douglas–Peucker: drop samples that a straight segment already reproduces within `eps`. */
function simplify(points: Point[], eps: number): Point[] {
  if (points.length < 3) return points
  const [x0, y0] = points[0]
  const [x1, y1] = points[points.length - 1]
  let worst = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    // Vertical distance: linear() interpolates the output along time, so error is measured in y.
    const yLine = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1)
    const d = Math.abs(y - yLine)
    if (d > worst) {
      worst = d
      index = i
    }
  }
  if (worst <= eps) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, index + 1), eps).slice(0, -1), ...simplify(points.slice(index), eps)]
}

const num = (v: number, digits: number) => {
  const s = v.toFixed(digits).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/** A `linear()` easing through `points` (x and y in 0…1, y may overshoot). */
export function toLinear(points: Point[], eps = 0.002): string {
  const kept = simplify(points, eps)
  const stops = kept.map(([x, y], i) => {
    if (i === 0) return num(y, 3)
    if (i === kept.length - 1) return num(y, 3)
    return `${num(y, 3)} ${num(x * 100, 2)}%`
  })
  return `linear(${stops.join(', ')})`
}

/** The spring as a CSS easing plus the duration (ms, rounded up to 10 ms) it must run for. */
export function springEasing(spring: Spring, settle = SETTLE): { easing: string; duration: number } {
  const duration = Math.ceil((settleTime(spring, settle) * 1000) / 10) * 10
  const n = 240
  const points: Point[] = []
  for (let i = 0; i <= n; i++) {
    const x = i / n
    points.push([x, i === n ? 1 : springAt(spring, (x * duration) / 1000)])
  }
  return { easing: toLinear(points), duration }
}

type Cubic = [x1: number, y1: number, x2: number, y2: number, x3: number, y3: number]

/**
 * A CSS easing for an SVG-style path of cubic segments from (0,0) to (1,1), such as M3's
 * "emphasized" curve that `cubic-bezier()` cannot express.
 */
export function pathEasing(segments: Cubic[]): string {
  const points: Point[] = [[0, 0]]
  let start: Point = [0, 0]
  for (const [x1, y1, x2, y2, x3, y3] of segments) {
    for (let i = 1; i <= 400; i++) {
      const t = i / 400
      const u = 1 - t
      const x = u * u * u * start[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
      const y = u * u * u * start[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
      points.push([x, y])
    }
    start = [x3, y3]
  }
  // Resample on an even time grid: linear() stops must be monotonic in x.
  const even: Point[] = []
  let j = 0
  for (let i = 0; i <= 200; i++) {
    const x = i / 200
    while (j < points.length - 2 && points[j + 1][0] < x) j++
    const [ax, ay] = points[j]
    const [bx, by] = points[j + 1]
    even.push([x, ay + ((by - ay) * (x - ax)) / (bx - ax || 1)])
  }
  return toLinear(even, 0.001)
}

/** M3 emphasized easing: `M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1`. */
export const emphasizedEasing = pathEasing([
  [0.05, 0, 0.133333, 0.06, 0.166666, 0.4],
  [0.208333, 0.82, 0.25, 1, 1, 1],
])
