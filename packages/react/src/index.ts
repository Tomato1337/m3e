// Styles: import '@m3e/react/styles.css' once (it brings the tokens along).

export { announce } from './a11y/announce'
export { cx } from './cx'
export { mergeRefs, useLatest } from './useLatest'

export { animateExit, clearExit, CLOSING, EXIT_TIMEOUT_MS } from './presence/exit'
export { closeTopLayer, supportsTopLayerExit } from './presence/topLayer'
export { Presence, usePresence, usePresenceParticipant } from './presence/Presence'

export { Dialog, type DialogProps } from './dialog/Dialog'
export { Menu, MenuDivider, MenuItem, type MenuItemProps, type MenuProps } from './menu/Menu'
export { Snackbar } from './snackbar/Snackbar'
export { hideToast, toast, toastStore, useToast, type ToastOptions, type ToastState } from './snackbar/toast'

export { Icon } from './icon/Icon'
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
  type TipPosition,
} from './button/IconButton'
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button/Button'
export { ButtonGroup, Segmented, ToggleButton, type ButtonGroupProps } from './button/ButtonGroup'
export { Chip } from './chip/Chip'
export { Switch, SwitchIndicator } from './switch/Switch'

export { Spinner } from './progress/Spinner'
export { WavyProgress } from './progress/WavyProgress'
export { WavySpinner } from './progress/WavySpinner'

export { shapeClip, type ShapeName } from './shape/shapes'
export { useTipAnchor } from './tooltip/useTipAnchor'
