import { useEffect, useState, useCallback, useRef } from 'react'
import {
  useTaskStore, useFilteredTasks, useTaskStats,
  Task, TaskStatus, TaskPriority,
  PRIORITY_CONFIG, STATUS_CONFIG,
} from '@store/useTaskStore'
import {
  Plus, CheckSquare, Check,
  Clock, Trash2, Pin, Search,
  LayoutGrid, List, Filter, X,
  ChevronDown, ChevronRight, Loader2,
  Calendar, Edit2,
} from 'lucide-react'

type ViewMode = 'list' | 'kanban'

// ─── TasksPage ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const {
    tasks, isLoading,
    filterStatus, filterPriority, searchQuery,
    loadTasks, createTask, updateTask, deleteTask,
    completeTask, reopenTask, togglePin,
    setFilterStatus, setFilterPriority,
    setSearchQuery,
  } = useTaskStore()

  const filteredTasks = useFilteredTasks()
  const stats         = useTaskStats()

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode,       setViewMode]       = useState<ViewMode>('list')
  const [showNewForm,    setShowNewForm]    = useState(false)
  const [newTitle,       setNewTitle]       = useState('')
  const [newPriority,    setNewPriority]    = useState<TaskPriority>('medium')
  const [newDueDate,     setNewDueDate]     = useState('')
  const [editingTask,    setEditingTask]    = useState<string | null>(null)
  const [editTitle,      setEditTitle]      = useState('')
  const [expandedTask,   setExpandedTask]   = useState<string | null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [newSubTitle,    setNewSubTitle]    = useState('')
  const [addingSubTo,    setAddingSubTo]    = useState<string | null>(null)

  const newTitleRef = useRef<HTMLInputElement>(null)
  const editRef     = useRef<HTMLInputElement>(null)

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => { loadTasks() }, [])

  useEffect(() => {
    if (showNewForm) setTimeout(() => newTitleRef.current?.focus(), 50)
  }, [showNewForm])

  useEffect(() => {
    if (editingTask) setTimeout(() => editRef.current?.focus(), 50)
  }, [editingTask])

  // ── Create task ────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return
    await createTask({
      title:    newTitle.trim(),
      priority: newPriority,
      dueDate:  newDueDate || undefined,
    })
    setNewTitle('')
    setNewDueDate('')
    setNewPriority('medium')
    setShowNewForm(false)
  }, [newTitle, newPriority, newDueDate, createTask])

  // ── Create subtask ─────────────────────────────────────────────────────────
  const handleCreateSubtask = useCallback(async (parentId: string) => {
    if (!newSubTitle.trim()) return
    await createTask({ title: newSubTitle.trim(), parentId })
    setNewSubTitle('')
    setAddingSubTo(null)
  }, [newSubTitle, createTask])

  // ── Save edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = useCallback(async (id: string) => {
    if (!editTitle.trim()) return
    await updateTask(id, { title: editTitle.trim() })
    setEditingTask(null)
    setEditTitle('')
  }, [editTitle, updateTask])

  // ── Toggle complete ────────────────────────────────────────────────────────
  const handleToggleComplete = useCallback(async (task: Task) => {
    if (task.status === 'done') await reopenTask(task.id)
    else                        await completeTask(task.id)
  }, [completeTask, reopenTask])

  // ── Format due date ────────────────────────────────────────────────────────
  const formatDue = (due: string | null) => {
    if (!due) return null
    try {
      const d    = new Date(due)
      const now  = new Date()
      const diff = d.getTime() - now.getTime()
      const days = Math.ceil(diff / 86400000)
      if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: '#ef4444' }
      if (days === 0) return { label: 'Due today',    color: '#f97316' }
      if (days === 1) return { label: 'Due tomorrow', color: '#eab308' }
      if (days < 7)   return { label: `${days}d left`, color: '#22c55e' }
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        color: 'var(--text-muted)',
      }
    } catch { return null }
  }

  // ── Kanban columns ─────────────────────────────────────────────────────────
  const kanbanCols: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo',        label: 'To Do',       color: '#6b7280' },
    { status: 'in_progress', label: 'In Progress', color: '#6366f1' },
    { status: 'done',        label: 'Done',        color: '#22c55e' },
    { status: 'cancelled',   label: 'Cancelled',   color: '#94a3b8' },
  ]

  const completionPct = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      overflow:      'hidden',
      background:    'var(--bg-primary)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '1rem 1.5rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        background:   'var(--bg-secondary)',
        flexShrink:   0,
      }}>
        {/* Title row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '0.75rem',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckSquare size={18} style={{ color: '#34d399' }} />
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize:   '1.1rem',
              color:      'var(--text-primary)',
            }}>
              Tasks
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>

            {/* Search */}
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         '0.4rem',
              padding:     '0.35rem 0.6rem',
              borderRadius:'8px',
              background:  'var(--bg-tertiary)',
              border:      '1px solid var(--border)',
            }}>
              <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="selectable"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize:   '0.78rem', color: 'var(--text-primary)',
                  fontFamily: 'inherit', width: '120px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterMenu(v => !v)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '4px',
                  padding:     '0.35rem 0.7rem',
                  borderRadius:'8px',
                  border:      '1px solid var(--border)',
                  background:  showFilterMenu ? 'var(--bg-tertiary)' : 'transparent',
                  color:       filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize:    '0.78rem',
                  cursor:      'pointer',
                  fontFamily:  'inherit',
                }}
              >
                <Filter size={13} />
                Filter
                {(filterStatus !== 'all' || filterPriority !== 'all') && (
                  <span style={{
                    width:        '6px',
                    height:       '6px',
                    borderRadius: '50%',
                    background:   'var(--accent)',
                  }} />
                )}
              </button>

              {showFilterMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div style={{
                    position:     'absolute',
                    top:          '100%',
                    right:        0,
                    marginTop:    '4px',
                    background:   'var(--bg-card)',
                    border:       '1px solid var(--border)',
                    borderRadius: '12px',
                    padding:      '0.75rem',
                    zIndex:       100,
                    boxShadow:    '0 8px 32px rgba(0,0,0,0.2)',
                    minWidth:     '200px',
                  }}>
                    {/* Status */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{
                        fontSize:      '0.65rem',
                        fontWeight:    600,
                        color:         'var(--text-muted)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom:  '0.4rem',
                      }}>
                        Status
                      </div>
                      {(['all','todo','in_progress','done','cancelled'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => { setFilterStatus(s); setShowFilterMenu(false) }}
                          style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         '0.5rem',
                            width:       '100%',
                            padding:     '0.35rem 0.5rem',
                            borderRadius:'7px',
                            border:      'none',
                            background:  filterStatus === s ? 'var(--bg-tertiary)' : 'transparent',
                            color:       filterStatus === s ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize:    '0.8rem',
                            cursor:      'pointer',
                            fontFamily:  'inherit',
                            textAlign:   'left',
                          }}
                        >
                          {s !== 'all' && (
                            <span style={{
                              width:        '8px',
                              height:       '8px',
                              borderRadius: '50%',
                              background:   STATUS_CONFIG[s as TaskStatus].color,
                              flexShrink:   0,
                            }} />
                          )}
                          {s === 'all' ? 'All Statuses' : STATUS_CONFIG[s as TaskStatus].label}
                        </button>
                      ))}
                    </div>

                    {/* Priority */}
                    <div>
                      <div style={{
                        fontSize:      '0.65rem',
                        fontWeight:    600,
                        color:         'var(--text-muted)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom:  '0.4rem',
                      }}>
                        Priority
                      </div>
                      {(['all','urgent','high','medium','low'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => { setFilterPriority(p); setShowFilterMenu(false) }}
                          style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         '0.5rem',
                            width:       '100%',
                            padding:     '0.35rem 0.5rem',
                            borderRadius:'7px',
                            border:      'none',
                            background:  filterPriority === p ? 'var(--bg-tertiary)' : 'transparent',
                            color:       filterPriority === p ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize:    '0.8rem',
                            cursor:      'pointer',
                            fontFamily:  'inherit',
                            textAlign:   'left',
                          }}
                        >
                          {p !== 'all' && (
                            <span style={{ fontSize: '0.8rem' }}>
                              {PRIORITY_CONFIG[p as TaskPriority].icon}
                            </span>
                          )}
                          {p === 'all' ? 'All Priorities' : PRIORITY_CONFIG[p as TaskPriority].label}
                        </button>
                      ))}
                    </div>

                    {(filterStatus !== 'all' || filterPriority !== 'all') && (
                      <button
                        onClick={() => {
                          setFilterStatus('all')
                          setFilterPriority('all')
                          setShowFilterMenu(false)
                        }}
                        style={{
                          marginTop:    '0.5rem',
                          width:        '100%',
                          padding:      '0.35rem',
                          borderRadius: '7px',
                          border:       '1px solid var(--border)',
                          background:   'transparent',
                          color:        '#ef4444',
                          fontSize:     '0.75rem',
                          cursor:       'pointer',
                          fontFamily:   'inherit',
                        }}
                      >
                        ✕ Reset Filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* View toggle */}
            <div style={{
              display:     'flex',
              background:  'var(--bg-tertiary)',
              borderRadius:'8px',
              border:      '1px solid var(--border)',
              overflow:    'hidden',
            }}>
              {(['list','kanban'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  title={v === 'list' ? 'List view' : 'Kanban board'}
                  style={{
                    width:          '30px',
                    height:         '28px',
                    border:         'none',
                    cursor:         'pointer',
                    background:     viewMode === v ? 'var(--accent)' : 'transparent',
                    color:          viewMode === v ? 'white' : 'var(--text-muted)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    transition:     'all 0.15s',
                  }}
                >
                  {v === 'list' ? <List size={13} /> : <LayoutGrid size={13} />}
                </button>
              ))}
            </div>

            {/* New task */}
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '4px',
                padding:     '0.35rem 0.75rem',
                borderRadius:'8px',
                border:      'none',
                cursor:      'pointer',
                background:  'linear-gradient(135deg, #34d399, #10b981)',
                color:       'white',
                fontSize:    '0.78rem',
                fontWeight:  600,
                fontFamily:  'inherit',
                boxShadow:   '0 2px 8px rgba(52,211,153,0.35)',
              }}
            >
              <Plus size={13} />
              New Task
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: stats.total,       color: 'var(--text-secondary)' },
            { label: 'To Do',       value: stats.todo,        color: '#6b7280'               },
            { label: 'In Progress', value: stats.inProgress,  color: '#6366f1'               },
            { label: 'Done',        value: stats.done,        color: '#22c55e'               },
            { label: 'Overdue',     value: stats.overdue,     color: '#ef4444'               },
            { label: 'Due Today',   value: stats.dueToday,    color: '#f97316'               },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
              <span style={{ color: s.color, fontWeight: 700, fontSize: '0.85rem' }}>{s.value}</span>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}

          {stats.total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
              <div style={{
                width:        '80px',
                height:       '4px',
                borderRadius: '2px',
                background:   'var(--bg-tertiary)',
                overflow:     'hidden',
              }}>
                <div style={{
                  width:        `${completionPct}%`,
                  height:       '100%',
                  background:   'linear-gradient(90deg, #34d399, #10b981)',
                  borderRadius: '2px',
                  transition:   'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {completionPct}% done
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── New Task Form ───────────────────────────────────────────────── */}
      {showNewForm && (
        <div style={{
          padding:      '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background:   'var(--bg-secondary)',
          flexShrink:   0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <input
              ref={newTitleRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleCreate()
                if (e.key === 'Escape') { setShowNewForm(false); setNewTitle('') }
              }}
              placeholder="Task title... (Enter to create)"
              className="selectable"
              style={{
                flex:         1,
                minWidth:     '200px',
                padding:      '0.45rem 0.75rem',
                borderRadius: '8px',
                border:       '1px solid var(--accent)',
                background:   'var(--bg-tertiary)',
                color:        'var(--text-primary)',
                fontSize:     '0.875rem',
                fontFamily:   'inherit',
                outline:      'none',
                boxShadow:    '0 0 0 3px rgba(99,102,241,0.12)',
              }}
            />

            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TaskPriority)}
              style={{
                padding:      '0.45rem 0.6rem',
                borderRadius: '8px',
                border:       '1px solid var(--border)',
                background:   'var(--bg-tertiary)',
                color:        'var(--text-primary)',
                fontSize:     '0.78rem',
                fontFamily:   'inherit',
                cursor:       'pointer',
                outline:      'none',
              }}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>

            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              style={{
                padding:      '0.45rem 0.6rem',
                borderRadius: '8px',
                border:       '1px solid var(--border)',
                background:   'var(--bg-tertiary)',
                color:        'var(--text-primary)',
                fontSize:     '0.78rem',
                fontFamily:   'inherit',
                cursor:       'pointer',
                outline:      'none',
              }}
            />

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                style={{
                  padding:      '0.45rem 1rem',
                  borderRadius: '8px',
                  border:       'none',
                  background:   newTitle.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color:        newTitle.trim() ? 'white' : 'var(--text-muted)',
                  fontSize:     '0.78rem',
                  fontWeight:   600,
                  cursor:       newTitle.trim() ? 'pointer' : 'not-allowed',
                  fontFamily:   'inherit',
                }}
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewTitle('') }}
                style={{
                  padding:      '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'var(--text-muted)',
                  fontSize:     '0.78rem',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>

        {isLoading ? (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            height:         '200px',
            gap:            '0.5rem',
            color:          'var(--text-muted)',
          }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading tasks...
          </div>

        ) : viewMode === 'kanban' ? (
          // ── KANBAN ───────────────────────────────────────────────────────
          <div style={{
            display:       'flex',
            gap:           '1rem',
            height:        '100%',
            overflowX:     'auto',
            paddingBottom: '1rem',
          }}>
            {kanbanCols.map(col => {
              const colTasks = tasks.filter(t => t.status === col.status && !t.is_deleted)
              return (
                <div
                  key={col.status}
                  style={{
                    minWidth:      '260px',
                    maxWidth:      '280px',
                    display:       'flex',
                    flexDirection: 'column',
                    background:    'var(--bg-secondary)',
                    borderRadius:  '14px',
                    border:        '1px solid var(--border)',
                    overflow:      'hidden',
                    flexShrink:    0,
                  }}
                >
                  <div style={{
                    padding:        '0.75rem 1rem',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    borderBottom:   '1px solid var(--border)',
                    borderTop:      `3px solid ${col.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width:        '8px',
                        height:       '8px',
                        borderRadius: '50%',
                        background:   col.color,
                      }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {col.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize:     '0.7rem',
                      color:        'var(--text-muted)',
                      background:   'var(--bg-tertiary)',
                      borderRadius: '999px',
                      padding:      '1px 7px',
                    }}>
                      {colTasks.length}
                    </span>
                  </div>

                  <div style={{
                    flex:          1,
                    overflowY:     'auto',
                    padding:       '0.5rem',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           '6px',
                  }}>
                    {colTasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onComplete={() => handleToggleComplete(task)}
                        onDelete={() => deleteTask(task.id)}
                        formatDue={formatDue}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding:   '2rem 1rem',
                        color:     'var(--text-muted)',
                        fontSize:  '0.78rem',
                      }}>
                        No tasks here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        ) : (
          // ── LIST VIEW ─────────────────────────────────────────────────────
          <div>
            {filteredTasks.length === 0 ? (
              <div style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '4rem 2rem',
                gap:            '1rem',
                color:          'var(--text-muted)',
              }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'No matching tasks'
                    : 'All clear! No tasks yet.'}
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create a task to get started'}
                </div>
                {!(searchQuery || filterStatus !== 'all' || filterPriority !== 'all') && (
                  <button
                    onClick={() => setShowNewForm(true)}
                    style={{
                      marginTop:    '0.25rem',
                      padding:      '0.5rem 1.25rem',
                      borderRadius: '10px',
                      border:       'none',
                      cursor:       'pointer',
                      background:   'linear-gradient(135deg, #34d399, #10b981)',
                      color:        'white',
                      fontSize:     '0.875rem',
                      fontWeight:   600,
                      fontFamily:   'inherit',
                    }}
                  >
                    + Create First Task
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredTasks.map(task => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    isExpanded={expandedTask === task.id}
                    isEditing={editingTask === task.id}
                    editTitle={editTitle}
                    addingSubTo={addingSubTo}
                    newSubTitle={newSubTitle}
                    onToggleExpand={() =>
                      setExpandedTask(v => v === task.id ? null : task.id)
                    }
                    onComplete={() => handleToggleComplete(task)}
                    onStartEdit={() => {
                      setEditingTask(task.id)
                      setEditTitle(task.title)
                    }}
                    onSaveEdit={() => handleSaveEdit(task.id)}
                    onCancelEdit={() => { setEditingTask(null); setEditTitle('') }}
                    onEditTitleChange={setEditTitle}
                    onDelete={() => deleteTask(task.id)}
                    onPin={() => togglePin(task.id)}
                    onStatusChange={(s) => updateTask(task.id, { status: s })}
                    onPriorityChange={(p) => updateTask(task.id, { priority: p })}
                    onAddSubtask={() => {
                      setAddingSubTo(task.id)
                      setExpandedTask(task.id)
                    }}
                    onCreateSubtask={() => handleCreateSubtask(task.id)}
                    onSubTitleChange={setNewSubTitle}
                    onCancelSubtask={() => { setAddingSubTo(null); setNewSubTitle('') }}
                    onCompleteSubtask={(sub) => handleToggleComplete(sub)}
                    onDeleteSubtask={(subId) => deleteTask(subId)}
                    formatDue={formatDue}
                    editRef={editingTask === task.id ? editRef : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  task, onComplete, onDelete, formatDue
}: {
  task:       Task
  onComplete: () => void
  onDelete:   () => void
  formatDue:  (d: string | null) => { label: string; color: string } | null
}) {
  const due      = formatDue(task.due_date)
  const priority = PRIORITY_CONFIG[task.priority]
  const isDone   = task.status === 'done'

  return (
    <div
      style={{
        padding:      '0.65rem 0.75rem',
        borderRadius: '10px',
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        transition:   'box-shadow 0.15s',
      }}
      onMouseEnter={e =>
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px var(--shadow)'
      }
      onMouseLeave={e =>
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
        <button
          onClick={onComplete}
          style={{
            width:          '16px',
            height:         '16px',
            borderRadius:   '50%',
            border:         `2px solid ${isDone ? '#22c55e' : 'var(--border)'}`,
            background:     isDone ? '#22c55e' : 'transparent',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            marginTop:      '2px',
            transition:     'all 0.15s',
          }}
        >
          {isDone && <Check size={9} color="white" strokeWidth={3} />}
        </button>

        <span style={{
          fontSize:        '0.82rem',
          color:           isDone ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration:  isDone ? 'line-through' : 'none',
          lineHeight:      1.4,
          flex:            1,
          overflow:        'hidden',
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {task.title}
        </span>
      </div>

      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginTop:      '0.5rem',
        flexWrap:       'wrap',
        gap:            '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize:     '0.65rem',
            padding:      '1px 6px',
            borderRadius: '999px',
            background:   priority.bg,
            color:        priority.color,
            fontWeight:   500,
          }}>
            {priority.icon} {priority.label}
          </span>
          {due && (
            <span style={{
              fontSize:   '0.65rem',
              color:      due.color,
              display:    'flex',
              alignItems: 'center',
              gap:        '2px',
            }}>
              <Clock size={9} />
              {due.label}
            </span>
          )}
        </div>

        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--text-muted)',
            display:    'flex',
            padding:    '2px',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── TaskListItem ─────────────────────────────────────────────────────────────

function TaskListItem({
  task, isExpanded, isEditing, editTitle,
  addingSubTo, newSubTitle,
  onToggleExpand, onComplete, onStartEdit, onSaveEdit,
  onCancelEdit, onEditTitleChange, onDelete, onPin,
  onStatusChange, onPriorityChange, onAddSubtask,
  onCreateSubtask, onSubTitleChange, onCancelSubtask,
  onCompleteSubtask, onDeleteSubtask, formatDue, editRef,
}: {
  task:              Task
  isExpanded:        boolean
  isEditing:         boolean
  editTitle:         string
  addingSubTo:       string | null
  newSubTitle:       string
  onToggleExpand:    () => void
  onComplete:        () => void
  onStartEdit:       () => void
  onSaveEdit:        () => void
  onCancelEdit:      () => void
  onEditTitleChange: (v: string) => void
  onDelete:          () => void
  onPin:             () => void
  onStatusChange:    (s: TaskStatus) => void
  onPriorityChange:  (p: TaskPriority) => void
  onAddSubtask:      () => void
  onCreateSubtask:   () => void
  onSubTitleChange:  (v: string) => void
  onCancelSubtask:   () => void
  onCompleteSubtask: (sub: Task) => void
  onDeleteSubtask:   (id: string) => void
  formatDue:         (d: string | null) => { label: string; color: string } | null
  editRef?:          React.RefObject<HTMLInputElement>
}) {
  const isDone      = task.status === 'done'
  const due         = formatDue(task.due_date)
  const priority    = PRIORITY_CONFIG[task.priority]
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0

  return (
    <div
      style={{
        borderRadius: '10px',
        border:       '1px solid var(--border)',
        background:   'var(--bg-secondary)',
        overflow:     'hidden',
        transition:   'border-color 0.15s',
      }}
      onMouseEnter={e =>
        (e.currentTarget as HTMLElement).style.borderColor = isDone
          ? 'var(--border)' : 'rgba(99,102,241,0.3)'
      }
      onMouseLeave={e =>
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }
    >
      {/* Main row */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '0.5rem',
        padding:    '0.6rem 0.75rem',
      }}>
        {/* Expand */}
        <button
          onClick={onToggleExpand}
          style={{
            width:          '16px',
            height:         '16px',
            border:         'none',
            background:     'transparent',
            cursor:         hasSubtasks ? 'pointer' : 'default',
            color:          'var(--text-muted)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            opacity:        hasSubtasks ? 1 : 0,
          }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Checkbox */}
        <button
          onClick={onComplete}
          title={isDone ? 'Reopen task' : 'Complete task'}
          style={{
            width:          '18px',
            height:         '18px',
            borderRadius:   '50%',
            border:         `2px solid ${isDone ? '#22c55e' : priority.color}`,
            background:     isDone ? '#22c55e' : 'transparent',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            transition:     'all 0.15s',
          }}
        >
          {isDone && <Check size={10} color="white" strokeWidth={3} />}
        </button>

        {/* Title / Edit */}
        {isEditing ? (
          <input
            ref={editRef}
            type="text"
            value={editTitle}
            onChange={e => onEditTitleChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="selectable"
            style={{
              flex:         1,
              padding:      '2px 8px',
              borderRadius: '6px',
              border:       '1px solid var(--accent)',
              background:   'var(--bg-tertiary)',
              color:        'var(--text-primary)',
              fontSize:     '0.875rem',
              fontFamily:   'inherit',
              outline:      'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={onStartEdit}
            style={{
              flex:             1,
              fontSize:         '0.875rem',
              color:            isDone ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration:   isDone ? 'line-through' : 'none',
              cursor:           'default',
              userSelect:       'text',
              WebkitUserSelect: 'text',
            }}
          >
            {task.title}
          </span>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span
            title="Click to change priority"
            onClick={() => {
              const order: TaskPriority[] = ['low','medium','high','urgent']
              const idx = order.indexOf(task.priority)
              onPriorityChange(order[(idx + 1) % order.length])
            }}
            style={{
              fontSize:     '0.65rem',
              padding:      '2px 7px',
              borderRadius: '999px',
              background:   priority.bg,
              color:        priority.color,
              fontWeight:   500,
              cursor:       'pointer',
            }}
          >
            {priority.icon}
          </span>

          {due && (
            <span style={{
              fontSize:   '0.68rem',
              color:      due.color,
              display:    'flex',
              alignItems: 'center',
              gap:        '2px',
              fontWeight: 500,
            }}>
              <Calendar size={9} />
              {due.label}
            </span>
          )}

          {task.is_pinned && <Pin size={11} style={{ color: '#fbbf24' }} />}
        </div>

        {/* Actions */}
        {isEditing ? (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={onSaveEdit}
              style={{
                padding:      '3px 8px',
                borderRadius: '6px',
                border:       'none',
                background:   'var(--accent)',
                color:        'white',
                fontSize:     '0.72rem',
                cursor:       'pointer',
                fontFamily:   'inherit',
                fontWeight:   600,
              }}
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                padding:      '3px 8px',
                borderRadius: '6px',
                border:       '1px solid var(--border)',
                background:   'transparent',
                color:        'var(--text-muted)',
                fontSize:     '0.72rem',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[
              { icon: <Edit2  size={12} />, onClick: onStartEdit,  title: 'Edit',     danger: false },
              { icon: <Pin    size={12} />, onClick: onPin,         title: task.is_pinned ? 'Unpin' : 'Pin', danger: false },
              { icon: <Plus   size={12} />, onClick: onAddSubtask,  title: 'Add subtask', danger: false },
              { icon: <Trash2 size={12} />, onClick: onDelete,      title: 'Delete',   danger: true  },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                title={btn.title}
                style={{
                  width:          '24px',
                  height:         '24px',
                  borderRadius:   '6px',
                  border:         'none',
                  background:     'transparent',
                  color:          btn.danger ? 'var(--text-muted)'
                    : i === 1 && task.is_pinned ? '#fbbf24'
                    : 'var(--text-muted)',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = btn.danger
                    ? 'rgba(239,68,68,0.1)' : 'var(--bg-tertiary)'
                  ;(e.currentTarget as HTMLElement).style.color = btn.danger
                    ? '#ef4444' : 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = btn.danger
                    ? 'var(--text-muted)'
                    : i === 1 && task.is_pinned ? '#fbbf24'
                    : 'var(--text-muted)'
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subtasks */}
      {isExpanded && (
        <div style={{
          paddingLeft:   '2.5rem',
          paddingRight:  '0.75rem',
          paddingBottom: '0.5rem',
          borderTop:     '1px solid var(--border)',
          background:    'var(--bg-tertiary)',
        }}>
          {(task.subtasks ?? []).map(sub => (
            <div
              key={sub.id}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '0.4rem',
                padding:      '0.35rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => onCompleteSubtask(sub)}
                style={{
                  width:          '14px',
                  height:         '14px',
                  borderRadius:   '50%',
                  border:         `2px solid ${sub.status === 'done' ? '#22c55e' : 'var(--border)'}`,
                  background:     sub.status === 'done' ? '#22c55e' : 'transparent',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                {sub.status === 'done' && <Check size={8} color="white" strokeWidth={3} />}
              </button>

              <span style={{
                flex:           1,
                fontSize:       '0.8rem',
                color:          sub.status === 'done' ? 'var(--text-muted)' : 'var(--text-secondary)',
                textDecoration: sub.status === 'done' ? 'line-through' : 'none',
              }}>
                {sub.title}
              </span>

              <button
                onClick={() => onDeleteSubtask(sub.id)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {addingSubTo === task.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '0.4rem' }}>
              <div style={{
                width:        '14px',
                height:       '14px',
                borderRadius: '50%',
                border:       '2px solid var(--border)',
                flexShrink:   0,
              }} />
              <input
                autoFocus
                type="text"
                value={newSubTitle}
                onChange={e => onSubTitleChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  onCreateSubtask()
                  if (e.key === 'Escape') onCancelSubtask()
                }}
                placeholder="Subtask title..."
                className="selectable"
                style={{
                  flex:         1,
                  padding:      '2px 8px',
                  borderRadius: '6px',
                  border:       '1px solid var(--accent)',
                  background:   'var(--bg-card)',
                  color:        'var(--text-primary)',
                  fontSize:     '0.78rem',
                  fontFamily:   'inherit',
                  outline:      'none',
                }}
              />
              <button
                onClick={onCreateSubtask}
                style={{
                  padding:      '2px 8px',
                  borderRadius: '6px',
                  border:       'none',
                  background:   'var(--accent)',
                  color:        'white',
                  fontSize:     '0.72rem',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                Add
              </button>
              <button
                onClick={onCancelSubtask}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAddSubtask}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '4px',
                marginTop:  '0.35rem',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      'var(--text-muted)',
                fontSize:   '0.75rem',
                fontFamily: 'inherit',
                padding:    '2px 0',
              }}
            >
              <Plus size={11} />
              Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  )
}