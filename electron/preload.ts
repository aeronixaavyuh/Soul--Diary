import { contextBridge, ipcRenderer } from 'electron'

// ─────────────────────────────────────────────────────────────────────────────
//  Soul Diary — Secure IPC Bridge
//  React app (renderer) ko Node.js APIs directly access nahi milti.
//  Yeh preload bridge hai — sirf allowed channels expose karta hai.
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', {

  // ══════════════════════════════════════════════════════════════════════════
  //  WINDOW CONTROLS  (Custom titlebar)
  // ══════════════════════════════════════════════════════════════════════════

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  THEME
  // ══════════════════════════════════════════════════════════════════════════

  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: string) => ipcRenderer.send('theme:set', theme),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  APP INFO
  // ══════════════════════════════════════════════════════════════════════════

  app: {
    version: () => ipcRenderer.invoke('app:version'),
    dataPath: () => ipcRenderer.invoke('app:path'),
    dbPath: () => ipcRenderer.invoke('app:dbPath'),
    lock: () => ipcRenderer.send('app:lock'),
    changeStorage: (path: string) => ipcRenderer.invoke('app:changeStorage', path),
    init: () => ipcRenderer.invoke('app:init'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  DIALOGS
  // ══════════════════════════════════════════════════════════════════════════

  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    saveFile: (options: Record<string, unknown>) => ipcRenderer.invoke('dialog:saveFile', options),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  DATABASE  (Raw SQL access — used by entry/task stores)
  // ══════════════════════════════════════════════════════════════════════════

  db: {
    run: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:run', sql, params ?? []),

    get: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:get', sql, params ?? []),

    all: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:all', sql, params ?? []),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  FILE SYSTEM
  // ══════════════════════════════════════════════════════════════════════════

  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, data: string) => ipcRenderer.invoke('fs:writeFile', path, data),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  },

   // ══════════════════════════════════════════════════════════════════════════
  //  PDF EMPORT
  // ══════════════════════════════════════════════════════════════════════════

  pdf: {
    export: (html: string, opts?: object) =>
      ipcRenderer.invoke('pdf:export', html, opts ?? {}),
    print: (html: string) =>
      ipcRenderer.invoke('pdf:print', html),
    open: (filePath: string) =>
      ipcRenderer.invoke('pdf:open', filePath),
    getExportsPath: () =>
      ipcRenderer.invoke('pdf:getExportsPath'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  BACKUP
  // ══════════════════════════════════════════════════════════════════════════

  backup: {
    export: (password: string) => ipcRenderer.invoke('backup:export', password),
    import: (password: string) => ipcRenderer.invoke('backup:import', password),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PIN / SECURITY
  // ══════════════════════════════════════════════════════════════════════════

  pin: {
    set: (pin: string) => ipcRenderer.invoke('pin:set', pin),
    verify: (pin: string) => ipcRenderer.invoke('pin:verify', pin),
    remove: () => ipcRenderer.invoke('pin:remove'),
    hasPin: () => ipcRenderer.invoke('pin:hasPin'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ENCRYPTION
  // ══════════════════════════════════════════════════════════════════════════

  encryption: {
    init: (password?: string) => ipcRenderer.invoke('encryption:init', password),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SETTINGS  (DB-backed key-value)
  // ══════════════════════════════════════════════════════════════════════════

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, val: string) => ipcRenderer.invoke('settings:set', key, val),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SEARCH
  // ══════════════════════════════════════════════════════════════════════════

  search: {
    query: (q: string, type?: string) => ipcRenderer.invoke('search:query', q, type),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════════════════════

  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  WORD PREDICTIONS  (Smart typing)
  // ══════════════════════════════════════════════════════════════════════════

  predict: {
    add: (phrase: string, context: string) => ipcRenderer.invoke('predict:add', phrase, context),
    get: (prefix: string, context: string) => ipcRenderer.invoke('predict:get', prefix, context),
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  //  Main → Renderer events (app lock, auto-save trigger, etc.)
  // ══════════════════════════════════════════════════════════════════════════

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    // Whitelist of allowed channels
    const allowed = [
      'window:maximized',
      'window:unmaximized',
      'app:beforeClose',
      'app:locked',
      'ai:pullProgress',
      'app:autoSave',
      'app:lowBattery',
    ]
    if (!allowed.includes(channel)) {
      console.warn(`[Preload] Blocked unknown channel: ${channel}`)
      return
    }
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args)
    }
    ipcRenderer.on(channel, handler)
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeAllListeners(channel)
  },

  once: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args))
  },
})

// ─────────────────────────────────────────────────────────────────────────────
//  TypeScript global type — auto-available as window.electronAPI everywhere
// ─────────────────────────────────────────────────────────────────────────────

export type ElectronAPI = {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
  }
  theme: {
    get: () => Promise<boolean>
    set: (theme: string) => void
  }
  app: {
    version: () => Promise<string>
    dataPath: () => Promise<string>
    dbPath: () => Promise<string>
    lock: () => void
    changeStorage: (path: string) => Promise<unknown>
    init: () => Promise<{ success: boolean; version: string; userDataPath: string; dbPath: string }>  // ✅ यह add करो
  }
  dialog: {
    openFolder: () => Promise<string | null>
    saveFile: (options: Record<string, unknown>) => Promise<string | null>
  }
  db: {
    run: (sql: string, params?: unknown[]) => Promise<unknown>
    get: (sql: string, params?: unknown[]) => Promise<unknown>
    all: (sql: string, params?: unknown[]) => Promise<unknown[]>
  }
  ai: {
    isAvailable: () => Promise<{ success: boolean; available: boolean }>
    models: () => Promise<{ success: boolean; data: Array<{ name: string; size: number }> }>
    getModel: () => Promise<{ success: boolean; model: string }>
    setModel: (name: string) => Promise<{ success: boolean }>
    pullModel: (name: string) => Promise<{ success: boolean; error?: string }>
    query: (prompt: string, ctx?: string) => Promise<{ success: boolean; data?: string }>
    detectMood: (text: string) => Promise<{ success: boolean; data?: { mood: string; score: number; emoji: string; confidence: number; explanation: string } }>
    summarize: (text: string, style?: string) => Promise<{ success: boolean; data?: string }>
    autoTitle: (text: string) => Promise<{ success: boolean; data?: string }>
    suggestions: (text: string, type?: string) => Promise<{ success: boolean; data?: { suggestions: string[]; type: string } }>
    predictWords: (text: string, count?: number) => Promise<{ success: boolean; data?: string[] }>
    expandIdea: (idea: string) => Promise<{ success: boolean; data?: { expanded: string; keyPoints: string[]; nextSteps: string[] } }>
    dailyPrompts: (ctx?: object) => Promise<{ success: boolean; data?: string[] }>
    analyzeStyle: (text: string) => Promise<{ success: boolean; data?: unknown }>
    extractGratitude: (text: string) => Promise<{ success: boolean; data?: string[] }>
    batchMood: (entries: unknown[]) => Promise<{ success: boolean; data?: unknown[] }>
  }
  fs: {
    readFile: (path: string) => Promise<string | null>
    writeFile: (path: string, data: string) => Promise<{ success: boolean }>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string) => Promise<{ success: boolean }>
  }
  backup: {
    export: (password: string) => Promise<{ success: boolean; path?: string; error?: string }>
    import: (password: string) => Promise<{ success: boolean; error?: string }>
  }
  pin: {
    set: (pin: string) => Promise<{ success: boolean; error?: string }>
    verify: (pin: string) => Promise<{ success: boolean; error?: string }>
    remove: () => Promise<{ success: boolean }>
    hasPin: () => Promise<boolean>
  }
  encryption: {
    init: (password?: string) => Promise<{ success: boolean }>
  }
  settings: {
    get: (key: string) => Promise<{ success: boolean; value: string | null }>
    set: (key: string, val: string) => Promise<{ success: boolean }>
    getAll: () => Promise<{ success: boolean; settings: Record<string, string> }>
  }
  search: {
    query: (q: string, type?: string) => Promise<{ success: boolean; results: unknown[] }>
  }
  stats: {
    get: () => Promise<{ success: boolean; stats: unknown }>
  }
  predict: {
    add: (phrase: string, context: string) => Promise<{ success: boolean }>
    get: (prefix: string, context: string) => Promise<{ success: boolean; predictions: unknown[] }>
  }
  on: (channel: string, cb: (...args: unknown[]) => void) => void
  off: (channel: string, cb: (...args: unknown[]) => void) => void
  once: (channel: string, cb: (...args: unknown[]) => void) => void
}