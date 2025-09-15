import type { ReactNode } from "react"

export interface ContextMenuItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
}

export interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
  width?: number
}