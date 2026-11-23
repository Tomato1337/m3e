export type ShapeName = 'cookie9' | 'cookie12' | 'sunny' | 'clover4' | 'clover8' | 'burst12' | 'pentagon'

/** [lobes, depth, rotation] per silhouette — the same parameters the mockup's SVG clipPaths were built from. */
const SPEC: Record<Exclude<ShapeName, 'pentagon'>, [lobes: number, depth: number, rot: number]> = {
  cookie9: [9, 0.07, 0],
  cookie12: [12, 0.065, 0],
  sunny: [8, 0.1, 0],
  clover4: [4, 0.2, Math.PI / 4],
  clover8: [8, 0.14, 0],
  burst12: [12, 0.06, 0],
}

function normalize(pts: [number, number][]): string {
  let mx = 0
  for (const [x, y] of pts) mx = Math.max(mx, Math.abs(x), Math.abs(y))
  const out = pts.map(([x, y]) => `${(50 + (50 * x) / mx).toFixed(2)}% ${(50 + (50 * y) / mx).toFixed(2)}%`)
  return `polygon(${out.join(', ')})`
}

function polygon(lobes: number, depth: number, rot: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < 120; i++) {
    const t = (2 * Math.PI * i) / 120
    const r = 1 - depth + depth * Math.cos(lobes * (t + rot))
    pts.push([r * Math.cos(t), r * Math.sin(t)])
  }
  return normalize(pts)
}

/** Regular pentagon pointing up (`rot = -π/2`) with circular corner fillets matching FigCraft (cornerRadius 0.22). */
function pentagonPolygon(): string {
  const n = 5
  const rot = -Math.PI / 2
  const side = 2 * Math.sin(Math.PI / n)
  const d = 0.22 * side
  const beta = ((n - 2) * Math.PI) / (2 * n)
  const r = d * Math.tan(beta)
  const oc = 1 - r / Math.sin(beta)
  const arcSteps = 16
  const pts: [number, number][] = []
  for (let k = 0; k < n; k++) {
    const theta = rot + (2 * Math.PI * k) / n
    const cx = oc * Math.cos(theta)
    const cy = oc * Math.sin(theta)
    const a0 = theta - Math.PI / n
    const a1 = theta + Math.PI / n
    for (let j = 0; j <= arcSteps; j++) {
      const a = a0 + ((a1 - a0) * j) / arcSteps
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  return normalize(pts)
}

/** CSS clip-path per expressive silhouette, computed once at module load. */
export const shapeClip: Record<ShapeName, string> = {
  cookie9: polygon(...SPEC.cookie9),
  cookie12: polygon(...SPEC.cookie12),
  sunny: polygon(...SPEC.sunny),
  clover4: polygon(...SPEC.clover4),
  clover8: polygon(...SPEC.clover8),
  burst12: polygon(...SPEC.burst12),
  pentagon: pentagonPolygon(),
}
