import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type AnyProps = {
  className?: string
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void
  onFocus?: (e: FocusEvent<HTMLElement>) => void
  onBlur?: (e: FocusEvent<HTMLElement>) => void
}

function isTruncated(el: HTMLElement) {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
}

function tipPosition(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const width = Math.min(420, window.innerWidth - 24)
  return {
    x: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    y: Math.min(rect.bottom + 8, window.innerHeight - 12),
  }
}

const CLIP_SELECTORS =
  '.tip-truncate, .v, .attr-val, .tree-field-val, .hero-sub, .hero-value, .path-line, .expanded-dataset-path, .expanded-dataset-name, .project-selection-full, .project-selection-name, .tree-field-name'

function hasClippedContent(el: HTMLElement) {
  if (isTruncated(el)) return true
  for (const node of el.querySelectorAll<HTMLElement>(CLIP_SELECTORS)) {
    if (isTruncated(node)) return true
  }
  return false
}

/**
 * Tooltip for wrapped content.
 * By default only when something inside is ellipsized.
 * Pass `always` when the tip adds info beyond the visible label (e.g. Largest card).
 */
export function HoverTip({
  text,
  children,
  className,
  always = false,
}: {
  text: string
  children: ReactNode
  className?: string
  always?: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const showAt = useCallback(
    (el: HTMLElement) => {
      if (!text) return
      if (!always && !hasClippedContent(el)) return
      setPos(tipPosition(el))
      setOpen(true)
    },
    [text, always],
  )

  const hide = useCallback(() => setOpen(false), [])

  const child = Children.only(children)
  if (!text || !isValidElement(child)) {
    return <>{children}</>
  }

  const el = child as ReactElement<AnyProps>
  const mergedClass = [el.props.className, className].filter(Boolean).join(' ')

  const style: CSSProperties = {
    left: pos.x,
    top: pos.y,
    maxWidth: Math.min(420, window.innerWidth - 24),
  }

  return (
    <>
      {cloneElement(el, {
        className: mergedClass || undefined,
        onMouseEnter: (e: MouseEvent<HTMLElement>) => {
          showAt(e.currentTarget)
          el.props.onMouseEnter?.(e)
        },
        onMouseLeave: (e: MouseEvent<HTMLElement>) => {
          hide()
          el.props.onMouseLeave?.(e)
        },
        onFocus: (e: FocusEvent<HTMLElement>) => {
          showAt(e.currentTarget)
          el.props.onFocus?.(e)
        },
        onBlur: (e: FocusEvent<HTMLElement>) => {
          hide()
          el.props.onBlur?.(e)
        },
      })}
      {open
        ? createPortal(
            <div id={id} className="hover-tip" role="tooltip" style={style}>
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function looksContentTruncated(text: string) {
  return text.endsWith('…') || text.endsWith('...')
}

/** Single-line text: tip when CSS-clipped, or when content was pre-truncated (…), or tip differs. */
export function TipText({
  text,
  tip,
  className,
}: {
  text: string
  /** Shown in the tip when truncated; defaults to `text`. */
  tip?: string
  className?: string
}) {
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const full = tip ?? text

  const show = useCallback(() => {
    const el = ref.current
    if (!el || !full) return
    // Only when the visible line is clipped, or the string itself was shortened with …
    if (!isTruncated(el) && !looksContentTruncated(text)) return
    setPos(tipPosition(el))
    setOpen(true)
  }, [full, text])

  const hide = useCallback(() => setOpen(false), [])

  return (
    <>
      <span
        ref={ref}
        className={className ? `tip-truncate ${className}` : 'tip-truncate'}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {text}
      </span>
      {open
        ? createPortal(
            <div
              id={id}
              className="hover-tip"
              role="tooltip"
              style={{
                left: pos.x,
                top: pos.y,
                maxWidth: Math.min(420, window.innerWidth - 24),
              }}
            >
              {full}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
