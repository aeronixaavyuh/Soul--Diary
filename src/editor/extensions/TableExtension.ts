import Table          from '@tiptap/extension-table'
import TableRow       from '@tiptap/extension-table-row'
import TableHeader    from '@tiptap/extension-table-header'
import TableCell      from '@tiptap/extension-table-cell'

// ─── Extended TableCell with background color support ─────────────────────────

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el =>
          el.getAttribute('data-bg-color') || el.style.backgroundColor || null,
        renderHTML: attrs => {
          if (!attrs.backgroundColor) return {}
          return {
            'data-bg-color': attrs.backgroundColor,
            style:           `background-color: ${attrs.backgroundColor}`,
          }
        },
      },
      textColor: {
        default: null,
        parseHTML: el =>
          el.getAttribute('data-text-color') || el.style.color || null,
        renderHTML: attrs => {
          if (!attrs.textColor) return {}
          return {
            'data-text-color': attrs.textColor,
            style:             `color: ${attrs.textColor}`,
          }
        },
      },
      verticalAlign: {
        default: 'top',
        parseHTML: el => el.style.verticalAlign || 'top',
        renderHTML: attrs => ({
          style: `vertical-align: ${attrs.verticalAlign ?? 'top'}`,
        }),
      },
      textAlign: {
        default: 'left',
        parseHTML: el => el.style.textAlign || 'left',
        renderHTML: attrs => ({
          style: `text-align: ${attrs.textAlign ?? 'left'}`,
        }),
      },
    }
  },
})

// ─── Extended TableHeader with same extra attrs ────────────────────────────────

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el =>
          el.getAttribute('data-bg-color') || el.style.backgroundColor || null,
        renderHTML: attrs => {
          if (!attrs.backgroundColor) return {}
          return {
            'data-bg-color': attrs.backgroundColor,
            style:           `background-color: ${attrs.backgroundColor}`,
          }
        },
      },
    }
  },
})

// ─── Configured Table Extension ───────────────────────────────────────────────

export const ConfiguredTable = Table.configure({
  resizable:        true,    // drag column borders to resize
  handleWidth:      5,
  cellMinWidth:     80,
  HTMLAttributes: {
    class: 'soul-table',
  },
})

// ─── Export all table-related extensions ──────────────────────────────────────

export const TableExtensions = [
  ConfiguredTable,
  TableRow,
  CustomTableHeader,
  CustomTableCell,
]

// ─── Table CSS (inject into globals.css) ──────────────────────────────────────
// Add this to src/styles/globals.css

export const TABLE_STYLES = `
/* ─── Soul Diary Table Styles ──────────────────────────────────────── */

.ProseMirror .soul-table {
  border-collapse: collapse;
  width:           100%;
  margin:          1.25rem 0;
  font-size:       0.9rem;
  overflow:        hidden;
  border-radius:   8px;
  border:          1px solid var(--border);
  table-layout:    fixed;
}

.ProseMirror .soul-table td,
.ProseMirror .soul-table th {
  border:     1px solid var(--border);
  padding:    0.5rem 0.75rem;
  min-width:  80px;
  position:   relative;
  vertical-align: top;
  word-wrap:  break-word;
  color:      var(--text-primary);
  transition: background 0.15s;
}

.ProseMirror .soul-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
  font-size:   0.82rem;
  color:       var(--text-secondary);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  user-select: none;
}

/* Selected cell */
.ProseMirror .soul-table .selectedCell {
  background:  rgba(99,102,241,0.12) !important;
  outline:     2px solid var(--accent);
  outline-offset: -2px;
}

/* Column resize handle */
.ProseMirror .soul-table .column-resize-handle {
  position:   absolute;
  right:      -2px;
  top:        0;
  bottom:     0;
  width:      4px;
  background: var(--accent);
  opacity:    0;
  cursor:     col-resize;
  transition: opacity 0.15s;
  z-index:    10;
}

.ProseMirror .soul-table td:hover .column-resize-handle,
.ProseMirror .soul-table th:hover .column-resize-handle {
  opacity: 0.5;
}

.ProseMirror .soul-table .column-resize-handle:hover,
.ProseMirror .soul-table .resize-cursor .column-resize-handle {
  opacity: 1 !important;
}

/* Resize cursor on table */
.ProseMirror.resize-cursor {
  cursor: col-resize;
}

/* Table focus ring */
.ProseMirror .soul-table:focus-within {
  outline: none;
}

/* Empty cell placeholder */
.ProseMirror .soul-table td p,
.ProseMirror .soul-table th p {
  margin: 0;
}

/* Zebra striping (optional — controlled via toolbar) */
.ProseMirror .soul-table.striped tr:nth-child(even) td {
  background: var(--bg-secondary);
}
`

// ─── TypeScript: extend editor commands ──────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTableCell: {
      setCellBackgroundColor: (color: string | null) => ReturnType
      setCellTextColor:       (color: string | null) => ReturnType
      setCellVerticalAlign:   (align: 'top' | 'middle' | 'bottom') => ReturnType
    }
  }
}