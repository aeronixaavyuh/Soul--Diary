export const ollama = {
  isAvailable: async () => false,
  getModels: async () => ({ success: true, models: [] }),
  setModel: (_model: string) => undefined,
  getModel: () => null,
  pullModel: async (_model: string, _onProgress: (status: string, percent?: number) => void) => ({ success: false, error: 'Ollama unavailable' }),
  chat: async (_prompt: string, _context?: string) => ({ success: false, error: 'Ollama unavailable' }),
  detectMood: async (_text: string) => ({
    success: true,
    data: {
      mood: 'neutral',
      score: 5,
      emoji: '😐',
      confidence: 0,
      explanation: 'AI is not configured',
    },
  }),
  summarize: async (_text: string, _style: string = 'brief') => ({ success: false, error: 'Ollama unavailable' }),
  getSuggestions: async (_text: string, _type: string = 'continuation') => ({ success: false, error: 'Ollama unavailable' }),
  getDailyPrompts: async (_context?: Record<string, unknown>) => ({ success: false, error: 'Ollama unavailable' }),
  getPredictions: async (_prefix: string, _context: string = 'any', _limit: number = 8) => ([]),
}
