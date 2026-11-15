export type CacheReading = {
  /** Share of the last main-thread request's input served from the prompt cache, 0 to 100. */
  hitPercent: number
  /** When that request finished, in $.clock.now() milliseconds. */
  at: number
}

export type SessionStats = {
  /** Tool calls made this session. */
  tools: number
  /** Turns answered this session. */
  turns: number
  /** The model of the last main-thread request, as the API reports it. */
  model: string | null
  /** The effort the last main-thread request was sent with. */
  effort: string | null
}

declare module 'claude-code' {
  interface PluginState {
    fenerbahce: { cache: CacheReading | null; stats: SessionStats }
  }
}
