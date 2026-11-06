// Styles: import '@tomato1337/m3e-react/styles.css' once (it brings the tokens along).

export { announce } from './a11y/announce.ts'
export { cx } from './cx.ts'
export { mergeRefs, useLatest } from './useLatest.ts'

export { animateExit, clearExit, CLOSING, EXIT_TIMEOUT_MS } from './presence/exit.ts'
export { closeTopLayer, supportsTopLayerExit } from './presence/topLayer.ts'
export { Presence, usePresence, usePresenceParticipant } from './presence/Presence.tsx'

export { Dialog, type DialogProps } from './dialog/Dialog.tsx'
export { Menu, MenuDivider, MenuItem, type MenuItemProps, type MenuProps } from './menu/Menu.tsx'
export { Snackbar } from './snackbar/Snackbar.tsx'
export { hideToast, toast, toastStore, useToast, type ToastOptions, type ToastState } from './snackbar/toast.ts'

export { Icon } from './icon/Icon.tsx'
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
  type TipPosition,
} from './button/IconButton.tsx'
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button/Button.tsx'
export { ButtonGroup, Segmented, ToggleButton, type ButtonGroupProps } from './button/ButtonGroup.tsx'
export { Chip } from './chip/Chip.tsx'
export { Switch, SwitchIndicator } from './switch/Switch.tsx'

export { Spinner } from './progress/Spinner.tsx'
export { WavyProgress } from './progress/WavyProgress.tsx'
export { WavySpinner } from './progress/WavySpinner.tsx'

export { shapeClip, type ShapeName } from './shape/shapes.ts'
export { useTipAnchor } from './tooltip/useTipAnchor.ts'
