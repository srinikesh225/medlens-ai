/**
 * Design-system enforcement.
 *
 *   1. No arbitrary Tailwind values  (text-[17px], p-[18px], bg-[#hex])
 *   2. No inline styles              (except computed positions/sizes)
 *   3. Spacing utilities use the 4px scale only
 *
 * ENFORCED paths fail the build. Everything else is REPORTED only — those are
 * the screens still awaiting migration to the primitives, and the report is
 * the migration backlog. Move a path from REPORTED to ENFORCED as it lands.
 *
 * Run: npm run lint:tokens
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

/** Paths held to the design system. Extend this list as screens migrate. */
const ENFORCED = [join('src', 'components', 'ui'), join('src', 'design'), join('src', 'pages', 'Dashboard.tsx')]

/**
 * Inline style is permitted only where the value is genuinely computed at
 * runtime and therefore cannot be a utility class.
 */
const INLINE_STYLE_ALLOWED = new Set([
  join('src', 'components', 'ui', 'ConfidenceMeter.tsx'), // bar width = confidence %
  join('src', 'components', 'SourceDocument.tsx'), // highlight positions in the viewer
])

/** Tailwind steps that land on the 4 8 12 16 20 24 32 40 48 64 80 scale. */
const SPACING_STEPS = new Set(['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', 'px', 'auto', 'full'])
const SPACING_PREFIX = /(?:^|[\s"'`])-?(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-([\w.]+)/g

const ARBITRARY = /(?:^|[\s"'`:])-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[[^\]]+\]/g
const INLINE_STYLE = /style=\{\{/g

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts|css)$/.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}

const isEnforced = (rel) => ENFORCED.some((e) => rel === e || rel.startsWith(e + sep))

const violations = { enforced: [], reported: [] }

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file)
  // The token layer itself is where raw values are declared.
  if (rel.endsWith(join('src', 'index.css')) || rel.endsWith(join('src', 'design', 'tokens.ts'))) continue

  const text = readFileSync(file, 'utf8')
  const bucket = isEnforced(rel) ? violations.enforced : violations.reported
  const lines = text.split(/\r?\n/)

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`

    for (const m of line.matchAll(ARBITRARY)) {
      bucket.push({ at, rule: 'arbitrary-value', detail: m[0].trim() })
    }

    if (INLINE_STYLE.test(line)) {
      INLINE_STYLE.lastIndex = 0
      if (!INLINE_STYLE_ALLOWED.has(rel)) bucket.push({ at, rule: 'inline-style', detail: 'style={{ ... }}' })
    }

    if (file.endsWith('.tsx')) {
      for (const m of line.matchAll(SPACING_PREFIX)) {
        const [, prefix, step] = m
        if (!SPACING_STEPS.has(step)) {
          bucket.push({ at, rule: 'off-scale-spacing', detail: `${prefix}-${step}` })
        }
      }
    }
  })
}

const print = (list, heading) => {
  if (!list.length) return
  console.log(`\n${heading}`)
  for (const v of list) console.log(`  ${v.rule.padEnd(20)} ${v.detail.padEnd(24)} ${v.at}`)
}

print(violations.enforced, 'VIOLATIONS (enforced — these fail)')
print(violations.reported, 'BACKLOG (not yet migrated to the primitives — reported only)')

console.log(
  `\n${violations.enforced.length} violation(s) in enforced paths, ` +
    `${violations.reported.length} in the migration backlog.`,
)
process.exit(violations.enforced.length > 0 ? 1 : 0)
