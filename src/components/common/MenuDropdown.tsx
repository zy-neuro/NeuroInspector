import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

/** Dropdown that portals into document.body so it is never clipped by layout. */
export function MenuDropdown({
  label,
  children,
  className,
}: {
  label: string
  children: (close: () => void) => ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      setPos({
        top: r.bottom + 6,
        right: Math.max(8, window.innerWidth - r.right),
      })
    }
    place()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('mousedown', onDoc)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className={className ?? 'save-menu'}>
      <button
        ref={btnRef}
        type="button"
        className="btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              id={id}
              className="save-menu-pop menu-portal"
              style={{ top: pos.top, right: pos.right }}
            >
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
