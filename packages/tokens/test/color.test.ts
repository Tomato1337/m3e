import { describe, expect, it } from 'vitest'
import { colorRoles, colorVar, customColorTones, schemeVars } from '../src/color.ts'

const HEX = /^#[0-9a-f]{6}$/

describe('schemeVars', () => {
  it('produces every role as a hex custom property', () => {
    const vars = schemeVars('#6750a4', { dark: false })
    expect(Object.keys(vars)).toHaveLength(colorRoles.length)
    for (const role of colorRoles) expect(vars[colorVar(role)]).toMatch(HEX)
  })

  it('differs between light and dark', () => {
    const light = schemeVars('#6750a4', { dark: false })
    const dark = schemeVars('#6750a4', { dark: true })
    expect(light['--md-sys-color-surface']).not.toBe(dark['--md-sys-color-surface'])
  })

  it('names roles in kebab case', () => {
    expect(colorVar('surfaceContainerHighest')).toBe('--md-sys-color-surface-container-highest')
  })
})

describe('customColorTones', () => {
  it('returns the four tones of a custom colour', () => {
    const t = customColorTones('#ff9800', '#6750a4', true)
    for (const v of Object.values(t)) expect(v).toMatch(HEX)
  })
})
