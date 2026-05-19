import { useCallback, useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, ListChecks,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Quote, Code, Minus, ImageIcon,
  Undo2, Redo2, Highlighter, Palette,
  ChevronDown, Type, X, Link, Unlink, ExternalLink,
  Table, Grid3X3, Plus, Trash2,
  ArrowLeftToLine, ArrowRightToLine,
  ArrowUpToLine, ArrowDownToLine,
  Merge, Split, RowsIcon, Columns,
  PaintBucket, AlignStartVertical,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  editor:         Editor | null
  onInsertImage?: () => void
  compact?:       boolean
}

interface TBtnProps {
  onClick:   () => void
  isActive?: boolean
  disabled?: boolean
  title:     string
  children:  React.ReactNode
  danger?:   boolean
  width?:    string
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#ffffff','#000000','#ef4444','#f97316',
  '#eab308','#22c55e','#14b8a6','#3b82f6',
  '#8b5cf6','#ec4899','#6b7280','#0ea5e9',
  '#a855f7','#f43f5e','#84cc16','#06b6d4',
]

const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green'  },
  { color: '#bfdbfe', label: 'Blue'   },
  { color: '#e9d5ff', label: 'Purple' },
  { color: '#fbcfe8', label: 'Pink'   },
  { color: '#fed7aa', label: 'Orange' },
]

const CELL_BG_COLORS = [
  'transparent','#fef9c3','#dcfce7','#dbeafe',
  '#f3e8ff',   '#fce7f3','#ffedd5','#f1f5f9',
  '#fee2e2',   '#ecfdf5','#eff6ff','#fdf4ff',
]

// ─── ToolbarButton ────────────────────────────────────────────────────────────

function TBtn({ onClick, isActive, disabled, title, children, danger, width }: TBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          width ?? '30px',
        height:         '30px',
        borderRadius:   '7px',
        border:         'none',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        transition:     'all 0.15s',
        flexShrink:     0,
        background:     isActive
          ? 'rgba(99,102,241,0.18)'
          : 'transparent',
        color:          danger
          ? '#ef4444'
          : isActive
          ? 'var(--accent)'
          : 'var(--text-secondary)',
        opacity:        disabled ? 0.35 : 1,
        fontSize:       '0.75rem',
        fontFamily:     'inherit',
        fontWeight:     isActive ? 600 : 400,
        gap:            '3px',
        padding:        width ? '0 8px' : '0',
        whiteSpace:     'nowrap',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement
          el.style.background = danger
            ? 'rgba(239,68,68,0.1)'
            : isActive
            ? 'rgba(99,102,241,0.28)'
            : 'var(--bg-tertiary)'
          el.style.color = danger ? '#ef4444'
            : isActive ? 'var(--accent)'
            : 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = isActive
          ? 'rgba(99,102,241,0.18)'
          : 'transparent'
        el.style.color = danger ? '#ef4444'
          : isActive ? 'var(--accent)'
          : 'var(--text-secondary)'
      }}
    >
      {children}
    </button>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Sep() {
  return (
    <div style={{
      width:      '1px',
      height:     '20px',
      background: 'var(--border)',
      flexShrink: 0,
      margin:     '0 2px',
    }} />
  )
}

// ─── Generic Dropdown Backdrop ────────────────────────────────────────────────

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
      onClick={onClose}
    />
  )
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  currentColor, onSelect, onClear, onClose,
  title, presets, showClear = true,
}: {
  currentColor?: string
  onSelect:  (c: string) => void
  onClear?:  () => void
  onClose:   () => void
  title:     string
  presets:   string[]
  showClear?:boolean
}) {
  const inputRef                      = useRef<HTMLInputElement>(null)
  const [custom, setCustom]           = useState(currentColor ?? '#6366f1')

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position:     'absolute',
        top:          '100%',
        left:         0,
        marginTop:    '6px',
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '14px',
        padding:      '0.875rem',
        zIndex:       100,
        boxShadow:    '0 12px 40px rgba(0,0,0,0.25)',
        width:        '220px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={12} />
          </button>
        </div>

        {/* Custom input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
          <div
            style={{ width: '22px', height: '22px', borderRadius: '5px', background: custom, border: '2px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => inputRef.current?.click()}
          />
          <input ref={inputRef} type="color" value={custom}
            onChange={e => setCustom(e.target.value)}
            onBlur={e => onSelect(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          />
          <input
            type="text" value={custom} maxLength={7}
            onChange={e => {
              setCustom(e.target.value)
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onSelect(e.target.value)
            }}
            className="selectable"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-primary)' }}
          />
          <button onClick={() => { onSelect(custom); onClose() }}
            style={{ padding: '2px 7px', borderRadius: '5px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', flexShrink: 0 }}>
            OK
          </button>
        </div>

        {/* Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '4px', marginBottom: showClear ? '0.5rem' : 0 }}>
          {presets.map(c => (
            <button key={c} title={c}
              onClick={() => { setCustom(c); onSelect(c); onClose() }}
              style={{ width: '22px', height: '22px', borderRadius: '5px', background: c === 'transparent' ? 'var(--bg-tertiary)' : c, border: currentColor === c ? '2px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', flexShrink: 0, fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            >
              {c === 'transparent' && '✕'}
            </button>
          ))}
        </div>

        {showClear && onClear && (
          <button onClick={() => { onClear(); onClose() }}
            style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            ✕ Remove Color
          </button>
        )}
      </div>
    </>
  )
}

// ─── Heading Dropdown ─────────────────────────────────────────────────────────

function HeadingDD({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const opts = [
    { tag: 'P',  label: 'Paragraph', fn: () => editor.chain().focus().setParagraph().run() },
    { tag: 'H1', label: 'Heading 1', fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { tag: 'H2', label: 'Heading 2', fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { tag: 'H3', label: 'Heading 3', fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  ]
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.4rem', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: '140px' }}>
        {opts.map(o => (
          <button key={o.tag} onClick={() => { o.fn(); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.4rem 0.6rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', transition: 'background 0.1s', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <span style={{ width: '22px', fontWeight: 700, fontSize: '0.7rem', color: 'var(--accent)', fontFamily: "'JetBrains Mono',monospace" }}>{o.tag}</span>
            {o.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Table Insert Grid ────────────────────────────────────────────────────────

function TableGrid({ onInsert, onClose }: {
  onInsert: (rows: number, cols: number) => void
  onClose:  () => void
}) {
  const [hovered, setHovered] = useState({ r: 0, c: 0 })
  const MAX = 8

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position:     'absolute',
        top:          '100%',
        left:         0,
        marginTop:    '4px',
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '0.75rem',
        zIndex:       100,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {hovered.r > 0 && hovered.c > 0
            ? `${hovered.r} × ${hovered.c} table`
            : 'Hover to select size'}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX}, 20px)`, gap: '2px' }}>
          {Array.from({ length: MAX }, (_, ri) =>
            Array.from({ length: MAX }, (_, ci) => {
              const r = ri + 1
              const c = ci + 1
              const active = r <= hovered.r && c <= hovered.c
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseEnter={() => setHovered({ r, c })}
                  onClick={() => { onInsert(r, c); onClose() }}
                  style={{
                    width:        '20px',
                    height:       '20px',
                    borderRadius: '3px',
                    border:       `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background:   active ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                    cursor:       'pointer',
                    transition:   'all 0.1s',
                  }}
                />
              )
            })
          )}
        </div>

        <button
          onClick={() => {
            const r = parseInt(prompt('Rows:', '3') ?? '3')
            const c = parseInt(prompt('Cols:', '3') ?? '3')
            if (r > 0 && c > 0) { onInsert(r, c); onClose() }
          }}
          style={{ marginTop: '0.5rem', width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Custom size...
        </button>
      </div>
    </>
  )
}

// ─── Table Controls Panel ─────────────────────────────────────────────────────

function TableControls({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [showCellBg, setShowCellBg] = useState(false)

  const btn = (label: string, icon: React.ReactNode, fn: () => void, disabled = false) => (
    <button
      onClick={() => { if (!disabled) { fn(); } }}
      disabled={disabled}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '0.5rem',
        width:       '100%',
        padding:     '0.4rem 0.6rem',
        borderRadius:'8px',
        border:      'none',
        background:  'transparent',
        cursor:      disabled ? 'not-allowed' : 'pointer',
        color:       disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize:    '0.8rem',
        fontFamily:  'inherit',
        textAlign:   'left',
        opacity:     disabled ? 0.5 : 1,
        transition:  'background 0.1s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )

  const groups = [
    {
      label: 'Row',
      items: [
        { label: 'Add row above',   icon: <ArrowUpToLine   size={13} />, fn: () => editor.chain().focus().addRowBefore().run() },
        { label: 'Add row below',   icon: <ArrowDownToLine size={13} />, fn: () => editor.chain().focus().addRowAfter().run()  },
        { label: 'Delete row',      icon: <Trash2          size={13} />, fn: () => editor.chain().focus().deleteRow().run()     },
      ],
    },
    {
      label: 'Column',
      items: [
        { label: 'Add col before',  icon: <ArrowLeftToLine  size={13} />, fn: () => editor.chain().focus().addColumnBefore().run() },
        { label: 'Add col after',   icon: <ArrowRightToLine size={13} />, fn: () => editor.chain().focus().addColumnAfter().run()  },
        { label: 'Delete column',   icon: <Trash2           size={13} />, fn: () => editor.chain().focus().deleteColumn().run()    },
      ],
    },
    {
      label: 'Cell',
      items: [
        { label: 'Merge cells',     icon: <Merge  size={13} />, fn: () => editor.chain().focus().mergeCells().run()  },
        { label: 'Split cell',      icon: <Split  size={13} />, fn: () => editor.chain().focus().splitCell().run()   },
        { label: 'Toggle header row',icon:<RowsIcon size={13} />,fn: () => editor.chain().focus().toggleHeaderRow().run()    },
        { label: 'Toggle header col',icon:<Columns size={13} />,fn: () => editor.chain().focus().toggleHeaderColumn().run() },
      ],
    },
  ]

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position:     'absolute',
        top:          '100%',
        left:         0,
        marginTop:    '4px',
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '14px',
        padding:      '0.6rem',
        zIndex:       100,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.25)',
        minWidth:     '200px',
        maxHeight:    '70vh',
        overflowY:    'auto',
      }}>

        {/* Cell background */}
        <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.2rem 0.6rem 0.4rem' }}>
            Cell Background
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', padding: '0 0.6rem' }}>
            {CELL_BG_COLORS.map(c => (
              <button
                key={c}
                title={c === 'transparent' ? 'Remove color' : c}
                onClick={() => {
                  if (c === 'transparent') {
                    editor.chain().focus().setCellAttribute('backgroundColor', null).run()
                  } else {
                    editor.chain().focus().setCellAttribute('backgroundColor', c).run()
                  }
                }}
                style={{
                  width:        '24px',
                  height:       '24px',
                  borderRadius: '5px',
                  background:   c === 'transparent' ? 'var(--bg-tertiary)' : c,
                  border:       '1px solid var(--border)',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent:'center',
                  fontSize:     '0.65rem',
                  color:        'var(--text-muted)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              >
                {c === 'transparent' && '✕'}
              </button>
            ))}
          </div>
        </div>

        {/* Row / Col / Cell groups */}
        {groups.map(g => (
          <div key={g.label} style={{ marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.2rem 0.6rem 0.25rem' }}>
              {g.label}
            </div>
            {g.items.map(item => (
              <div key={item.label}>
                {btn(item.label, item.icon, item.fn)}
              </div>
            ))}
          </div>
        ))}

        {/* Delete table */}
        {btn(
          'Delete table',
          <Trash2 size={13} style={{ color: '#ef4444' }} />,
          () => { editor.chain().focus().deleteTable().run(); onClose() },
        )}
      </div>
    </>
  )
}

// ─── Highlight Dropdown ───────────────────────────────────────────────────────

function HighlightDD({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.6rem', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: '180px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Highlight</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          {HIGHLIGHT_COLORS.map(h => (
            <button key={h.color} title={h.label}
              onClick={() => { editor.chain().focus().setHighlight({ color: h.color }).run(); onClose() }}
              style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: h.color }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            />
          ))}
        </div>
        <button onClick={() => { editor.chain().focus().unsetHighlight().run(); onClose() }}
          style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ✕ Remove Highlight
        </button>
      </div>
    </>
  )
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export default function Toolbar({ editor, onInsertImage, compact = false }: ToolbarProps) {

  // ── Dropdown states ────────────────────────────────────────────────────────
  const [showHeading,    setShowHeading]    = useState(false)
  const [showTextColor,  setShowTextColor]  = useState(false)
  const [showHighlight,  setShowHighlight]  = useState(false)
  const [showTableGrid,  setShowTableGrid]  = useState(false)
  const [showTableCtrl,  setShowTableCtrl]  = useState(false)
  const [showLinkDlg,    setShowLinkDlg]    = useState(false)

  // ── Link state ─────────────────────────────────────────────────────────────
  const [linkUrl,        setLinkUrl]        = useState('')
  const [linkTitle,      setLinkTitle]      = useState('')

  const closeAll = useCallback(() => {
    setShowHeading(false)
    setShowTextColor(false)
    setShowHighlight(false)
    setShowTableGrid(false)
    setShowTableCtrl(false)
    setShowLinkDlg(false)
  }, [])

  // ── Ctrl+K listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail
      setLinkUrl(d?.existingHref ?? '')
      setLinkTitle('')
      closeAll()
      setShowLinkDlg(true)
    }
    window.addEventListener('editor:openLinkDialog', h)
    return () => window.removeEventListener('editor:openLinkDialog', h)
  }, [closeAll])

  // ── Insert link ────────────────────────────────────────────────────────────
  const handleInsertLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor?.chain().focus().unsetHyperlink().run()
    } else {
      let url = linkUrl.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        url = 'https://' + url
      }
      editor?.chain().focus().setHyperlink({
        href:   url,
        target: '_blank',
        title:  linkTitle.trim() || undefined,
      }).run()
    }
    setShowLinkDlg(false)
    setLinkUrl('')
    setLinkTitle('')
  }, [editor, linkUrl, linkTitle])

  if (!editor) return null

  // ── Current state checks ───────────────────────────────────────────────────
  const blockLabel =
    editor.isActive('heading', { level: 1 }) ? 'H1' :
    editor.isActive('heading', { level: 2 }) ? 'H2' :
    editor.isActive('heading', { level: 3 }) ? 'H3' : 'P'

  const textColor    = editor.getAttributes('textStyle').color as string | undefined
  const isLink       = editor.isActive('hyperlink')
  const isInTable    = editor.isActive('table')

  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      flexWrap:    'wrap',
      gap:         '1px',
      padding:     compact ? '0.3rem 0.5rem' : '0.4rem 0.75rem',
      background:  'var(--bg-secondary)',
      borderBottom:'1px solid var(--border)',
      position:    'sticky',
      top:         0,
      zIndex:      10,
      userSelect:  'none',
      minHeight:   '46px',
    }}>

      {/* ── Undo / Redo ───────────────────────────────────────────────── */}
      <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <Undo2 size={14} />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
        <Redo2 size={14} />
      </TBtn>

      <Sep />

      {/* ── Block Type ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { closeAll(); setShowHeading(v => !v) }}
          title="Text style"
          style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            padding: '0 8px', height: '30px', borderRadius: '7px',
            border: 'none', cursor: 'pointer',
            background: showHeading ? 'var(--bg-tertiary)' : 'transparent',
            color: 'var(--text-secondary)', fontSize: '0.75rem',
            fontWeight: 600, fontFamily: 'inherit', minWidth: '44px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = showHeading ? 'var(--bg-tertiary)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
        >
          <Type size={12} />
          <span>{blockLabel}</span>
          <ChevronDown size={10} />
        </button>
        {showHeading && <HeadingDD editor={editor} onClose={() => setShowHeading(false)} />}
      </div>

      <Sep />

      {/* ── Text Formatting ───────────────────────────────────────────── */}
      <TBtn onClick={() => editor.chain().focus().toggleBold().run()}      isActive={editor.isActive('bold')}      title="Bold (Ctrl+B)">      <Bold          size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleItalic().run()}    isActive={editor.isActive('italic')}    title="Italic (Ctrl+I)">    <Italic        size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)"> <Underline     size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleStrike().run()}    isActive={editor.isActive('strike')}    title="Strikethrough">      <Strikethrough size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleCode().run()}      isActive={editor.isActive('code')}      title="Inline code">        <Code          size={14} /></TBtn>

      <Sep />

      {/* ── Text Color ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { closeAll(); setShowTextColor(v => !v) }}
          title="Text color"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', width: '30px', height: '30px',
            borderRadius: '7px', border: 'none', cursor: 'pointer',
            background: showTextColor ? 'var(--bg-tertiary)' : 'transparent', gap: '1px',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = showTextColor ? 'var(--bg-tertiary)' : 'transparent'}
        >
          <Palette size={13} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: textColor ?? 'var(--text-primary)' }} />
        </button>
        {showTextColor && (
          <ColorPicker
            title="Text Color" presets={PRESET_COLORS} currentColor={textColor}
            onSelect={c => editor.chain().focus().setColor(c).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
            onClose={() => setShowTextColor(false)}
          />
        )}
      </div>

      {/* ── Highlight ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <TBtn
          onClick={() => { closeAll(); setShowHighlight(v => !v) }}
          isActive={editor.isActive('highlight') || showHighlight}
          title="Highlight"
        >
          <Highlighter size={14} />
        </TBtn>
        {showHighlight && <HighlightDD editor={editor} onClose={() => setShowHighlight(false)} />}
      </div>

      <Sep />

      {/* ── Lists ─────────────────────────────────────────────────────── */}
      <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  isActive={editor.isActive('bulletList')}  title="Bullet list">  <List        size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered list"> <ListOrdered size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleTaskList().run()}    isActive={editor.isActive('taskList')}    title="Task list">     <ListChecks  size={14} /></TBtn>

      <Sep />

      {/* ── Alignment ─────────────────────────────────────────────────── */}
      <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()}    isActive={editor.isActive({ textAlign: 'left' })}    title="Align left (Ctrl+Shift+L)">    <AlignLeft    size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()}  isActive={editor.isActive({ textAlign: 'center' })}  title="Align center (Ctrl+Shift+E)">  <AlignCenter  size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()}   isActive={editor.isActive({ textAlign: 'right' })}   title="Align right (Ctrl+Shift+R)">   <AlignRight   size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify (Ctrl+Shift+J)">       <AlignJustify size={14} /></TBtn>

      <Sep />

      {/* ── Blocks ────────────────────────────────────────────────────── */}
      <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote"> <Quote size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()}  isActive={editor.isActive('codeBlock')}  title="Code block">  <Code  size={14} /></TBtn>
      <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal divider">              <Minus size={14} /></TBtn>

      <Sep />

      {/* ── Hyperlink ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <TBtn
          onClick={() => {
            const ex = editor.getAttributes('hyperlink').href ?? ''
            setLinkUrl(ex)
            setLinkTitle('')
            closeAll()
            setShowLinkDlg(v => !v)
          }}
          isActive={isLink}
          title="Insert Link (Ctrl+K)"
        >
          <Link size={14} />
        </TBtn>

        {/* Link Dialog */}
        {showLinkDlg && (
          <>
            <Backdrop onClose={() => setShowLinkDlg(false)} />
            <div style={{
              position: 'absolute', top: '110%', left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '1rem', zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: '300px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Link size={13} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isLink ? 'Edit Link' : 'Insert Link'}
                </span>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 500 }}>URL *</div>
                <input
                  autoFocus type="text" value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleInsertLink(); if (e.key === 'Escape') setShowLinkDlg(false) }}
                  placeholder="https://example.com"
                  className="selectable"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(99,102,241,0.12)' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 500 }}>Title (optional)</div>
                <input
                  type="text" value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  placeholder="Link description"
                  className="selectable"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {isLink && (
                  <button
                    onClick={() => { editor?.chain().focus().unsetHyperlink().run(); setShowLinkDlg(false) }}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Unlink size={12} /> Remove
                  </button>
                )}
                <button
                  onClick={() => setShowLinkDlg(false)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertLink}
                  style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={12} />
                  {linkUrl.trim() ? 'Save Link' : 'Remove'}
                </button>
              </div>

              <div style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Ctrl+click to open · Ctrl+K to toggle
              </div>
            </div>
          </>
        )}
      </div>

      {isLink && (
        <TBtn onClick={() => editor.chain().focus().unsetHyperlink().run()} title="Remove link">
          <Unlink size={14} />
        </TBtn>
      )}

      <Sep />

      {/* ── TABLE ─────────────────────────────────────────────────────── */}
      {/* Insert table (grid picker) */}
      <div style={{ position: 'relative' }}>
        <TBtn
          onClick={() => { closeAll(); setShowTableGrid(v => !v) }}
          isActive={showTableGrid}
          title="Insert table"
        >
          <Grid3X3 size={14} />
        </TBtn>
        {showTableGrid && (
          <TableGrid
            onClose={() => setShowTableGrid(false)}
            onInsert={(rows, cols) => {
              editor.chain().focus().insertTable({
                rows,
                cols,
                withHeaderRow: true,
              }).run()
            }}
          />
        )}
      </div>

      {/* Table controls — only shows when inside table */}
      {isInTable && (
        <div style={{ position: 'relative' }}>
          <TBtn
            onClick={() => { closeAll(); setShowTableCtrl(v => !v) }}
            isActive={showTableCtrl}
            title="Table controls"
            width="auto"
          >
            <Table size={13} />
            <ChevronDown size={10} />
          </TBtn>
          {showTableCtrl && (
            <TableControls editor={editor} onClose={() => setShowTableCtrl(false)} />
          )}
        </div>
      )}

      <Sep />

      {/* ── Image ─────────────────────────────────────────────────────── */}
      {onInsertImage && (
        <TBtn onClick={onInsertImage} title="Insert image (supports resize)">
          <ImageIcon size={14} />
        </TBtn>
      )}
    </div>
  )
}