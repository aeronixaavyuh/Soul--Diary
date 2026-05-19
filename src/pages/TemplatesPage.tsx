import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Star,
  Trash2, Edit2, Copy, X,
  BookOpen, Lightbulb, CheckSquare,
  Heart, Sparkles, ChevronRight,
  Save, RefreshCw, Tag,
  Lock, Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateType = 'diary' | 'note' | 'idea' | 'task'
type TemplateCategory = 'daily' | 'weekly' | 'gratitude' | 'reflection'
  | 'meeting' | 'project' | 'brainstorm' | 'custom'

interface Template {
  id: string
  name: string
  description: string
  type: TemplateType
  category: TemplateCategory
  icon: string
  content: string        // TipTap JSON string
  preview: string        // plain text preview
  is_builtin: boolean
  is_favorite: boolean
  use_count: number
  created_at: string
  tags: string        // comma separated
}

// ─── Built-in Templates ───────────────────────────────────────────────────────

const BUILTIN_TEMPLATES: Omit<Template, 'created_at'>[] = [

  // ── Diary Templates ────────────────────────────────────────────────────────
  {
    id: 'builtin-daily-diary',
    name: 'Daily Diary',
    description: 'A structured daily journal entry with morning intentions and evening reflections',
    type: 'diary',
    category: 'daily',
    icon: '📔',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'daily,morning,evening,reflection',
    preview: 'Morning intentions, highlights, gratitude, and evening reflections...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌅 Morning Intentions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Today I want to focus on...' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'My top 3 priorities:' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✨ Today\'s Highlights' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The best thing that happened today was...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🙏 Gratitude' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'I am grateful for...' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌙 Evening Reflection' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'How did today go? What could I do better tomorrow?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💭 Mood & Energy' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Today I felt...' }] },
      ],
    }),
  },

  {
    id: 'builtin-gratitude',
    name: 'Gratitude Journal',
    description: 'Focus on positivity with a dedicated gratitude practice',
    type: 'diary',
    category: 'gratitude',
    icon: '🙏',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'gratitude,positive,mindfulness',
    preview: '3 things grateful for, positive moments, affirmations...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🙏 Gratitude Journal' }] },
        { type: 'paragraph', content: [{ type: 'text', text: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Three Things I\'m Grateful For' }] },
        {
          type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✨ One Positive Moment Today' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💪 Daily Affirmation' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'I am...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌱 How I Spread Kindness Today' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌟 Tomorrow I Look Forward To' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ],
    }),
  },

  {
    id: 'builtin-weekly-review',
    name: 'Weekly Review',
    description: 'Comprehensive weekly reflection to track progress and plan ahead',
    type: 'diary',
    category: 'weekly',
    icon: '📊',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'weekly,review,planning,goals',
    preview: 'Week wins, challenges, lessons learned, next week planning...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '📊 Weekly Review' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🏆 Wins This Week' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '😤 Challenges Faced' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📚 Lessons Learned' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '😊 How I Felt This Week' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🎯 Goals for Next Week' }] },
        {
          type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💬 One Word for This Week' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ],
    }),
  },

  {
    id: 'builtin-self-reflection',
    name: 'Deep Reflection',
    description: 'Thoughtful self-reflection prompts for deeper self-understanding',
    type: 'diary',
    category: 'reflection',
    icon: '🔮',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'reflection,self,growth,mindfulness',
    preview: 'Core values check, emotions, growth areas, ideal self...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🔮 Deep Reflection' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Where Am I Right Now?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'In this moment, I feel...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What\'s Weighing on My Mind?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What Am I Avoiding?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What Would My Best Self Do?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What Am I Proud Of?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'One Thing I\'ll Do Differently' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ],
    }),
  },

  // ── Note Templates ─────────────────────────────────────────────────────────
  {
    id: 'builtin-meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured format to capture meeting details, action items and decisions',
    type: 'note',
    category: 'meeting',
    icon: '🤝',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'meeting,work,action-items,decisions',
    preview: 'Attendees, agenda, discussion points, action items...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🤝 Meeting Notes' }] },
        {
          type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
            { type: 'text', text: new Date().toLocaleDateString() },
          ]
        },
        {
          type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' },
            { type: 'text', text: '' },
          ]
        },
        {
          type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Location/Platform: ' },
            { type: 'text', text: '' },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📋 Agenda' }] },
        {
          type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💬 Discussion' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✅ Action Items' }] },
        {
          type: 'taskList', content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '[ Owner ] — Task description — Due: ' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🎯 Decisions Made' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📅 Next Meeting' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Date/Time: ' }] },
      ],
    }),
  },

  {
    id: 'builtin-project-plan',
    name: 'Project Plan',
    description: 'Plan a project with goals, timeline, resources and success metrics',
    type: 'note',
    category: 'project',
    icon: '🚀',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'project,planning,goals,timeline',
    preview: 'Project overview, goals, milestones, team, risks...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🚀 Project Plan' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📌 Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Project Name: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Start Date: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Target Date: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Status: 🟡 Planning' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🎯 Goals' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🗓 Milestones' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Week 1: ' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Week 2: ' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Week 4: ' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '⚠️ Risks' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✅ Success Metrics' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ],
    }),
  },

  // ── Idea Templates ─────────────────────────────────────────────────────────
  {
    id: 'builtin-brainstorm',
    name: 'Brainstorm Session',
    description: 'Free-flowing idea capture with structured expansion prompts',
    type: 'idea',
    category: 'brainstorm',
    icon: '⚡',
    is_builtin: true,
    is_favorite: false,
    use_count: 0,
    tags: 'brainstorm,ideas,creativity,thinking',
    preview: 'Core idea, why it matters, how it works, what could go wrong...',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '⚡ Brainstorm' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💡 The Core Idea' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🤔 Why Does This Matter?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '⚙️ How Would It Work?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🚀 First Steps' }] },
        {
          type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '⚠️ Potential Challenges' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🔥 Excitement Level' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '⭐⭐⭐⭐⭐' }] },
      ],
    }),
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TemplateType, { color: string; bg: string; icon: React.ReactNode; path: string }> = {
  diary: { color: '#f472b6', bg: 'rgba(244,114,182,0.1)', icon: <BookOpen size={13} />, path: '/diary' },
  note: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: <FileText size={13} />, path: '/notes' },
  idea: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <Lightbulb size={13} />, path: '/ideas' },
  task: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: <CheckSquare size={13} />, path: '/tasks' },
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  daily: '📅 Daily',
  weekly: '📊 Weekly',
  gratitude: '🙏 Gratitude',
  reflection: '🔮 Reflection',
  meeting: '🤝 Meeting',
  project: '🚀 Project',
  brainstorm: '⚡ Brainstorm',
  custom: '⚙️ Custom',
}

const generateId = () =>
  'tmpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── TemplatesPage ────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TemplateType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)
  const [selected, setSelected] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState<TemplateType>('diary')
  const [formCategory, setFormCategory] = useState<TemplateCategory>('custom')
  const [formIcon, setFormIcon] = useState('📝')
  const [formContent, setFormContent] = useState('')
  const [formTags, setFormTags] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)

  const EMOJI_OPTIONS = ['📔', '📝', '💡', '✅', '🎯', '📊', '🚀', '💭',
    '🌟', '⚡', '🤝', '🔮', '🙏', '❤️', '🌱', '📚']

  // ── Load templates ─────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load custom templates from DB
      const custom = await window.electronAPI.db.all(`
        SELECT * FROM templates
        WHERE is_active = 1
        ORDER BY use_count DESC, created_at DESC
      `).catch(() => []) as Template[]

      // Merge builtin + custom
      const now = new Date().toISOString()
      const builtins = BUILTIN_TEMPLATES.map(t => ({
        ...t,
        created_at: now,
      }))

      setTemplates([...builtins, ...(custom ?? [])])
    } catch {
      // If table doesn't exist, just show builtins
      const now = new Date().toISOString()
      setTemplates(BUILTIN_TEMPLATES.map(t => ({ ...t, created_at: now })))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = templates.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType
    const matchSearch = !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  // ── Group by type ──────────────────────────────────────────────────────────
  const grouped = (['diary', 'note', 'idea', 'task'] as TemplateType[])
    .map(type => ({
      type,
      items: filtered.filter(t => t.type === type),
    }))
    .filter(g => g.items.length > 0)

  // ── Use template ───────────────────────────────────────────────────────────
  const useTemplate = useCallback(async (template: Template) => {
    try {
      // Use count update
      if (!template.is_builtin) {
        await window.electronAPI.db.run(
          `UPDATE templates SET use_count = use_count + 1 WHERE id = ?`,
          [template.id]
        ).catch(() => { })
      }

      const id = generateId()
      const now = new Date().toISOString()
      const today = now.split('T')[0]

      // ✅ Content validate karo
      let contentToSave = ''
      try {
        const parsed = JSON.parse(template.content)
        if (parsed && parsed.type === 'doc') {
          contentToSave = template.content
        } else {
          throw new Error('invalid')
        }
      } catch {
        contentToSave = JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph' }]
        })
      }

      // ✅ Plain text extract
      let plainText = ''
      try {
        const parsed = JSON.parse(contentToSave)
        const extract = (nodes: any[]): string =>
          (nodes ?? []).map(n =>
            n.text ? n.text : n.content ? extract(n.content) : ''
          ).join(' ')
        plainText = extract(parsed.content ?? []).trim()
      } catch {
        plainText = template.preview ?? ''
      }

      const wordCount = plainText.split(/\s+/).filter(Boolean).length

      await window.electronAPI.db.run(`
      INSERT INTO entries
        (id, type, title, content, content_plain,
         entry_date, created_at, updated_at,
         is_deleted, is_favorite, is_pinned,
         word_count, char_count, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, NULL)
    `, [
        id,
        template.type,
        template.name,
        contentToSave,
        plainText,
        today, now, now,
        wordCount,
        plainText.length,
      ])

      // ✅ Navigate with ID
      navigate(TYPE_CONFIG[template.type].path, {
        state: { openEntryId: id },
        replace: false,
      })

    } catch (err: any) {
      console.error('Use template error:', err)
      alert('Error: ' + err?.message)
    }
  }, [navigate])

  // ── Save custom template ───────────────────────────────────────────────────
  const saveTemplate = useCallback(async () => {
    if (!formName.trim()) return
    const now = new Date().toISOString()

    try {
      if (editTemplate && !editTemplate.is_builtin) {
        // Edit mode
        await window.electronAPI.db.run(`
        UPDATE templates
        SET name=?, description=?, type=?,
            category=?, icon=?, tags=?
        WHERE id=?
      `, [
          formName.trim(), formDesc.trim(),
          formType, formCategory, formIcon,
          formTags.trim(), editTemplate.id,
        ])
      } else {
        // Create mode
        const newId = generateId()
        const baseContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: `${formIcon} ${formName}` }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Start writing here...' }],
            },
          ],
        })

        await window.electronAPI.db.run(`
        INSERT INTO templates
          (id, name, description, type, category, icon,
           content, preview, is_builtin, is_favorite,
           use_count, tags, is_active, created_at)
        VALUES (?,?,?,?,?,?,?,?,0,0,0,?,1,?)
      `, [
          newId, formName.trim(), formDesc.trim(),
          formType, formCategory, formIcon,
          baseContent,
          `${formName} template`,
          formTags.trim(), now,
        ])
      }

      resetForm()
      await loadTemplates()

    } catch (err: any) {
      console.error('Save template error:', err)
      alert('Save failed: ' + err?.message)
    }
  }, [
    formName, formDesc, formType, formCategory,
    formIcon, formTags, editTemplate, loadTemplates,
  ])

  // ── Delete template ────────────────────────────────────────────────────────
  const deleteTemplate = useCallback(async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    try {
      await window.electronAPI.db.run(
        `UPDATE templates SET is_active = 0 WHERE id = ?`, [id]
      )
      await loadTemplates()
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Delete template:', err)
    }
  }, [selected, loadTemplates])

  // ── Duplicate template ─────────────────────────────────────────────────────
  const duplicateTemplate = useCallback(async (template: Template) => {
    const now = new Date().toISOString()
    try {
      const newId = generateId()
      await window.electronAPI.db.run(`
      INSERT INTO templates
        (id, name, description, type, category, icon,
         content, preview, is_builtin, is_favorite,
         use_count, tags, is_active, created_at)
      VALUES (?,?,?,?,?,?,?,?,0,0,0,?,1,?)
    `, [
        newId,
        `${template.name} (Copy)`,
        template.description,
        template.type,
        template.category,
        template.icon,
        template.content,
        template.preview,
        template.tags ?? '',
        now,
      ])
      await loadTemplates()
      alert(`"${template.name}" copy ho gaya!`)
    } catch (err: any) {
      console.error('Duplicate error:', err)
      alert('Copy failed: ' + err?.message)
    }
  }, [loadTemplates])

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormType('diary')
    setFormCategory('custom')
    setFormIcon('📝')
    setFormContent('')
    setFormTags('')
    setShowForm(false)
    setEditTemplate(null)
    setShowEmoji(false)
  }

  const startEdit = (template: Template) => {
    setEditTemplate(template)
    setFormName(template.name)
    setFormDesc(template.description)
    setFormType(template.type)
    setFormCategory(template.category)
    setFormIcon(template.icon)
    setFormContent(template.content)
    setFormTags(template.tags)
    setShowForm(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>

      {/* ── Left: Template List ─────────────────────────────────────────── */}
      <div style={{
        width: '340px',
        minWidth: '340px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-secondary)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={17} style={{ color: 'var(--accent)' }} />
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
              }}>
                Templates
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '1px 6px',
              }}>
                {templates.length}
              </span>
            </div>

            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={13} />
              New
            </button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.7rem',
            borderRadius: '9px',
            border: '1px solid var(--border)',
            background: 'var(--bg-tertiary)',
            marginBottom: '0.5rem',
          }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="selectable"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['all', 'diary', 'note', 'idea', 'task'] as const).map(t => {
              const cfg = t !== 'all' ? TYPE_CONFIG[t] : null
              const active = filterType === t
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    flex: 1,
                    padding: '0.28rem 0',
                    borderRadius: '7px',
                    border: `1px solid ${active ? (cfg?.color ?? 'var(--accent)') : 'var(--border)'}`,
                    background: active ? `${cfg?.color ?? 'var(--accent)'}15` : 'transparent',
                    color: active ? (cfg?.color ?? 'var(--accent)') : 'var(--text-muted)',
                    fontSize: '0.65rem',
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Template List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--text-muted)', gap: '0.5rem', fontSize: '0.82rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No templates found
            </div>
          ) : (
            grouped.map(group => {
              const cfg = TYPE_CONFIG[group.type]
              return (
                <div key={group.type} style={{ marginBottom: '0.5rem' }}>
                  {/* Group header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: cfg.color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                  }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    {group.type} ({group.items.length})
                  </div>

                  {/* Template items */}
                  {group.items.map(template => {
                    const isSelected = selected?.id === template.id
                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelected(template)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          marginBottom: '3px',
                          background: isSelected
                            ? `${cfg.color}12`
                            : 'transparent',
                          border: `1px solid ${isSelected ? cfg.color + '35' : 'transparent'}`,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        {/* Icon + name + badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.2rem',
                        }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{template.icon}</span>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            color: isSelected ? cfg.color : 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {template.name}
                          </span>
                          {template.is_builtin && (
                            <span style={{
                              fontSize: '0.55rem',
                              padding: '1px 5px',
                              borderRadius: '999px',
                              background: 'rgba(99,102,241,0.12)',
                              color: 'var(--accent)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}>
                              Built-in
                            </span>
                          )}
                        </div>
                        {/* Description */}
                        <div style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingLeft: '1.5rem',
                        }}>
                          {template.description}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Preview / Detail ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>

        {selected ? (
          <>
            {/* Detail Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
              }}>
                <div style={{ flex: 1 }}>
                  {/* Type badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: TYPE_CONFIG[selected.type].bg,
                    color: TYPE_CONFIG[selected.type].color,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                  }}>
                    {TYPE_CONFIG[selected.type].icon}
                    {selected.type.charAt(0).toUpperCase() + selected.type.slice(1)}
                    {' · '}
                    {CATEGORY_LABELS[selected.category]}
                  </div>

                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.3rem',
                  }}>
                    <span>{selected.icon}</span>
                    <span>{selected.name}</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {selected.description}
                  </div>

                  {/* Tags */}
                  {selected.tags && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {selected.tags.split(',').filter(Boolean).map(tag => (
                        <span key={tag} style={{
                          fontSize: '0.65rem',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}>
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  {/* Use Template — primary */}
                  <button
                    onClick={() => useTemplate(selected)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${TYPE_CONFIG[selected.type].color}, ${TYPE_CONFIG[selected.type].color}cc)`,
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: `0 4px 12px ${TYPE_CONFIG[selected.type].color}40`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Sparkles size={14} />
                    Use Template
                    <ChevronRight size={14} />
                  </button>

                  {/* Secondary actions */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => duplicateTemplate(selected)}
                      title="Duplicate"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '0.4rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <Copy size={12} /> Copy
                    </button>

                    {!selected.is_builtin && (
                      <>
                        <button
                          onClick={() => startEdit(selected)}
                          title="Edit"
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '0.4rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <Edit2 size={12} /> Edit
                        </button>

                        <button
                          onClick={() => deleteTemplate(selected.id)}
                          title="Delete"
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '0.4rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.06)',
                            color: '#ef4444',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
            }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <FileText size={12} />
                Template Structure Preview
              </div>

              {/* Render content preview */}
              <div style={{
                padding: '1.5rem',
                borderRadius: '14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                fontFamily: "'Playfair Display', serif",
              }}>
                <ContentPreview content={selected.content} />
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem',
                flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Used', value: `${selected.use_count}×` },
                  { label: 'Type', value: selected.type.charAt(0).toUpperCase() + selected.type.slice(1) },
                  { label: 'Category', value: CATEGORY_LABELS[selected.category] },
                  { label: 'Source', value: selected.is_builtin ? '🔒 Built-in' : '⚙️ Custom' },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: '10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1px' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          // Empty state
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: 'var(--text-muted)',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '4rem' }}>📋</div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
              }}>
                Choose a Template
              </div>
              <div style={{ fontSize: '0.85rem', maxWidth: '280px', lineHeight: 1.6 }}>
                Select a template from the left to preview it, then click
                <strong style={{ color: 'var(--accent)' }}> Use Template </strong>
                to create a new entry.
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={14} />
              Create Custom Template
            </button>
          </div>
        )}
      </div>

      {/* ── Create/Edit Form Modal ───────────────────────────────────────── */}
      {showForm && (
        <>
          <div
            onClick={resetForm}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 998,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(520px, 92vw)',
            maxHeight: '88vh',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: '1.5rem',
            zIndex: 999,
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            overflowY: 'auto',
            animation: 'scaleIn 0.2s ease',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                {editTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button onClick={resetForm} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>

            {/* Icon + Name */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowEmoji(v => !v)}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {formIcon}
                </button>
                {showEmoji && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setShowEmoji(false)} />
                    <div style={{
                      position: 'absolute',
                      top: '54px',
                      left: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '0.5rem',
                      zIndex: 1001,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '4px',
                    }}>
                      {EMOJI_OPTIONS.map(e => (
                        <button
                          key={e}
                          onClick={() => { setFormIcon(e); setShowEmoji(false) }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            background: formIcon === e ? 'var(--bg-tertiary)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                autoFocus
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Template name..."
                className="selectable"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  outline: 'none',
                }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Description */}
            <input
              type="text"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Short description..."
              className="selectable"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />

            {/* Type + Category */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>Type</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['diary', 'note', 'idea', 'task'] as TemplateType[]).map(t => {
                    const cfg = TYPE_CONFIG[t]
                    const active = formType === t
                    return (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        style={{
                          flex: 1,
                          padding: '0.3rem 0.4rem',
                          borderRadius: '8px',
                          border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                          background: active ? cfg.bg : 'transparent',
                          color: active ? cfg.color : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: active ? 700 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textTransform: 'capitalize',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                Tags (comma separated)
              </div>
              <input
                type="text"
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                placeholder="daily, morning, work..."
                className="selectable"
                style={{
                  padding: '0.4rem 0.7rem',
                  borderRadius: '9px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Note about content */}
            <div style={{
              padding: '0.75rem',
              borderRadius: '10px',
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
            }}>
              💡 <strong>Tip:</strong> After creating the template, open it and edit the content in the full editor. Or duplicate a built-in template and modify it.
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={!formName.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: formName.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: formName.trim() ? 'white' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: formName.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                <Save size={13} />
                {editTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg)  } to { transform: rotate(360deg) } }
        @keyframes scaleIn {
          from { transform: translate(-50%,-50%) scale(0.93); opacity: 0 }
          to   { transform: translate(-50%,-50%) scale(1);    opacity: 1 }
        }
      `}</style>
    </div>
  )
}

// ─── Content Preview ──────────────────────────────────────────────────────────

function ContentPreview({ content }: { content: string }) {
  try {
    const doc = JSON.parse(content)
    return (
      <div>
        {doc.content?.map((node: any, i: number) => {
          if (node.type === 'heading') {
            const text = node.content?.map((c: any) => c.text).join('') ?? ''
            const level = node.attrs?.level ?? 2
            return (
              <div key={i} style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: level === 1 ? '1.3rem' : level === 2 ? '1rem' : '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: i === 0 ? 0 : '1rem',
                marginBottom: '0.3rem',
              }}>
                {text}
              </div>
            )
          }

          if (node.type === 'paragraph') {
            const text = node.content?.map((c: any) => c.text).join('') ?? ''
            if (!text.trim()) return null
            return (
              <div key={i} style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.3rem',
                lineHeight: 1.6,
              }}>
                {text}
              </div>
            )
          }

          if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
            return (
              <div key={i} style={{ marginBottom: '0.3rem' }}>
                {node.content?.slice(0, 3).map((item: any, j: number) => (
                  <div key={j} style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '0.4rem',
                    marginBottom: '2px',
                    paddingLeft: '0.5rem',
                  }}>
                    <span>{node.type === 'orderedList' ? `${j + 1}.` : '•'}</span>
                    <span>
                      {item.content?.[0]?.content?.map((c: any) => c.text).join('') || '...'}
                    </span>
                  </div>
                ))}
              </div>
            )
          }

          return null
        })}
      </div>
    )
  } catch {
    return <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Preview not available</div>
  }
}