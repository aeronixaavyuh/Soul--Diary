import { ipcMain } from 'electron'
import { ollama  } from '../services/ollama'

// ─────────────────────────────────────────────────────────────────────────────
//  Register ALL AI IPC Handlers
//  Called once from electron/main.ts
// ─────────────────────────────────────────────────────────────────────────────

export function registerAiHandlers(): void {

  // ── Availability Check ─────────────────────────────────────────────────────

  /**
   * Check if Ollama is running locally.
   * React side polls this to show AI feature availability.
   */
  ipcMain.handle('ai:isAvailable', async () => {
    try {
      const available = await ollama.isAvailable()
      return { success: true, available }
    } catch (err: any) {
      return { success: false, available: false, error: err.message }
    }
  })

  // ── Model Management ───────────────────────────────────────────────────────

  /**
   * Get list of all locally installed Ollama models.
   */
  ipcMain.handle('ai:models', async () => {
    try {
      const result = await ollama.getModels()
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  /**
   * Set which model to use for AI features.
   */
  ipcMain.handle('ai:setModel', (_e, modelName: string) => {
    try {
      ollama.setModel(modelName)
      return { success: true, model: modelName }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  /**
   * Get currently active model name.
   */
  ipcMain.handle('ai:getModel', () => {
    return { success: true, model: ollama.getModel() }
  })

  /**
   * Pull / download a new model from Ollama registry.
   * Streams progress back to renderer via separate channel.
   */
  ipcMain.handle('ai:pullModel', async (event, modelName: string) => {
    try {
      const result = await ollama.pullModel(
        modelName,
        (status: string, percent?: number) => {
          // Send progress updates to renderer
          event.sender.send('ai:pullProgress', { status, percent })
        }
      )
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Core Generate ──────────────────────────────────────────────────────────

  /**
   * Generic prompt → response.
   * Used by renderer for custom AI queries.
   */
  ipcMain.handle('ai:query', async (
    _e,
    prompt:   string,
    context?: string
  ) => {
    try {
      if (!prompt?.trim()) {
        return { success: false, error: 'Prompt is empty' }
      }
      const result = await ollama.chat(prompt, context)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Mood Detection ─────────────────────────────────────────────────────────

  /**
   * Detect mood from diary entry text.
   * Returns: mood label, score (1-10), emoji, confidence, explanation.
   */
  ipcMain.handle('ai:detectMood', async (_e, text: string) => {
    try {
      if (!text?.trim()) {
        return {
          success: true,
          data: {
            mood:        'neutral',
            score:       5,
            emoji:       '😐',
            confidence:  0,
            explanation: 'No text provided',
          },
        }
      }
      const result = await ollama.detectMood(text)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Summarization ──────────────────────────────────────────────────────────

  /**
   * Summarize a diary/note entry.
   * style: 'brief' | 'detailed' | 'title'
   */
  ipcMain.handle('ai:summarize', async (
    _e,
    text:  string,
    style: 'brief' | 'detailed' | 'title' = 'brief'
  ) => {
    try {
      if (!text?.trim()) {
        return { success: false, error: 'No text to summarize' }
      }
      const result = await ollama.summarize(text, style)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Writing Suggestions ────────────────────────────────────────────────────

  /**
   * Get writing suggestions based on current text.
   * type: 'continuation' | 'improvement' | 'prompt'
   */
  ipcMain.handle('ai:suggestions', async (
    _e,
    text: string,
    type: 'continuation' | 'improvement' | 'prompt' = 'continuation'
  ) => {
    try {
      if (!text?.trim()) {
        return { success: true, data: { suggestions: [], type } }
      }
      const result = await ollama.getSuggestions(text, type)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Daily Prompts ──────────────────────────────────────────────────────────

  /**
   * Generate daily writing prompts.
   * Uses current mood/date/recent entries as context.
   */
  ipcMain.handle('ai:dailyPrompts', async (_e, context?: {
    mood?:   string
    date?:   string
    recent?: string
  }) => {
    try {
      const result = await ollama.getDailyPrompts(context)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Word Prediction ────────────────────────────────────────────────────────

  /**
   * Predict next words based on current text context.
   * Used for smart typing / autocomplete.
   */
  ipcMain.handle('ai:predictWords', async (
    _e,
    text:  string,
    count: number = 3
  ) => {
    try {
      if (!text?.trim() || text.trim().length < 5) {
        return { success: true, data: [] }
      }
      const result = await ollama.predictNextWords(text, count)
      return result
    } catch (err: any) {
      return { success: true, data: [] } // Fail silently for typing
    }
  })

  // ── Idea Expansion ─────────────────────────────────────────────────────────

  /**
   * Expand a short idea into structured thoughts.
   * Returns: expanded text, key points, next steps.
   */
  ipcMain.handle('ai:expandIdea', async (_e, idea: string) => {
    try {
      if (!idea?.trim()) {
        return { success: false, error: 'No idea provided' }
      }
      const result = await ollama.expandIdea(idea)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Auto Title ─────────────────────────────────────────────────────────────

  /**
   * Auto-generate a title for an entry.
   * Shortcut: summarize with style='title'.
   */
  ipcMain.handle('ai:autoTitle', async (_e, text: string) => {
    try {
      if (!text?.trim() || text.length < 30) {
        return { success: true, data: '' }
      }
      const result = await ollama.summarize(text, 'title')
      return result
    } catch (err: any) {
      return { success: true, data: '' }
    }
  })

  // ── Sentiment Timeline ─────────────────────────────────────────────────────

  /**
   * Batch analyze mood for multiple entries (for timeline/chart).
   * Takes array of {id, text} — returns array of {id, mood, score}.
   */
  ipcMain.handle('ai:batchMood', async (
    _e,
    entries: Array<{ id: string; text: string }>
  ) => {
    try {
      const results = []

      for (const entry of entries) {
        if (!entry.text?.trim()) {
          results.push({ id: entry.id, mood: 'neutral', score: 5, emoji: '😐' })
          continue
        }

        const result = await ollama.detectMood(entry.text)
        results.push({
          id:    entry.id,
          mood:  result.success ? result.data?.mood  ?? 'neutral' : 'neutral',
          score: result.success ? result.data?.score ?? 5         : 5,
          emoji: result.success ? result.data?.emoji ?? '😐'      : '😐',
        })

        // Small delay between requests to avoid overwhelming Ollama
        await new Promise(r => setTimeout(r, 200))
      }

      return { success: true, data: results }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Writing Style Analysis ─────────────────────────────────────────────────

  /**
   * Analyze writing style and give feedback.
   */
  ipcMain.handle('ai:analyzeStyle', async (_e, text: string) => {
    try {
      if (!text?.trim() || text.length < 100) {
        return { success: false, error: 'Text too short to analyze' }
      }

      const prompt = `Analyze this writing style briefly and respond ONLY with JSON.

Text:
"""
${text.slice(0, 1000)}
"""

Respond ONLY with this JSON:
{
  "tone": "formal/informal/emotional/neutral",
  "clarity": 8,
  "wordCount": 120,
  "avgSentenceLength": 15,
  "strengths": ["strength 1", "strength 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

clarity is 1-10. wordCount and avgSentenceLength are numbers.`

      const result = await ollama.generate(prompt, {
        temperature: 0.3,
        maxTokens:   300,
        system:      'You are a writing coach. Always respond with valid JSON only.',
      })

      if (!result.success) return result

      try {
        const jsonMatch = result.data!.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON')
        return { success: true, data: JSON.parse(jsonMatch[0]) }
      } catch {
        return { success: false, error: 'Could not parse AI response' }
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Gratitude Extractor ────────────────────────────────────────────────────

  /**
   * Extract gratitude / positive moments from entry.
   */
  ipcMain.handle('ai:extractGratitude', async (_e, text: string) => {
    try {
      if (!text?.trim() || text.length < 50) {
        return { success: true, data: [] }
      }

      const prompt = `Extract positive moments, achievements, or things to be grateful for from this diary entry.

Entry:
"""
${text.slice(0, 800)}
"""

Respond ONLY with JSON:
{"gratitude": ["moment 1", "moment 2", "moment 3"]}

If nothing found, return: {"gratitude": []}`

      const result = await ollama.generate(prompt, {
        temperature: 0.4,
        maxTokens:   200,
        system:      'You are a positivity coach. Respond with valid JSON only.',
      })

      if (!result.success) return { success: true, data: [] }

      try {
        const jsonMatch = result.data!.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return { success: true, data: [] }
        const parsed = JSON.parse(jsonMatch[0])
        return { success: true, data: parsed.gratitude ?? [] }
      } catch {
        return { success: true, data: [] }
      }
    } catch (err: any) {
      return { success: true, data: [] }
    }
  })

  console.log('[IPC] All AI handlers registered ✓')
}