import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { ContextMenuProps } from "../types/ContextMenuTypes"

const ContextMenu = ({ x, y, items, onClose, width = 180 }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      style={{ top: y, left: x, width }}
      className="fixed bg-white border rounded shadow-lg z-50 select-none"
    >
      {items.map((item, i) => (
        <div
          key={i}
          onClick={(e) => {
            e.stopPropagation()
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          className={`px-3 py-2 cursor-pointer ${item.disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-200"
            }`}
        >
          {item.icon && <span className="mr-2 inline-block">{item.icon}</span>}
          {item.label}
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ContextMenu;
