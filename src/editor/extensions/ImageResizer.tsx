import {
  useEffect, useRef, useState,
  useCallback, memo,
} from 'react'
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes }   from '@tiptap/core'
import {
  AlignLeft, AlignCenter, AlignRight,
  Trash2, Copy, RotateCcw,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'

// ─── Custom Image Node ────────────────────────────────────────────────────────

export const ResizableImage = Node.create({
  name:    'resizableImage',
  group:   'block',
  atom:    true,
  draggable: true,

  addAttributes() {
    return {
      src:     { default: null },
      alt:     { default: '' },
      title:   { default: '' },
      width:   { default: '100%' },
      height:  { default: 'auto' },
      align:   { default: 'center' },    // left | center | right
      caption: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageResizerView)
  },
})

// ─── ImageResizerView Component ───────────────────────────────────────────────

const ImageResizerView = memo(({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) => {
  const { src, alt, width, height, align, caption } = node.attrs

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)

  const [isSelected,    setIsSelected]    = useState(false)
  const [showToolbar,   setShowToolbar]   = useState(false)
  const [isResizing,    setIsResizing]    = useState(false)
  const [naturalW,      setNaturalW]      = useState(0)
  const [naturalH,      setNaturalH]      = useState(0)
  const [currentW,      setCurrentW]      = useState<number | null>(null)
  const [editCaption,   setEditCaption]   = useState(false)
  const [captionText,   setCaptionText]   = useState(caption ?? '')
  const [showLightbox,  setShowLightbox]  = useState(false)

  // ── Drag resize state ──────────────────────────────────────────────────────
  const dragRef = useRef({
    active:    false,
    handle:    '',
    startX:    0,
    startY:    0,
    startW:    0,
    startH:    0,
  })

  // ── Load natural image dimensions ──────────────────────────────────────────
  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => {
      setNaturalW(img.naturalWidth)
      setNaturalH(img.naturalHeight)
    }
    img.src = src
  }, [src])

  // ── Sync selected state ────────────────────────────────────────────────────
  useEffect(() => {
    setIsSelected(selected)
    setShowToolbar(selected)
  }, [selected])

  // ── Parse current width ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof width === 'string' && width.endsWith('%')) {
      const container = containerRef.current?.parentElement
      if (container) {
        setCurrentW(container.offsetWidth * (parseFloat(width) / 100))
      }
    } else {
      setCurrentW(parseFloat(width) || null)
    }
  }, [width])

  // ── Resize handles ─────────────────────────────────────────────────────────
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    handle: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const img    = imgRef.current
    if (!img) return

    const imgW   = img.offsetWidth
    const imgH   = img.offsetHeight

    dragRef.current = {
      active:  true,
      handle,
      startX:  e.clientX,
      startY:  e.clientY,
      startW:  imgW,
      startH:  imgH,
    }
    setIsResizing(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY

      let newW = dragRef.current.startW
      let newH = dragRef.current.startH
      const AR = dragRef.current.startH / dragRef.current.startW

      switch (handle) {
        case 'se':
          newW = Math.max(60, dragRef.current.startW + dx)
          newH = newW * AR
          break
        case 'sw':
          newW = Math.max(60, dragRef.current.startW - dx)
          newH = newW * AR
          break
        case 'ne':
          newW = Math.max(60, dragRef.current.startW + dx)
          newH = newW * AR
          break
        case 'nw':
          newW = Math.max(60, dragRef.current.startW - dx)
          newH = newW * AR
          break
        case 'e':
          newW = Math.max(60, dragRef.current.startW + dx)
          break
        case 'w':
          newW = Math.max(60, dragRef.current.startW - dx)
          break
        case 's':
          newH = Math.max(40, dragRef.current.startH + dy)
          break
      }

      setCurrentW(Math.round(newW))
      updateAttributes({
        width:  `${Math.round(newW)}px`,
        height: handle === 's' ? `${Math.round(newH)}px` : 'auto',
      })
    }

    const onMouseUp = () => {
      dragRef.current.active = false
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',  onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [updateAttributes])

  // ── Alignment ──────────────────────────────────────────────────────────────
  const setAlign = useCallback((a: 'left' | 'center' | 'right') => {
    updateAttributes({ align: a })
  }, [updateAttributes])

  // ── Width presets ──────────────────────────────────────────────────────────
  const setWidthPreset = useCallback((w: string) => {
    updateAttributes({ width: w, height: 'auto' })
  }, [updateAttributes])

  // ── Reset to natural ───────────────────────────────────────────────────────
  const resetSize = useCallback(() => {
    if (naturalW) {
      updateAttributes({
        width:  `${naturalW}px`,
        height: 'auto',
      })
    }
  }, [naturalW, updateAttributes])

  // ── Caption update ─────────────────────────────────────────────────────────
  const saveCaption = useCallback(() => {
    updateAttributes({ caption: captionText })
    setEditCaption(false)
  }, [captionText, updateAttributes])

  // ── Copy image ────────────────────────────────────────────────────────────
  const copyImage = useCallback(async () => {
    try {
      const response = await fetch(src)
      const blob     = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ])
    } catch {
      // Fallback: copy URL
      await navigator.clipboard.writeText(src)
    }
  }, [src])

  // ── Alignment container style ──────────────────────────────────────────────
  const alignStyle: React.CSSProperties = {
    display:        'flex',
    justifyContent: align === 'left'   ? 'flex-start'
                  : align === 'right'  ? 'flex-end'
                  : 'center',
    width:          '100%',
    position:       'relative',
  }

  // ── Handle positions ───────────────────────────────────────────────────────
  const HANDLES = [
    { id: 'nw', style: { top: -5, left: -5,  cursor: 'nw-resize' } },
    { id: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    { id: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    { id: 'sw', style: { bottom: -5, left: -5,  cursor: 'sw-resize' } },
    { id: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { id: 'w',  style: { top: '50%', left: -5,  transform: 'translateY(-50%)', cursor: 'w-resize' } },
    { id: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <NodeViewWrapper
      style={{
        display:  'block',
        margin:   '1rem 0',
        position: 'relative',
      }}
    >
      <div style={alignStyle} ref={containerRef}>
        <div
          style={{
            position: 'relative',
            display:  'inline-block',
            maxWidth: '100%',
            outline:  isSelected
              ? '2px solid var(--accent)'
              : isResizing
              ? '2px solid rgba(99,102,241,0.5)'
              : 'none',
            borderRadius: '6px',
            transition:   'outline 0.15s',
            cursor:       isResizing ? 'grabbing' : 'default',
          }}
          onClick={(e) => {
            e.stopPropagation()
            setIsSelected(true)
            setShowToolbar(true)
          }}
        >
          {/* ── Image ──────────────────────────────────────────────────── */}
          <img
            ref={imgRef}
            src={src}
            alt={alt || ''}
            draggable={false}
            style={{
              display:      'block',
              width,
              height,
              maxWidth:     '100%',
              borderRadius: '6px',
              userSelect:   'none',
              transition:   isResizing ? 'none' : 'width 0.1s, height 0.1s',
            }}
            onDoubleClick={() => setShowLightbox(true)}
          />

          {/* ── Resize handles ─────────────────────────────────────────── */}
          {isSelected && !isResizing && HANDLES.map(h => (
            <div
              key={h.id}
              onMouseDown={e => handleResizeStart(e, h.id)}
              style={{
                position:      'absolute',
                width:         '10px',
                height:        '10px',
                background:    'white',
                border:        '2px solid var(--accent)',
                borderRadius:  '50%',
                zIndex:        10,
                boxShadow:     '0 1px 4px rgba(0,0,0,0.3)',
                ...h.style as any,
              }}
            />
          ))}

          {/* ── Size badge ─────────────────────────────────────────────── */}
          {(isSelected || isResizing) && currentW && (
            <div style={{
              position:     'absolute',
              bottom:       6,
              left:         '50%',
              transform:    'translateX(-50%)',
              background:   'rgba(0,0,0,0.7)',
              color:        'white',
              fontSize:     '0.65rem',
              padding:      '2px 8px',
              borderRadius: '999px',
              whiteSpace:   'nowrap',
              pointerEvents:'none',
              zIndex:       10,
            }}>
              {Math.round(currentW)}px
              {naturalW ? ` / ${naturalW}px` : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Toolbar ───────────────────────────────────────────── */}
      {isSelected && !isResizing && (
        <div
          style={{
            position:       'absolute',
            top:            '-44px',
            left:           '50%',
            transform:      'translateX(-50%)',
            background:     'var(--bg-card)',
            border:         '1px solid var(--border)',
            borderRadius:   '10px',
            padding:        '4px 6px',
            display:        'flex',
            alignItems:     'center',
            gap:            '2px',
            boxShadow:      '0 4px 20px rgba(0,0,0,0.25)',
            zIndex:         100,
            whiteSpace:     'nowrap',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Align buttons */}
          {([
            { a: 'left',   icon: <AlignLeft   size={13} /> },
            { a: 'center', icon: <AlignCenter  size={13} /> },
            { a: 'right',  icon: <AlignRight   size={13} /> },
          ] as const).map(({ a, icon }) => (
            <ToolBtn
              key={a}
              active={align === a}
              onClick={() => setAlign(a)}
              title={`Align ${a}`}
            >
              {icon}
            </ToolBtn>
          ))}

          <Divider />

          {/* Width presets */}
          {[
            { label: '25%', value: '25%' },
            { label: '50%', value: '50%' },
            { label: '75%', value: '75%' },
            { label: '100%',value: '100%' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setWidthPreset(p.value)}
              title={`Set width to ${p.label}`}
              style={{
                padding:      '3px 6px',
                borderRadius: '5px',
                border:       'none',
                background:   width === p.value
                  ? 'rgba(99,102,241,0.15)' : 'transparent',
                color:        width === p.value
                  ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize:     '0.65rem',
                fontWeight:   width === p.value ? 700 : 400,
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'all 0.1s',
              }}
            >
              {p.label}
            </button>
          ))}

          <Divider />

          {/* Reset size */}
          <ToolBtn onClick={resetSize} title="Reset to original size">
            <RotateCcw size={13} />
          </ToolBtn>

          {/* Fullscreen */}
          <ToolBtn onClick={() => setShowLightbox(true)} title="View fullscreen">
            <Maximize2 size={13} />
          </ToolBtn>

          {/* Copy */}
          <ToolBtn onClick={copyImage} title="Copy image">
            <Copy size={13} />
          </ToolBtn>

          {/* Caption */}
          <ToolBtn
            active={!!caption || editCaption}
            onClick={() => setEditCaption(v => !v)}
            title="Add caption"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>ALT</span>
          </ToolBtn>

          <Divider />

          {/* Delete */}
          <ToolBtn onClick={deleteNode} title="Delete image" danger>
            <Trash2 size={13} />
          </ToolBtn>
        </div>
      )}

      {/* ── Caption input ───────────────────────────────────────────────── */}
      {editCaption && (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '0.4rem',
          marginTop:  '0.35rem',
          justifyContent: align === 'left' ? 'flex-start'
            : align === 'right' ? 'flex-end' : 'center',
        }}>
          <input
            autoFocus
            type="text"
            value={captionText}
            onChange={e => setCaptionText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  saveCaption()
              if (e.key === 'Escape') setEditCaption(false)
            }}
            placeholder="Add a caption..."
            className="selectable"
            style={{
              padding:      '4px 10px',
              borderRadius: '6px',
              border:       '1px solid var(--accent)',
              background:   'var(--bg-tertiary)',
              color:        'var(--text-primary)',
              fontSize:     '0.8rem',
              fontFamily:   'inherit',
              outline:      'none',
              minWidth:     '200px',
              maxWidth:     '400px',
              boxShadow:    '0 0 0 3px rgba(99,102,241,0.12)',
            }}
          />
          <button
            onClick={saveCaption}
            style={{
              padding:      '4px 10px',
              borderRadius: '6px',
              border:       'none',
              background:   'var(--accent)',
              color:        'white',
              fontSize:     '0.75rem',
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            Save
          </button>
        </div>
      )}

      {/* ── Caption display ─────────────────────────────────────────────── */}
      {!editCaption && caption && (
        <div
          onClick={() => setEditCaption(true)}
          style={{
            marginTop:  '0.35rem',
            textAlign:  align as any,
            fontSize:   '0.78rem',
            color:      'var(--text-muted)',
            fontStyle:  'italic',
            cursor:     'text',
            padding:    '2px 4px',
            borderRadius:'4px',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e =>
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
          }
          onMouseLeave={e =>
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        >
          {caption}
        </div>
      )}

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {showLightbox && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position:        'fixed',
            inset:           0,
            background:      'rgba(0,0,0,0.92)',
            zIndex:          9999,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            cursor:          'zoom-out',
            backdropFilter:  'blur(4px)',
            animation:       'fadeIn 0.2s ease',
          }}
        >
          <img
            src={src}
            alt={alt || ''}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth:     '92vw',
              maxHeight:    '90vh',
              borderRadius: '10px',
              boxShadow:    '0 24px 80px rgba(0,0,0,0.6)',
              cursor:       'default',
              animation:    'scaleIn 0.2s ease',
            }}
          />

          {/* Close hint */}
          <div style={{
            position:   'absolute',
            top:        '1.25rem',
            right:      '1.5rem',
            color:      'rgba(255,255,255,0.6)',
            fontSize:   '0.78rem',
            display:    'flex',
            alignItems: 'center',
            gap:        '0.4rem',
          }}>
            Click anywhere to close
          </div>

          {/* Caption in lightbox */}
          {caption && (
            <div style={{
              position:  'absolute',
              bottom:    '1.5rem',
              left:      '50%',
              transform: 'translateX(-50%)',
              color:     'rgba(255,255,255,0.7)',
              fontSize:  '0.875rem',
              fontStyle: 'italic',
              background:'rgba(0,0,0,0.4)',
              padding:   '0.4rem 1rem',
              borderRadius:'999px',
            }}>
              {caption}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0 }
          to   { transform: scale(1);    opacity: 1 }
        }
      `}</style>
    </NodeViewWrapper>
  )
})

ImageResizerView.displayName = 'ImageResizerView'

// ─── Shared sub-components ────────────────────────────────────────────────────

function ToolBtn({
  children, onClick, active, title, danger
}: {
  children: React.ReactNode
  onClick:  () => void
  active?:  boolean
  title?:   string
  danger?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width:          '26px',
        height:         '26px',
        borderRadius:   '6px',
        border:         'none',
        background:     active
          ? 'rgba(99,102,241,0.15)' : 'transparent',
        color:          danger
          ? '#ef4444'
          : active
          ? 'var(--accent)'
          : 'var(--text-secondary)',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'all 0.1s',
        flexShrink:     0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(239,68,68,0.12)'
          : 'var(--bg-tertiary)'
        ;(e.currentTarget as HTMLElement).style.color = danger
          ? '#ef4444' : 'var(--text-primary)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = active
          ? 'rgba(99,102,241,0.15)' : 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = danger
          ? '#ef4444'
          : active ? 'var(--accent)' : 'var(--text-secondary)'
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div style={{
      width:      '1px',
      height:     '18px',
      background: 'var(--border)',
      margin:     '0 2px',
      flexShrink: 0,
    }} />
  )
}