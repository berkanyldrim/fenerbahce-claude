import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit, ThemeSetArgs } from 'claude-code'

import type { CacheReading, SessionStats } from '../types'
import { makeColors } from './make-colors.js'
import { buildScene, NAVY, YELLOW } from './scene.ts'
import type { Logo } from './scene.ts'

// Sarı-lacivert: navy surfaces, canary yellow accent. Dark only, a night match.
const { theme, problems } = makeColors({
  label: 'Fenerbahçe',
  only: 'dark',
  roles: { accent: YELLOW, danger: '#e5484d', success: '#46a758', warning: '#f5a524', pro: '#5b7fd6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#08142f',
        'surface-1': '#0d1b3b',
        'surface-2': '#112246',
        'surface-3': '#142649',
        'text-primary': '#f6f1da',
        'text-secondary': '#dde2f0',
        'text-muted': '#b8c2dc',
      },
    },
  },
})

type Mode = 'live' | 'still' | 'off'
// Earlier versions stored the Turkish words; they still mean the same.
const MODE_WORDS: Record<string, Mode> = {
  live: 'live',
  still: 'still',
  off: 'off',
  canli: 'live',
  sabit: 'still',
  kapat: 'off',
  kapali: 'off',
}

// The prompt cache lives an hour after the last request (this session's TTL).
const CACHE_TTL_MS = 60 * 60 * 1000
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
// The scene must stay under 131072 characters, logo included.
const MAX_LOGO_BASE64 = 100_000
const TRACK = '#1d2c55'
const CARD_BG = '#0b1733'
const CARD_BORDER = '#24386b'
const PILL_BG = '#13244c'
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const EFFORT_TR: Record<string, string> = {
  low: 'düşük',
  medium: 'orta',
  high: 'yüksek',
  xhigh: 'çok yüksek',
  max: 'maks',
}
const MIME: Record<string, string> = {
  png: 'image/png',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

const HELP = [
  'Fenerbahçe teması: /fenerbahce <command>',
  '  live           hareketli stadyum (varsayılan)',
  '  still          hareketsiz stadyum',
  '  off            temayı, kartı ve alt satırı kapatır',
  '  logo <path>    kendi logo dosyanı sağ üste koyar (png/gif/jpg/webp/svg, en fazla ~75 KB)',
  '  logo remove    logoyu kaldırır',
  '  status         modu ve logonun durumunu gösterir',
].join('\n')

const cacheAtom = atom({ plugin: 'fenerbahce', key: 'cache' } as const, null)
const EMPTY_STATS: SessionStats = { tools: 0, turns: 0, model: null, effort: null }
const statsAtom = atom({ plugin: 'fenerbahce', key: 'stats' } as const, EMPTY_STATS)

type Cell = {
  label: string
  pct: number
  note: string
  /** Where the window's time stands, 0 to 100, drawn as a tick; absent for none. */
  marker?: number
  gradient?: [string, string]
}

function percentColor(p: number): string {
  if (p >= 85) return '#ff6b6b'
  if (p >= 60) return YELLOW
  return '#7ee08a'
}

/** A segmented bar: track, filled part, a divider every 10%, and an optional time tick. */
function barSvg(cell: Cell): string {
  const pct = Math.min(100, Math.max(0, cell.pct))
  const [from, to] = cell.gradient ?? [percentColor(pct), percentColor(pct)]
  let ticks = ''
  for (let i = 1; i < 10; i++) {
    ticks += `<rect x="${i * 100 - 2}" y="3" width="4" height="10" fill="${CARD_BG}"/>`
  }
  const marker =
    cell.marker === undefined
      ? ''
      : `<rect x="${Math.min(995, Math.max(0, cell.marker * 10 - 2))}" y="0" width="5" height="16" fill="#9ec5ff"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="16" viewBox="0 0 1000 16" preserveAspectRatio="none">
<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect x="0" y="3" width="1000" height="10" fill="${TRACK}"/>
<rect x="0" y="3" width="${pct * 10}" height="10" fill="url(#f)"/>
${ticks}${marker}
</svg>`
}

function textBar(percent: number, width: number): [string, string] {
  const w = Math.max(6, width)
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * w)
  return ['━'.repeat(filled), '━'.repeat(w - filled)]
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function countdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}g ${h}sa`
  if (h > 0) return `${h}sa ${pad2(m)}dk`
  return `${m}dk`
}

function resetLabel(limit: SessionRateLimit, now: number, withDay: boolean): string {
  if (limit.resetsAt === undefined) return ''
  const at = new Date(limit.resetsAt)
  const clock = `${pad2(at.getHours())}:${pad2(at.getMinutes())}`
  const when = withDay ? `${DAYS[at.getDay()]} ${clock}` : clock
  return `↻ ${countdown(at.getTime() - now)} · ${when}`
}

/** How far through its window the clock is, 0 to 100. */
function elapsedMarker(limit: SessionRateLimit, now: number, windowMs: number): number | undefined {
  if (limit.resetsAt === undefined) return undefined
  const left = new Date(limit.resetsAt).getTime() - now
  return Math.min(100, Math.max(0, (1 - left / windowMs) * 100))
}

/** "claude-opus-5-5" -> "Opus 5.5"; anything else is shown as given. */
function modelName(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id)
  if (m === null) return id
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  return m[3] !== undefined ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`
}

function asMode(value: unknown): Mode {
  return typeof value === 'string' ? (MODE_WORDS[value] ?? 'live') : 'live'
}

function asLogo(value: unknown): Logo | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Partial<Logo>
  return typeof v.mime === 'string' && typeof v.base64 === 'string' ? { mime: v.mime, base64: v.base64 } : null
}

// A logo.png the person puts in the plugin's own folder. Kept once read;
// a miss is tried again on the next draw.
let folderLogoCache: Logo | null = null
let folderLogoError = 'not tried yet'
async function folderLogo($: EngineInterface): Promise<Logo | null> {
  if (folderLogoCache !== null) return folderLogoCache
  const path = `${$.plugin.root}/logo.png`
  try {
    if (!(await $.fs.exists(path))) {
      folderLogoError = `no file at ${path}`
      return null
    }
    const { base64 } = await $.fs.read(path, { as: 'bytes' })
    if (base64.length > MAX_LOGO_BASE64) {
      folderLogoError = `too big: ${base64.length} base64 chars`
      return null
    }
    folderLogoCache = { mime: 'image/png', base64 }
    folderLogoError = ''
  } catch (err) {
    folderLogoError = `read failed at ${path}: ${String(err)}`
  }
  return folderLogoCache
}

async function currentLogo($: EngineInterface): Promise<Logo | null> {
  return asLogo(await $.store.get('logo')) ?? (await folderLogo($))
}

async function apply($: EngineInterface): Promise<void> {
  const mode = asMode(await $.store.get('mode'))
  if (mode === 'off') {
    return
  }
  // The scene's name says whether a logo is in it, so adding or removing one
  // changes the look and the app draws the backdrop again.
  const logo = await currentLogo($)
  const scene = logo === null ? mode : `${mode}-logo`
  // No blur, so the pixel art stays crisp; the scene itself darkens the middle.
  const look: ThemeSetArgs = {
    colors: theme,
    backdrop: { scene, glass: { blur: 0, tint: NAVY, opacity: 0.35 } },
  }
  const set = await $.theme.set(look)
  if (!set.isDrawn) {
    $.ui.log(`fenerbahce: theme not drawn: ${set.reason}`, { to: 'debug' })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fenerbahce',
      description: 'Fenerbahçe theme: /fenerbahce live | still | off | logo <path> | logo remove',
    })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await apply($)
    // Keep countdowns fresh between turns.
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))

    return next(e)
  })

  on('command.run', { command: 'fenerbahce' }, async ($, e) => {
    const args = e.args.trim()
    const [word, ...rest] = args.split(/\s+/)
    const arg = rest.join(' ').replace(/^["']|["']$/g, '')

    const mode = MODE_WORDS[word]
    if (mode === 'live' || mode === 'still') {
      await $.store.set('mode', mode)
      await apply($)
      $.ui.invalidate('ui.render')
      return { text: mode === 'live' ? 'Stadyum hareketli.' : 'Stadyum sabit.', isTextDisplayOnly: true }
    }
    if (mode === 'off') {
      await $.store.set('mode', 'off')
      await $.theme.clear()
      $.ui.invalidate('ui.render')
      return { text: 'Tema kapandı. Açmak için: /fenerbahce live', isTextDisplayOnly: true }
    }
    if (word === 'status') {
      const stored = asLogo(await $.store.get('logo'))
      const folder = await folderLogo($)
      const lines = [
        `mode: ${asMode(await $.store.get('mode'))}`,
        `plugin root: ${$.plugin.root}`,
        `logo set by command: ${stored === null ? 'no' : `yes (${stored.base64.length} chars)`}`,
        `logo.png in folder: ${folder === null ? `no — ${folderLogoError}` : `yes (${folder.base64.length} chars)`}`,
      ]
      await apply($)
      $.ui.invalidate('ui.render')
      return { text: lines.join('\n'), isTextDisplayOnly: true }
    }
    if (word === 'logo' && (arg === 'remove' || arg === 'sil')) {
      await $.store.delete('logo')
      await apply($)
      $.ui.invalidate('ui.render')
      return { text: 'Logo kaldırıldı.', isTextDisplayOnly: true }
    }
    if (word === 'logo' && arg !== '') {
      const ext = arg.split('.').pop()?.toLowerCase() ?? ''
      const mime = MIME[ext]
      if (mime === undefined) {
        return { text: 'Logo png, gif, jpg, webp ya da svg olmalı.', isTextDisplayOnly: true }
      }
      let base64: string
      try {
        base64 = (await $.fs.read(arg, { as: 'bytes' })).base64
      } catch (err) {
        return { text: `Dosya okunamadı: ${String(err)}`, isTextDisplayOnly: true }
      }
      if (base64.length > MAX_LOGO_BASE64) {
        return { text: 'Logo çok büyük. En fazla ~75 KB olmalı; küçük bir piksel logo en iyisi.', isTextDisplayOnly: true }
      }
      const logo: Logo = { mime, base64 }
      await $.store.set('logo', logo)
      await apply($)
      $.ui.invalidate('ui.render')
      return { text: 'Logo eklendi, sağ üstte görünecek.', isTextDisplayOnly: true }
    }
    return { text: HELP, isTextDisplayOnly: true }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const scene = String(e.props.scene ?? '').split('-')[0]
    if (scene !== 'live' && scene !== 'still') {
      return next(e)
    }
    const logo = await currentLogo($)
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={buildScene({ still: scene === 'still', logo })}
        alt="Gece stadyumu: projektörler, sarı-lacivert tribünler, solda çubuklu formalı piksel oyuncu, sağda piksel kanarya"
        isInteractive
      />
    )
  })

  // Record the model, effort and prompt-cache share of each main-thread request.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const usage = result.usage
    if (e.agentId === undefined) {
      const effort = e.effort === undefined ? null : String(e.effort)
      await update($, statsAtom, s => ({ ...s, model: usage?.model ?? e.model, effort }))
      if (usage !== null) {
        const total = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
        if (total > 0) {
          const reading: CacheReading = {
            hitPercent: Math.round((usage.cache_read_input_tokens / total) * 100),
            at: await $.clock.now(),
          }
          await update($, cacheAtom, () => reading)
        }
      }
      $.ui.invalidate('ui.render')
    }

    return result
  })

  on('tool.call', async ($, e, next) => {
    await update($, statsAtom, s => ({ ...s, tools: s.tools + 1 }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await update($, statsAtom, s => ({ ...s, turns: s.turns + 1 }))
    $.ui.invalidate('ui.render')

    return result
  })

  // The line under the prompt: club pill, model and effort, session time, cost, counts.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (asMode(await $.store.get('mode')) === 'off') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const stats = await read($, statsAtom)
    const usage = await $.session.usage()
    const now = await $.clock.now()

    const pills: { key: string; text: string; color?: string }[] = [{ key: 'club', text: '⚽ Sarı Kanaryalar', color: YELLOW }]
    if (stats.model !== null) {
      const effort = stats.effort === null ? '' : ` · ${EFFORT_TR[stats.effort] ?? stats.effort}`
      pills.push({ key: 'model', text: `${modelName(stats.model)}${effort}` })
    }
    pills.push({ key: 'time', text: `⏱ ${countdown(now - usage.startedAt)}` })
    if (usage.cost !== undefined) {
      pills.push({ key: 'cost', text: `$${usage.cost.usd.toFixed(2)}` })
    }
    pills.push({ key: 'turns', text: `💬 ${stats.turns} tur` })
    pills.push({ key: 'tools', text: `🔧 ${stats.tools} araç` })

    return (
      <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
        {pills.map(p => (
          <Box key={p.key}>
            <Text backgroundColor={PILL_BG} color={p.color ?? '#d2d8ea'} size="footnote">
              {` ${p.text} `}
            </Text>
          </Box>
        ))}
        {e.props.hint !== '' ? (
          <Box key="hint">
            <Text dimColor size="footnote">
              {e.props.hint}
            </Text>
          </Box>
        ) : null}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || asMode(await $.store.get('mode')) === 'off') {
      return next(e)
    }
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const Svg = (ui as { Svg?: typeof ui.Svg }).Svg
    const now = await $.clock.now()
    const usage = await $.session.usage()
    const cache = await read($, cacheAtom)

    const session = usage.rateLimits.find(r => r.kind === 'five_hour')
    const week = usage.rateLimits.find(r => r.kind === 'seven_day')

    const elapsed = cache === null ? Infinity : now - cache.at
    const isWarm = elapsed < CACHE_TTL_MS
    const cacheNote = cache === null ? 'henüz yok' : isWarm ? `sıcak · ${countdown(CACHE_TTL_MS - elapsed)}` : 'soğuk'

    const cells: Cell[] = [
      { label: 'Bağlam', pct: usage.context.percent ?? 0, note: '', gradient: [YELLOW, '#ff9a1f'] },
      { label: 'Önbellek', pct: cache !== null && isWarm ? cache.hitPercent : 0, note: cacheNote },
      {
        label: 'Oturum',
        pct: session?.percentUsed ?? 0,
        note: session ? resetLabel(session, now, false) : 'veri yok',
        marker: session ? elapsedMarker(session, now, FIVE_HOURS_MS) : undefined,
      },
      {
        label: 'Hafta',
        pct: week?.percentUsed ?? 0,
        note: week ? resetLabel(week, now, true) : 'veri yok',
        marker: week ? elapsedMarker(week, now, SEVEN_DAYS_MS) : undefined,
      },
    ]

    const pctText = (c: Cell) => (
      <Text color={c.gradient ? c.gradient[0] : percentColor(c.pct)} bold>
        %{Math.round(c.pct)}
      </Text>
    )

    if (e.props.isCollapsed || e.props.maxRows < 4) {
      return (
        <Box flexDirection="row" gap={2}>
          {cells.map(c => (
            <Box key={c.label}>
              <Text>
                <Text dimColor>{c.label} </Text>
                {pctText(c)}
              </Text>
            </Box>
          ))}
        </Box>
      )
    }

    const isGraphic = (e.surface === 'desktop' || e.surface === 'mobile') && Svg !== undefined
    const textWidth = Math.floor((e.props.bodyColumns - 10) / 2)

    const cell = (c: Cell) => {
      const [full, empty] = textBar(c.pct, textWidth)
      return (
        <Box key={c.label} flexDirection="column" flexGrow={1} flexShrink={1} width="50%" gap={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text>
              <Text bold>{c.label} </Text>
              {pctText(c)}
            </Text>
            <Text dimColor>{c.note}</Text>
          </Box>
          {isGraphic && Svg !== undefined ? (
            <Svg source={barSvg(c)} alt={`${c.label} yüzde ${Math.round(c.pct)}`} height={8} />
          ) : (
            <Text wrap="truncate">
              <Text color={c.gradient ? c.gradient[0] : percentColor(c.pct)}>{full}</Text>
              <Text color={TRACK}>{empty}</Text>
            </Text>
          )}
        </Box>
      )
    }

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={CARD_BORDER}
        backgroundColor={CARD_BG}
        paddingX={2}
        paddingY={1}
        gap={1}
      >
        <Box flexDirection="row" gap={6}>
          {cell(cells[0])}
          {cell(cells[1])}
        </Box>
        <Box flexDirection="row" gap={6}>
          {cell(cells[2])}
          {cell(cells[3])}
        </Box>
      </Box>
    )
  })
}
