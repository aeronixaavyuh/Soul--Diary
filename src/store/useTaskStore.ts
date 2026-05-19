import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus   = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id:           string
  title:        string
  description:  string
  status:       TaskStatus
  priority:     TaskPriority
  due_date:     string | null
  reminder_at:  string | null
  is_deleted:   number
  is_pinned:    number
  sort_order:   number
  parent_id:    string | null
  entry_id:     string | null
  created_at:   string
  updated_at:   string
  completed_at: string | null
  // computed
  subtasks?:    Task[]
}

export interface CreateTaskInput {
  title:        string
  description?: string
  priority?:    TaskPriority
  dueDate?:     string
  reminderAt?:  string
  parentId?:    string
  entryId?:     string
}

export interface UpdateTaskInput {
  title?:       string
  description?: string
  status?:      TaskStatus
  priority?:    TaskPriority
  dueDate?:     string | null
  isPinned?:    boolean
}

// ─── Store State ──────────────────────────────────────────────────────────────

interface TaskState {
  // ── Data ───────────────────────────────────────────────────────────────────
  tasks:          Task[]
  isLoading:      boolean
  isSaving:       boolean

  // ── UI Filters ─────────────────────────────────────────────────────────────
  filterStatus:   TaskStatus | 'all'
  filterPriority: TaskPriority | 'all'
  searchQuery:    string
  sortBy:         'created_at' | 'due_date' | 'priority' | 'sort_order'

  // ── Actions: Load ──────────────────────────────────────────────────────────
  loadTasks:      (status?: TaskStatus)  => Promise<void>

  // ── Actions: CRUD ──────────────────────────────────────────────────────────
  createTask:     (data: CreateTaskInput) => Promise<string | null>
  updateTask:     (id: string, data: UpdateTaskInput) => Promise<boolean>
  deleteTask:     (id: string) => Promise<boolean>
  completeTask:   (id: string) => Promise<void>
  reopenTask:     (id: string) => Promise<void>
  togglePin:      (id: string) => Promise<void>
  reorderTasks:   (taskId: string, newOrder: number) => Promise<void>

  // ── Actions: UI ────────────────────────────────────────────────────────────
  setFilterStatus:   (s: TaskStatus | 'all')    => void
  setFilterPriority: (p: TaskPriority | 'all')  => void
  setSearchQuery:    (q: string)                => void
  setSortBy:         (by: TaskState['sortBy'])  => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTaskStore = create<TaskState>((set, get) => ({

  // ── Initial state ───────────────────────────────────────────────────────────
  tasks:           [],
  isLoading:       false,
  isSaving:        false,
  filterStatus:    'all',
  filterPriority:  'all',
  searchQuery:     '',
  sortBy:          'sort_order',

  // ── Load Tasks ──────────────────────────────────────────────────────────────
  loadTasks: async (status?) => {
    set({ isLoading: true })
    try {
      const sql = status
        ? `SELECT * FROM tasks
           WHERE status = ? AND is_deleted = 0 AND parent_id IS NULL
           ORDER BY is_pinned DESC, sort_order ASC, created_at DESC`
        : `SELECT * FROM tasks
           WHERE is_deleted = 0 AND parent_id IS NULL
           ORDER BY is_pinned DESC, sort_order ASC, created_at DESC`

      const params = status ? [status] : []
      const rows   = await window.electronAPI.db.all(sql, params) as Task[]

      // Load subtasks for each task
      const tasksWithSubs = await Promise.all(
        (rows ?? []).map(async task => {
          const subtasks = await window.electronAPI.db.all(
            `SELECT * FROM tasks
             WHERE parent_id = ? AND is_deleted = 0
             ORDER BY sort_order ASC, created_at ASC`,
            [task.id]
          ) as Task[]
          return { ...task, subtasks: subtasks ?? [] }
        })
      )

      set({ tasks: tasksWithSubs, isLoading: false })
    } catch (err) {
      console.error('[TaskStore] loadTasks:', err)
      set({ isLoading: false })
    }
  },

  // ── Create Task ─────────────────────────────────────────────────────────────
  createTask: async (data: CreateTaskInput) => {
    set({ isSaving: true })
    try {
      const id        = generateId()
      const timestamp = new Date().toISOString()

      // Get max sort_order for new task position
      const maxRow = await window.electronAPI.db.get(
        'SELECT MAX(sort_order) as m FROM tasks WHERE is_deleted = 0 AND parent_id IS NULL'
      ) as { m: number } | undefined
      const sortOrder = (maxRow?.m ?? 0) + 1

      await window.electronAPI.db.run(`
        INSERT INTO tasks
          (id, title, description, status, priority,
           due_date, reminder_at, is_deleted, is_pinned,
           sort_order, parent_id, entry_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        data.title,
        data.description  ?? '',
        'todo',
        data.priority     ?? 'medium',
        data.dueDate      ?? null,
        data.reminderAt   ?? null,
        0,
        0,
        sortOrder,
        data.parentId     ?? null,
        data.entryId      ?? null,
        timestamp,
        timestamp,
      ])

      await get().loadTasks()
      return id
    } catch (err) {
      console.error('[TaskStore] createTask:', err)
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  // ── Update Task ─────────────────────────────────────────────────────────────
  updateTask: async (id: string, data: UpdateTaskInput) => {
    set({ isSaving: true })
    try {
      const sets:   string[]  = ['updated_at = ?']
      const values: unknown[] = [new Date().toISOString()]

      if (data.title       !== undefined) { sets.push('title = ?');       values.push(data.title) }
      if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description) }
      if (data.status      !== undefined) { sets.push('status = ?');      values.push(data.status) }
      if (data.priority    !== undefined) { sets.push('priority = ?');    values.push(data.priority) }
      if (data.dueDate     !== undefined) { sets.push('due_date = ?');    values.push(data.dueDate) }
      if (data.isPinned    !== undefined) { sets.push('is_pinned = ?');   values.push(data.isPinned ? 1 : 0) }

      values.push(id)

      await window.electronAPI.db.run(
        `UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`,
        values
      )

      // Patch local state
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id
            ? {
                ...t,
                ...data,
                is_pinned:  data.isPinned !== undefined ? (data.isPinned ? 1 : 0) : t.is_pinned,
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      }))

      return true
    } catch (err) {
      console.error('[TaskStore] updateTask:', err)
      return false
    } finally {
      set({ isSaving: false })
    }
  },

  // ── Delete Task (soft) ──────────────────────────────────────────────────────
  deleteTask: async (id: string) => {
    try {
      await window.electronAPI.db.run(
        'UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      )
      // Also soft-delete subtasks
      await window.electronAPI.db.run(
        'UPDATE tasks SET is_deleted = 1 WHERE parent_id = ?',
        [id]
      )
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id),
      }))
      return true
    } catch (err) {
      console.error('[TaskStore] deleteTask:', err)
      return false
    }
  },

  // ── Complete Task ───────────────────────────────────────────────────────────
  completeTask: async (id: string) => {
    const now = new Date().toISOString()
    try {
      await window.electronAPI.db.run(
        `UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      )
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id
            ? { ...t, status: 'done', completed_at: now, updated_at: now }
            : t
        ),
      }))
    } catch (err) {
      console.error('[TaskStore] completeTask:', err)
    }
  },

  // ── Reopen Task ─────────────────────────────────────────────────────────────
  reopenTask: async (id: string) => {
    const now = new Date().toISOString()
    try {
      await window.electronAPI.db.run(
        `UPDATE tasks SET status = 'todo', completed_at = NULL, updated_at = ? WHERE id = ?`,
        [now, id]
      )
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id
            ? { ...t, status: 'todo', completed_at: null, updated_at: now }
            : t
        ),
      }))
    } catch (err) {
      console.error('[TaskStore] reopenTask:', err)
    }
  },

  // ── Toggle Pin ──────────────────────────────────────────────────────────────
  togglePin: async (id: string) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const newVal = task.is_pinned ? 0 : 1
    try {
      await window.electronAPI.db.run(
        'UPDATE tasks SET is_pinned = ?, updated_at = ? WHERE id = ?',
        [newVal, new Date().toISOString(), id]
      )
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, is_pinned: newVal } : t
        ),
      }))
    } catch (err) {
      console.error('[TaskStore] togglePin:', err)
    }
  },

  // ── Reorder Tasks ───────────────────────────────────────────────────────────
  reorderTasks: async (taskId: string, newOrder: number) => {
    try {
      await window.electronAPI.db.run(
        'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?',
        [newOrder, new Date().toISOString(), taskId]
      )
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, sort_order: newOrder } : t
        ),
      }))
    } catch (err) {
      console.error('[TaskStore] reorderTasks:', err)
    }
  },

  // ── UI Actions ──────────────────────────────────────────────────────────────
  setFilterStatus:   (s) => set({ filterStatus:   s }),
  setFilterPriority: (p) => set({ filterPriority: p }),
  setSearchQuery:    (q) => set({ searchQuery:     q }),
  setSortBy:         (by)=> set({ sortBy:          by }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Filtered tasks based on current UI state */
export function useFilteredTasks() {
  return useTaskStore(state => {
    let list = [...state.tasks]

    // Filter by status
    if (state.filterStatus !== 'all') {
      list = list.filter(t => t.status === state.filterStatus)
    }

    // Filter by priority
    if (state.filterPriority !== 'all') {
      list = list.filter(t => t.priority === state.filterPriority)
    }

    // Filter by search
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      if (state.sortBy === 'priority') {
        const order: Record<TaskPriority, number> = {
          urgent: 0, high: 1, medium: 2, low: 3,
        }
        return order[a.priority] - order[b.priority]
      }
      if (state.sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (state.sortBy === 'created_at') {
        return b.created_at.localeCompare(a.created_at)
      }
      // sort_order (default)
      return a.sort_order - b.sort_order
    })

    // Pinned always first
    const pinned   = list.filter(t => t.is_pinned)
    const unpinned = list.filter(t => !t.is_pinned)
    return [...pinned, ...unpinned]
  })
}

/** Tasks grouped by status */
export function useTasksByStatus() {
  return useTaskStore(state => {
    const active = state.tasks.filter(
      t => t.status !== 'done' && t.status !== 'cancelled'
    )
    const done = state.tasks.filter(t => t.status === 'done')
    const cancelled = state.tasks.filter(t => t.status === 'cancelled')

    return { active, done, cancelled }
  })
}

/** Stats for task summary bar */
export function useTaskStats() {
  return useTaskStore(state => {
    const all       = state.tasks
    const total     = all.length
    const done      = all.filter(t => t.status === 'done').length
    const inProgress= all.filter(t => t.status === 'in_progress').length
    const todo      = all.filter(t => t.status === 'todo').length
    const overdue   = all.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      return new Date(t.due_date) < new Date()
    }).length
    const dueToday  = all.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      return t.due_date === todayStr()
    }).length

    return { total, done, inProgress, todo, overdue, dueToday }
  })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Priority config (use in UI) ──────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<TaskPriority, {
  label: string; color: string; bg: string; icon: string
}> = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '🔴' },
  high:   { label: 'High',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: '🟠' },
  medium: { label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.1)',   icon: '🟡' },
  low:    { label: 'Low',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: '🟢' },
}

export const STATUS_CONFIG: Record<TaskStatus, {
  label: string; color: string; bg: string
}> = {
  todo:        { label: 'To Do',       color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  in_progress: { label: 'In Progress', color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  done:        { label: 'Done',        color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  cancelled:   { label: 'Cancelled',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}