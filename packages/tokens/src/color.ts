import {
  argbFromHex,
  customColor,
  DynamicScheme,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
} from '@material/material-color-utilities'

/** M3 color roles (camelCase); each one is the custom property `--md-sys-color-<kebab-case>`. */
export const colorRoles = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'inversePrimary',
  'primaryFixed', 'primaryFixedDim', 'onPrimaryFixed', 'onPrimaryFixedVariant',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'secondaryFixed', 'secondaryFixedDim', 'onSecondaryFixed', 'onSecondaryFixedVariant',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'tertiaryFixed', 'tertiaryFixedDim', 'onTertiaryFixed', 'onTertiaryFixedVariant',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow',
  'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'surfaceTint',
  'outline', 'outlineVariant', 'shadow', 'scrim',
] as const

export type ColorRole = (typeof colorRoles)[number]

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

/** `primaryContainer` → `--md-sys-color-primary-container`. */
export const colorVar = (role: ColorRole): string => `--md-sys-color-${kebab(role)}`

export type SchemeVariant =
  | 'tonalSpot' | 'expressive' | 'vibrant' | 'neutral' | 'content'
  | 'fidelity' | 'monochrome' | 'rainbow' | 'fruitSalad'

type SchemeCtor = new (source: Hct, isDark: boolean, contrast: number, spec?: '2021' | '2025') => DynamicScheme

const VARIANTS: Record<SchemeVariant, SchemeCtor> = {
  tonalSpot: SchemeTonalSpot,
  expressive: SchemeExpressive,
  vibrant: SchemeVibrant,
  neutral: SchemeNeutral,
  content: SchemeContent,
  fidelity: SchemeFidelity,
  monochrome: SchemeMonochrome,
  rainbow: SchemeRainbow,
  fruitSalad: SchemeFruitSalad,
}

export type SchemeOptions = {
  dark: boolean
  /** Default `tonalSpot`, the M3 baseline. */
  variant?: SchemeVariant
  /** -1 (reduced) … 0 (standard) … 1 (high contrast). */
  contrast?: number
  /** Color spec: `2025` is the M3 Expressive revision. */
  spec?: '2021' | '2025'
}

const dynamic = new MaterialDynamicColors()

/** Every color role of a scheme generated from one seed color, as CSS custom properties. */
export function schemeVars(seed: string, o: SchemeOptions): Record<string, string> {
  const Scheme = VARIANTS[o.variant ?? 'tonalSpot']
  const scheme = new Scheme(Hct.fromInt(argbFromHex(seed)), o.dark, o.contrast ?? 0, o.spec ?? '2025')
  const out: Record<string, string> = {}
  for (const role of colorRoles) out[colorVar(role)] = hexFromArgb(dynamic[role]().getArgb(scheme))
  return out
}

/**
 * A brand or semantic color (warning, a course accent…) harmonized with the seed, as the four tones
 * a custom color needs. Name the custom properties at the call site.
 */
export function customColorTones(
  value: string,
  seed: string,
  dark: boolean,
  blend = true,
): { color: string; onColor: string; container: string; onContainer: string } {
  const g = customColor(argbFromHex(seed), { name: 'custom', value: argbFromHex(value), blend })[dark ? 'dark' : 'light']
  return {
    color: hexFromArgb(g.color),
    onColor: hexFromArgb(g.onColor),
    container: hexFromArgb(g.colorContainer),
    onContainer: hexFromArgb(g.onColorContainer),
  }
}

/** Writes custom properties as inline styles (the highest-priority theme source) on `el`. */
export function applyVars(vars: Record<string, string>, el: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
}
