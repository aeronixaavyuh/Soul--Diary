import {
  useEffect, useRef, useState, useCallback, memo,
} from 'react'
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import {
  AlignLeft, AlignCenter, AlignRight,
  Trash2, Copy, RotateCcw, Maximize2,
  WrapText, MoveHorizontal,
} from 'lucide-react'

// ─── Node Definition ──────────────────────────────────────────────────────────

export const ResizableImage = Node.create({
  name:      'resizableImage',
  group:     'block',
  atom:      true,
  draggable: true,

  addAttributes() {
    return {
      src:     { default: null },
      alt:     { default: '' },
      title:   { default: '' },
      width:   { default: '40%' },
      height:  { default: 'auto' },
      // align = float mode: left | right | center | block
      align:   { default: 'center' },
      caption: { default: '' },
      margin:  { default: '0.75rem' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})

// ─── Align modes ──────────────────────────────────────────────────────────────

type AlignMode = 'left' | 'center' | 'right' | 'block'

const ALIGN_CONFIG: Record<AlignMode, {
  label:   string
  float:   string
  margin:  string
  display: string
  wrap:    boolean
}> = {
  left: {
    label:   'Float Left',
    float:   'left',
    margin:  '0 1rem 0.5rem 0',
    display: 'block',
    wrap:    true,
  },
  right: {
    label:   'Float Right',
    float:   'right',
    margin:  '0 0 0.5rem 1rem',
    display: 'block',
    wrap:    true,
  },
  center: {
    label:   'Center',
    float:   'none',
    margin:  '1rem auto',
    display: 'block',
    wrap:    false,
  },
  block: {
    label:   'Full Width',
    float:   'none',
    margin:  '1rem 0',
    display: 'block',
    wrap:    false,
  },
}

// ─── ImageView ────────────────────────────────────────────────────────────────

const ImageView = memo(({
  node, updateAttributes, deleteNode, selected,
}: NodeViewProps) => {
  const { src, alt, width, height, align, caption } = node.attrs

  const imgRef       = useRef<HTMLImageElement>(null)
  const wrapRef      = useRef<HTMLDivElement>(null)

  const [isSelected,   setIsSelected]   = useState(false)
  const [isResizing,   setIsResizing]   = useState(false)
  const [naturalW,     setNaturalW]     = useState(0)
  const [currentW,     setCurrentW]     = useState(0)
  const [editCaption,  setEditCaption]  = useState(false)
  const [captionText,  setCaptionText]  = useState(caption ?? '')
  const [showLightbox, setShowLightbox] = useState(false)

  const dragRef = useRef({
    active: false,
    startX: 0,
    startW: 0,
    handle: '',
  })

  const cfg = ALIGN_CONFIG[(align as AlignMode) ?? 'center']

  // ── Load natural dimensions ────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return
    const img  = new Image()
    img.onload = () => setNaturalW(img.naturalWidth)
    img.src    = src
  }, [src])

  // ── Sync selected ──────────────────────────────────────────────────────────
  useEffect(() => {
    setIsSelected(selected)
  }, [selected])

  // ── Compute pixel width ────────────────────────────────────────────────────
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const observer = new ResizeObserver(() => {
      setCurrentW(img.offsetWidth)
    })
    observer.observe(img)
    return () => observer.disconnect()
  }, [width])

  // ── Resize drag ────────────────────────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()

    const img = imgRef.current
    if (!img) return

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startW: img.offsetWidth,
      handle,
    }
    setIsResizing(true)

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      const dx    = ev.clientX - dragRef.current.startX
      const delta = handle === 'w' || handle === 'sw' || handle === 'nw' ? -dx : dx
      const newW  = Math.max(80, dragRef.current.startW + delta)

      setCurrentW(newW)
      updateAttributes({ width: `${Math.round(newW)}px` })
    }

    const onUp = () => {
      dragRef.current.active = false
      setIsResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [updateAttributes])

  // ── Wrapper style — this controls float behavior ───────────────────────────
  const wrapperStyle: React.CSSProperties = {
    float:        cfg.float as any,
    display:      cfg.display,
    margin:       cfg.margin,
    width:        align === 'block' ? '100%' : width,
    maxWidth:     align === 'block' ? '100%' : '90%',
    position:     'relative',
    clear:        align === 'center' || align === 'block' ? 'both' : 'none',
    zIndex:       isSelected ? 2 : 'auto',
    boxSizing:    'border-box',
  }

  // ── HANDLES ────────────────────────────────────────────────────────────────
  const HANDLES = [
    { id: 'nw', pos: { top: -4,    left: -4                                      }, cursor: 'nw-resize' },
    { id: 'ne', pos: { top: -4,    right: -4                                     }, cursor: 'ne-resize' },
    { id: 'se', pos: { bottom: -4, right: -4                                     }, cursor: 'se-resize' },
    { id: 'sw', pos: { bottom: -4, left: -4                                      }, cursor: 'sw-resize' },
    { id: 'e',  pos: { top: '50%' as any, right: -4,  transform: 'translateY(-50%)' }, cursor: 'e-resize'  },
    { id: 'w',  pos: { top: '50%' as any, left: -4,   transform: 'translateY(-50%)' }, cursor: 'w-resize'  },
  ]

  // ── Align buttons config ───────────────────────────────────────────────────
  const ALIGN_BTNS: { mode: AlignMode; icon: React.ReactNode; title: string }[] = [
    {
      mode:  'left',
      icon:  <AlignLeft  size={12} />,
      title: 'Float Left (text wraps right)',
    },
    {
      mode:  'center',
      icon:  <AlignCenter size={12} />,
      title: 'Center (no wrap)',
    },
    {
      mode:  'right',
      icon:  <AlignRight  size={12} />,
      title: 'Float Right (text wraps left)',
    },
    {
      mode:  'block',
      icon:  <MoveHorizontal size={12} />,
      title: 'Full Width (block)',
    },
  ]

  return (
    <>
      {/*
        NodeViewWrapper must be inline-level so float works.
        'as' prop sets the rendered HTML element.
      */}
      <NodeViewWrapper
        as="span"
        style={{
          display:    'contents',
          lineHeight: 0,
        }}
      >
        {/* ── Float wrapper ────────────────────────────────────────── */}
        <span
          ref={wrapRef}
          contentEditable={false}
          style={wrapperStyle}
          onClick={e => { e.stopPropagation(); setIsSelected(true) }}
        >
          {/* Image + handles */}
          <span style={{
            display:      'block',
            position:     'relative',
            outline:      isSelected ? '2px solid #6366f1' : isResizing ? '2px solid rgba(99,102,241,0.4)' : 'none',
            borderRadius: '6px',
            lineHeight:   0,
          }}>
            <img
              ref={imgRef}
              src={src}
              alt={alt ?? ''}
              draggable={false}
              onDoubleClick={() => setShowLightbox(true)}
              style={{
                display:      'block',
                width:        '100%',
                height:       align === 'block' ? 'auto' : height,
                borderRadius: '6px',
                userSelect:   'none',
                cursor:       isResizing ? 'ew-resize' : 'default',
                maxWidth:     '100%',
              }}
            />

            {/* Resize handles */}
            {isSelected && !isResizing && HANDLES.map(h => (
              <span
                key={h.id}
                onMouseDown={e => startResize(e, h.id)}
                style={{
                  position:     'absolute',
                  width:        '10px',
                  height:       '10px',
                  background:   'white',
                  border:       '2px solid #6366f1',
                  borderRadius: '50%',
                  zIndex:       10,
                  cursor:       h.cursor,
                  boxShadow:    '0 1px 4px rgba(0,0,0,0.3)',
                  ...h.pos as any,
                }}
              />
            ))}

            {/* Size badge */}
            {(isSelected || isResizing) && currentW > 0 && (
              <span style={{
                position:      'absolute',
                bottom:        6,
                left:          '50%',
                transform:     'translateX(-50%)',
                background:    'rgba(0,0,0,0.75)',
                color:         'white',
                fontSize:      '0.62rem',
                padding:       '2px 8px',
                borderRadius:  '999px',
                whiteSpace:    'nowrap',
                pointerEvents: 'none',
                zIndex:        10,
                lineHeight:    '1.4',
              }}>
                {Math.round(currentW)}px
                {naturalW ? ` · orig ${naturalW}px` : ''}
              </span>
            )}
          </span>

          {/* ── Floating Toolbar ──────────────────────────────────── */}
          {isSelected && !isResizing && (
            <span
              contentEditable={false}
              onMouseDown={e => e.stopPropagation()}
              style={{
                position:        'absolute',
                top:             '-46px',
                left:            '50%',
                transform:       'translateX(-50%)',
                background:      'var(--bg-card, #1e1e2e)',
                border:          '1px solid var(--border, #2a2a3e)',
                borderRadius:    '10px',
                padding:         '4px 6px',
                display:         'flex',
                alignItems:      'center',
                gap:             '2px',
                boxShadow:       '0 4px 20px rgba(0,0,0,0.3)',
                zIndex:          1000,
                whiteSpace:      'nowrap',
                lineHeight:      '1',
              }}
            >
              {/* Align / Float buttons */}
              {ALIGN_BTNS.map(({ mode, icon, title }) => (
                <ImgBtn
                  key={mode}
                  active={align === mode}
                  onClick={() => updateAttributes({ align: mode })}
                  title={title}
                >
                  {icon}
                </ImgBtn>
              ))}

              <ImgDivider />

              {/* Width presets */}
              {(['25%','50%','75%','100%'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => updateAttributes({ width: w })}
                  title={`Width ${w}`}
                  style={{
                    padding:      '3px 5px',
                    borderRadius: '5px',
                    border:       'none',
                    background:   width === w ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color:        width === w ? '#6366f1' : 'var(--text-secondary, #94a3b8)',
                    fontSize:     '0.62rem',
                    fontWeight:   width === w ? 700 : 400,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    lineHeight:   '1',
                  }}
                >
                  {w}
                </button>
              ))}

              <ImgDivider />

              {/* Reset */}
              <ImgBtn
                onClick={() => updateAttributes({ width: '40%', align: 'center' })}
                title="Reset size"
              >
                <RotateCcw size={12} />
              </ImgBtn>

              {/* Fullscreen */}
              <ImgBtn onClick={() => setShowLightbox(true)} title="View fullscreen">
                <Maximize2 size={12} />
              </ImgBtn>

              {/* Copy */}
              <ImgBtn
                onClick={async () => {
                  try {
                    const res  = await fetch(src)
                    const blob = await res.blob()
                    await navigator.clipboard.write([
                      new ClipboardItem({ [blob.type]: blob }),
                    ])
                  } catch {
                    await navigator.clipboard.writeText(src)
                  }
                }}
                title="Copy image"
              >
                <Copy size={12} />
              </ImgBtn>

              {/* Caption toggle */}
              <ImgBtn
                active={!!caption || editCaption}
                onClick={() => setEditCaption(v => !v)}
                title="Add caption"
              >
                <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>CAP</span>
              </ImgBtn>

              <ImgDivider />

              {/* Delete */}
              <ImgBtn onClick={deleteNode} title="Delete image" danger>
                <Trash2 size={12} />
              </ImgBtn>
            </span>
          )}

          {/* ── Caption ───────────────────────────────────────────── */}
          {editCaption && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
              <input
                autoFocus
                type="text"
                value={captionText}
                onChange={e => setCaptionText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    updateAttributes({ caption: captionText })
                    setEditCaption(false)
                  }
                  if (e.key === 'Escape') setEditCaption(false)
                }}
                placeholder="Add a caption..."
                style={{
                  flex:         1,
                  padding:      '3px 8px',
                  borderRadius: '6px',
                  border:       '1px solid #6366f1',
                  background:   'var(--bg-tertiary, #181825)',
                  color:        'var(--text-primary, #e2e8f0)',
                  fontSize:     '0.78rem',
                  fontFamily:   'inherit',
                  outline:      'none',
                }}
              />
              <button
                onClick={() => { updateAttributes({ caption: captionText }); setEditCaption(false) }}
                style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Save
              </button>
            </span>
          )}

          {!editCaption && caption && (
            <span
              onClick={() => setEditCaption(true)}
              style={{ display: 'block', marginTop: '0.3rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted, #475569)', fontStyle: 'italic', cursor: 'text' }}
            >
              {caption}
            </span>
          )}
        </span>

        {/*
          Clearfix span — ONLY for center/block align
          Prevents next content from being stuck beside image
        */}
        {(align === 'center' || align === 'block') && (
          <span style={{ display: 'block', clear: 'both', lineHeight: 0 }} />
        )}

        {/* ── Lightbox ────────────────────────────────────────────── */}
        {showLightbox && (
          <span
            contentEditable={false}
            onClick={() => setShowLightbox(false)}
            style={{
              position:       'fixed',
              inset:          0,
              background:     'rgba(0,0,0,0.92)',
              zIndex:         9999,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'zoom-out',
              backdropFilter: 'blur(4px)',
            }}
          >
            <img
              src={src}
              alt={alt ?? ''}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: '10px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', cursor: 'default' }}
            />
            <span style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              Click anywhere to close
            </span>
            {caption && (
              <span style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.4)', padding: '0.4rem 1rem', borderRadius: '999px' }}>
                {caption}
              </span>
            )}
          </span>
        )}
      </NodeViewWrapper>

      {/* Click outside to deselect */}
      {isSelected && (
        <style>{`
          .ProseMirror { cursor: text; }
        `}</style>
      )}
    </>
  )
})

ImageView.displayName = 'ImageView'

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImgBtn({
  children, onClick, active, title, danger,
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
        width:          '24px',
        height:         '24px',
        borderRadius:   '5px',
        border:         'none',
        background:     active ? 'rgba(99,102,241,0.18)' : 'transparent',
        color:          danger ? '#ef4444' : active ? '#6366f1' : 'var(--text-secondary, #94a3b8)',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'all 0.1s',
        flexShrink:     0,
        lineHeight:     '1',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = danger ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)'
        el.style.color = danger ? '#ef4444' : '#6366f1'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = active ? 'rgba(99,102,241,0.18)' : 'transparent'
        el.style.color = danger ? '#ef4444' : active ? '#6366f1' : 'var(--text-secondary, #94a3b8)'
      }}
    >
      {children}
    </button>
  )
}

function ImgDivider() {
  return (
    <span style={{ width: '1px', height: '16px', background: 'var(--border, #2a2a3e)', margin: '0 2px', flexShrink: 0, display: 'inline-block' }} />
  )
}