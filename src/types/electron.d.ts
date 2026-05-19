export { }

declare global {
  interface Window {
    electronAPI: {
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
      pdf: {
        export: (html: string, opts?: {
          title?: string
          landscape?: boolean
          margins?: { top: number; bottom: number; left: number; right: number }
        }) => Promise<{
          success: boolean
          canceled?: boolean
          filePath?: string
          size?: number
          sizeKB?: number
          error?: string
        }>
        print: (html: string) => Promise<{ success: boolean; error?: string }>
        open: (filePath: string) => Promise<{ success: boolean; error?: string }>
        getExportsPath: () => Promise<{ success: boolean; path: string }>
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
  }
}