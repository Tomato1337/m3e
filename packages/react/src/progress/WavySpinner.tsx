import { cx } from '../cx'

// 300 samples of a wavy circle with a 78% sweep.
const D = (() => {
  let d = ''
  for (let i = 0; i <= 300; i++) {
    const a = (i / 300) * 2 * Math.PI * 0.78
    const r = 18 + 1.6 * Math.sin(a * 10)
    d += `${i ? 'L' : 'M'}${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)}`
  }
  return d
})()

/**
 * M3 Expressive wavy circular progress, indeterminate. An unlabelled progressbar is noise to a screen
 * reader, so `label` is required. Under reduced motion it turns slowly instead of stopping: a frozen
 * spinner reads as a hung task.
 */
export function WavySpinner({ label, size = 48, className }: { label: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role="progressbar" aria-label={label} className={cx('m3e-wavy-spinner', className)}>
      <path d={D} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
    </svg>
  )
}
