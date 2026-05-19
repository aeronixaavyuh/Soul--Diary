import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey }      from '@tiptap/pm/state'

// ─── Hyperlink Mark Extension ─────────────────────────────────────────────────

export const HyperlinkExtension = Mark.create({
  name: 'hyperlink',

  priority: 1000,

  keepOnSplit: false,

  addOptions() {
    return {
      openOnClick:       true,
      HTMLAttributes:    {},
      validate:          (url: string) => !!url,
    }
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: el => el.getAttribute('href'),
        renderHTML: attrs => {
          if (!attrs.href) return {}
          return { href: attrs.href }
        },
      },
      target: {
        default: '_blank',
        parseHTML: el => el.getAttribute('target'),
        renderHTML: attrs => {
          if (!attrs.target) return {}
          return { target: attrs.target }
        },
      },
      rel: {
        default:    'noopener noreferrer',
        parseHTML:  el => el.getAttribute('rel'),
        renderHTML: attrs => {
          if (!attrs.rel) return {}
          return { rel: attrs.rel }
        },
      },
      title: {
        default:    null,
        parseHTML:  el => el.getAttribute('title'),
        renderHTML: attrs => {
          if (!attrs.title) return {}
          return { title: attrs.title }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[href]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          style: `
            color: var(--accent);
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 3px;
            cursor: pointer;
            transition: color 0.15s;
          `,
        }
      ),
      0,
    ]
  },

  // ── Commands ────────────────────────────────────────────────────────────────

  addCommands() {
    return {
      setHyperlink:
        (attrs: { href: string; target?: string; title?: string }) =>
        ({ commands }) => {
          if (!attrs.href) return false
          return commands.setMark(this.name, attrs)
        },

      toggleHyperlink:
        (attrs: { href: string; target?: string; title?: string }) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attrs, { extendEmptyMarkRange: true })
        },

      unsetHyperlink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name, { extendEmptyMarkRange: true })
        },
    }
  },

  // ── Keyboard Shortcut — Ctrl+K ───────────────────────────────────────────

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        // Dispatch custom event — Toolbar will catch this and open link dialog
        const event = new CustomEvent('editor:openLinkDialog', {
          detail: {
            existingHref: this.editor.getAttributes('hyperlink').href ?? '',
          },
        })
        window.dispatchEvent(event)
        return true
      },
    }
  },

  // ── Click to open link ────────────────────────────────────────────────────

  addProseMirrorPlugins() {
    const { openOnClick } = this.options

    return [
      new Plugin({
        key: new PluginKey('hyperlinkClick'),
        props: {
          handleClick(view, pos, event) {
            const { schema, doc }  = view.state
            const range            = doc.resolve(pos)
            const marks            = range.marks()
            const linkMark         = marks.find(m => m.type.name === 'hyperlink')

            if (!linkMark) return false

            const href = linkMark.attrs.href
            if (!href) return false

            // Ctrl/Cmd + click = open link
            if (event.ctrlKey || event.metaKey) {
              window.open(href, '_blank', 'noopener,noreferrer')
              return true
            }

            return false
          },
        },
      }),

      // ── Hover tooltip plugin ─────────────────────────────────────────────
      new Plugin({
        key: new PluginKey('hyperlinkHover'),
        props: {
          handleDOMEvents: {
            mouseover(view, event) {
              const target = event.target as HTMLElement
              const anchor = target.closest('a[href]') as HTMLAnchorElement | null
              if (!anchor) {
                removeLinkTooltip()
                return false
              }
              showLinkTooltip(anchor)
              return false
            },
            mouseout(view, event) {
              const related = event.relatedTarget as HTMLElement
              if (!related?.closest('[data-link-tooltip]')) {
                removeLinkTooltip()
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

// ─── Tooltip helpers ──────────────────────────────────────────────────────────

let tooltipEl: HTMLDivElement | null = null
let tooltipTimer: ReturnType<typeof setTimeout> | undefined = undefined

function showLinkTooltip(anchor: HTMLAnchorElement) {
  clearTimeout(tooltipTimer) 
  removeLinkTooltip()

  const href  = anchor.getAttribute('href') ?? ''
  const rect  = anchor.getBoundingClientRect()

  tooltipEl              = document.createElement('div')
  tooltipEl.setAttribute('data-link-tooltip', 'true')
  tooltipEl.style.cssText = `
    position:       fixed;
    top:            ${rect.bottom + 6}px;
    left:           ${rect.left}px;
    background:     var(--bg-card, #1e1e2e);
    border:         1px solid var(--border, #2a2a3e);
    border-radius:  8px;
    padding:        6px 10px;
    display:        flex;
    align-items:    center;
    gap:            6px;
    font-size:      0.72rem;
    color:          var(--text-secondary, #94a3b8);
    box-shadow:     0 4px 20px rgba(0,0,0,0.25);
    z-index:        9999;
    pointer-events: auto;
    max-width:      320px;
    white-space:    nowrap;
    animation:      tooltipFadeIn 0.15s ease;
  `

  // Link icon
  const icon        = document.createElement('span')
  icon.textContent  = '🔗'
  icon.style.fontSize = '0.75rem'

  // URL text
  const url         = document.createElement('span')
  url.textContent   = href.length > 45 ? href.slice(0, 45) + '...' : href
  url.style.cssText = `
    color:     var(--accent, #6366f1);
    overflow:  hidden;
    text-overflow: ellipsis;
  `

  // Ctrl+click hint
  const hint        = document.createElement('span')
  hint.textContent  = '· Ctrl+click to open'
  hint.style.cssText = `
    color:     var(--text-muted, #475569);
    font-size: 0.65rem;
    flex-shrink: 0;
  `

  // Edit button
  const editBtn       = document.createElement('button')
  editBtn.textContent = 'Edit'
  editBtn.style.cssText = `
    padding:       2px 7px;
    border-radius: 5px;
    border:        1px solid var(--border, #2a2a3e);
    background:    transparent;
    color:         var(--text-secondary, #94a3b8);
    font-size:     0.65rem;
    cursor:        pointer;
    margin-left:   4px;
    flex-shrink:   0;
    font-family:   inherit;
  `
  editBtn.onclick = () => {
    removeLinkTooltip()
    const event = new CustomEvent('editor:openLinkDialog', {
      detail: { existingHref: href },
    })
    window.dispatchEvent(event)
  }

  tooltipEl.appendChild(icon)
  tooltipEl.appendChild(url)
  tooltipEl.appendChild(hint)
  tooltipEl.appendChild(editBtn)

  tooltipEl.addEventListener('mouseleave', removeLinkTooltip)
  document.body.appendChild(tooltipEl)

  // Inject keyframe if not present
  if (!document.getElementById('tooltip-keyframe')) {
    const style       = document.createElement('style')
    style.id          = 'tooltip-keyframe'
    style.textContent = `
      @keyframes tooltipFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
  }
}

function removeLinkTooltip() {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
}

// ─── TypeScript: extend editor commands ──────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hyperlink: {
      setHyperlink:    (attrs: { href: string; target?: string; title?: string }) => ReturnType
      toggleHyperlink: (attrs: { href: string; target?: string; title?: string }) => ReturnType
      unsetHyperlink:  () => ReturnType
    }
  }
}