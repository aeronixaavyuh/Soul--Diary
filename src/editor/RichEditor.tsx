import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,

} from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import { ResizableImage } from '@editor/extensions/ImageResizer'
import { HyperlinkExtension } from '@editor/extensions/HyperlinkExtension'
import { TableExtensions } from '@editor/extensions/TableExtension'
// ─── Types ────────────────────────────────────────────────────────────────────

export interface RichEditorRef {
  getJSON: () => object
  getText: () => string
  getHTML: () => string
  getWordCount: () => number
  getCharCount: () => number
  focus: () => void
  setContent: (content: string | object) => void
  clearContent: () => void
  insertImage: (src: string, alt?: string) => void
}

interface RichEditorProps {
  // Content
  initialContent?: string | object   // TipTap JSON string or object
  placeholder?: string

  // Callbacks
  onChange?: (json: string, text: string) => void
  onWordCount?: (words: number, chars: number) => void
  onFocus?: () => void
  onBlur?: () => void

  // ✅ ADD THIS LINE
  onEditorReady?: (editor: Editor) => void

  // Config
  editable?: boolean
  autoFocus?: boolean
  minHeight?: string
  maxHeight?: string
  fontSize?: 'sm' | 'md' | 'lg' | 'xl'
  fontFamily?: 'sans' | 'serif'
  showWordCount?: boolean
}

// ─── Font size map ────────────────────────────────────────────────────────────

const FONT_SIZE_MAP = {
  sm: '0.9rem',
  md: '1.05rem',
  lg: '1.15rem',
  xl: '1.25rem',
}

const FONT_FAMILY_MAP = {
  sans: "'Outfit', system-ui, sans-serif",
  serif: "'Lora', Georgia, serif",
}

// ─── RichEditor Component ─────────────────────────────────────────────────────

const RichEditor = forwardRef<RichEditorRef, RichEditorProps>((props, ref) => {
  const {
    initialContent,
    placeholder = 'Start writing your thoughts...',
    onChange,
    onWordCount,
    onFocus,
    onBlur,
    onEditorReady,
    editable = true,
    autoFocus = false,
    minHeight = '300px',
    maxHeight,
    fontSize = 'md',
    fontFamily = 'serif',
    showWordCount = true,
  } = props

  const onChangeRef = useRef(onChange)
  const onWordCountRef = useRef(onWordCount)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onWordCountRef.current = onWordCount }, [onWordCount])

  // ── Parse initial content ─────────────────────────────────────────────────

  const parseContent = (raw?: string | object) => {
    if (!raw) return ''
    if (typeof raw === 'object') return raw
    try {
      return JSON.parse(raw)
    } catch {
      // If not JSON, treat as plain text
      return raw
    }
  }

  // ── Editor setup ──────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Heading levels 1-3
        heading: { levels: [1, 2, 3] },
        // Built-in: bold, italic, strike, code, codeBlock,
        //           blockquote, bulletList, orderedList, hardBreak, hr
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),

      // Placeholder text
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),

      // Underline ke baad add karo
      // ✅ Table extensions (spread karo — 4 hain)
      ...TableExtensions,
      ResizableImage,
      HyperlinkExtension.configure({ openOnClick: true }),
      // Text alignment
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),

      // Text formatting
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),

      // Highlight
      Highlight.configure({ multicolor: true }),

      // Task list (checklist)
      TaskList,
      TaskItem.configure({ nested: true }),

      // Character/word count
      CharacterCount.configure({ limit: 100000 }),
    ],

    content: parseContent(initialContent),
    editable,
    autofocus: autoFocus ? 'end' : false,

    // On every change — debounced in parent
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON())
      const text = editor.getText()
      const words = editor.storage.characterCount?.words?.() ?? 0
      const chars = editor.storage.characterCount?.characters?.() ?? 0

      onChangeRef.current?.(json, text)
      onWordCountRef.current?.(words, chars)
    },

    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),

    editorProps: {
      attributes: {
        class: 'selectable prose-editor',
        spellcheck: 'true',
        'data-testid': 'rich-editor',
      },
    },
  })

  // ── Expose methods via ref ─────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON() ?? {},

    getText: () => editor?.getText() ?? '',

    getHTML: () => editor?.getHTML() ?? '',

    getWordCount: () =>
      editor?.storage.characterCount?.words?.() ?? 0,

    getCharCount: () =>
      editor?.storage.characterCount?.characters?.() ?? 0,

    focus: () => editor?.commands.focus('end'),

    setContent: (content: string | object) => {
      if (!editor) return
      const parsed = typeof content === 'string'
        ? (() => { try { return JSON.parse(content) } catch { return content } })()
        : content
      editor.commands.setContent(parsed, false)
    },

    clearContent: () => {
      editor?.commands.clearContent(true)
    },


    insertImage: (src: string, alt = '') => {
      editor?.chain().focus()
        .insertContent({
          type: 'resizableImage',
          attrs: { src, alt, width: '100%', align: 'center' },
        })
        .run()
    },
  }))

  useEffect(() => {
    if (ref && 'current' in ref && editor) {
      (ref as any).current._editor = editor
    }
  }, [editor, ref])


  // ✅ ADD THIS — editor ready callback
  useEffect(() => {
    if (editor) {
      // Expose for Toolbar
      if (ref && 'current' in ref) {
        (ref as any).current._editor = editor
      }
      // Notify parent
      onEditorReady?.(editor)
    }
  }, [editor])
  // ── Update editable state ──────────────────────────────────────────────────

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])


  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [])

  // ── Word count display ─────────────────────────────────────────────────────

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0
  const charCount = editor?.storage.characterCount?.characters?.() ?? 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Editor content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight,
          maxHeight: maxHeight ?? 'none',
          padding: '0.5rem 0',
        }}
      >
        <style>{`
          /* Editor font settings */
          .prose-editor {
            font-family:  ${FONT_FAMILY_MAP[fontFamily]};
            font-size:    ${FONT_SIZE_MAP[fontSize]};
            line-height:  1.85;
            color:        var(--text-primary);
            caret-color:  var(--accent);
            outline:      none;
            min-height:   ${minHeight};
            padding:      0 0.25rem;
          }

          /* Placeholder */
          .prose-editor p.is-editor-empty:first-child::before {
            color:          var(--text-muted);
            content:        attr(data-placeholder);
            float:          left;
            height:         0;
            pointer-events: none;
            font-style:     italic;
          }

          /* Headings */
          .prose-editor h1 {
            font-family: 'Playfair Display', serif;
            font-size:   2rem;
            font-weight: 700;
            margin:      1.5rem 0 0.75rem;
            line-height: 1.2;
            color:       var(--text-primary);
          }
          .prose-editor h2 {
            font-family: 'Playfair Display', serif;
            font-size:   1.5rem;
            font-weight: 600;
            margin:      1.25rem 0 0.5rem;
            line-height: 1.3;
          }
          .prose-editor h3 {
            font-size:   1.2rem;
            font-weight: 600;
            margin:      1rem 0 0.5rem;
          }

          /* Paragraph */
          .prose-editor p { margin: 0.4rem 0; }

          /* Lists */
          .prose-editor ul,
          .prose-editor ol {
            padding-left: 1.75rem;
            margin:       0.5rem 0;
          }
          .prose-editor li { margin: 0.3rem 0; }
          .prose-editor li p { margin: 0; }

          /* Blockquote */
          .prose-editor blockquote {
            border-left:  3px solid var(--accent);
            padding:      0.5rem 0 0.5rem 1.25rem;
            margin:       1rem 0;
            color:        var(--text-secondary);
            font-style:   italic;
          }

          /* Code inline */
          .prose-editor code {
            background:    var(--bg-tertiary);
            border-radius: 4px;
            padding:       2px 6px;
            font-family:   'JetBrains Mono', monospace;
            font-size:     0.875em;
            color:         var(--accent);
          }

          /* Code block */
          .prose-editor pre {
            background:    var(--bg-tertiary);
            border-radius: 10px;
            padding:       1rem 1.25rem;
            overflow-x:    auto;
            margin:        1rem 0;
            border:        1px solid var(--border);
          }
          .prose-editor pre code {
            background: none;
            padding:    0;
            color:      var(--text-primary);
          }

          /* Horizontal rule */
          .prose-editor hr {
            border:     none;
            border-top: 1px solid var(--border);
            margin:     1.5rem 0;
          }

          /* Images */
          .prose-editor img.editor-image {
            max-width:     100%;
            border-radius: 10px;
            margin:        1rem 0;
            display:       block;
            box-shadow:    0 4px 20px rgba(0,0,0,0.15);
          }
          .prose-editor img.editor-image.ProseMirror-selectednode {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
          }

          /* Task list */
          .prose-editor ul[data-type="taskList"] {
            list-style: none;
            padding-left: 0.25rem;
          }
          .prose-editor ul[data-type="taskList"] li {
            display:     flex;
            align-items: flex-start;
            gap:         0.6rem;
            margin:      0.4rem 0;
          }
          .prose-editor ul[data-type="taskList"] li > label {
            flex-shrink:   0;
            margin-top:    0.2rem;
          }
          .prose-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
            width:         1rem;
            height:        1rem;
            accent-color:  var(--accent);
            cursor:        pointer;
          }
          .prose-editor ul[data-type="taskList"] li > div {
            flex: 1;
          }
          .prose-editor ul[data-type="taskList"] li[data-checked="true"] > div {
            text-decoration: line-through;
            color:           var(--text-muted);
          }

          /* Highlights */
          .prose-editor mark {
            border-radius: 3px;
            padding:       1px 3px;
          }

          /* Selection */
          .prose-editor ::selection {
            background: rgba(99, 102, 241, 0.25);
          }

          /* Bold / Italic / Strike */
          .prose-editor strong { font-weight: 700; }
          .prose-editor em     { font-style: italic; }
          .prose-editor s      { text-decoration: line-through; }
          .prose-editor u      { text-decoration: underline; }

          /* Scrollbar inside editor */
          .prose-editor::-webkit-scrollbar       { width: 4px; }
          .prose-editor::-webkit-scrollbar-track { background: transparent; }
          .prose-editor::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        `}</style>

        <EditorContent editor={editor} />
      </div>

      {/* Word count footer */}
      {showWordCount && editor && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            padding: '0.5rem 0.25rem',
            borderTop: '1px solid var(--border)',
            marginTop: '0.5rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            userSelect: 'none',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>
              {wordCount.toLocaleString()}
            </strong>{' '}
            {wordCount === 1 ? 'word' : 'words'}
          </span>

          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>
              {charCount.toLocaleString()}
            </strong>{' '}
            {charCount === 1 ? 'character' : 'characters'}
          </span>

          <span>
            ~<strong style={{ color: 'var(--text-secondary)' }}>
              {readTime}
            </strong>{' '}
            min read
          </span>

          {/* Unsaved dot — shown from parent via isDirty */}
        </div>
      )}
    </div>
  )
})

RichEditor.displayName = 'RichEditor'

export default RichEditor

// ─── Hook: useEditorInstance ──────────────────────────────────────────────────
// Use this when you need direct editor access inside a component

export function useEditorInstance(options?: {
  content?: string
  placeholder?: string
  editable?: boolean
  onChange?: (json: string, text: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage,
      Placeholder.configure({
        placeholder: options?.placeholder ?? 'Write something...',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: options?.content ?? '',
    editable: options?.editable ?? true,
    onUpdate: ({ editor }) => {
      options?.onChange?.(
        JSON.stringify(editor.getJSON()),
        editor.getText()
      )
    },
  })

  return editor
}