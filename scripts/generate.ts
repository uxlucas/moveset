import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { publishedTerms, renderLlmsTxt, renderSkill, renderTermMarkdown, renderTermsJson } from './lib/outputs'
import { assertSlugsMatch, renderRegistry, renderSlugs, slugFromFile, toTermData } from './lib/registry'

const root = fileURLToPath(new URL('..', import.meta.url))
const termsDir = path.join(root, 'src/terms')
const outDir = path.join(root, 'src/generated')
const publicDir = path.join(root, 'public')
const skillDir = path.join(root, 'skills/moveset')

function writeIfChanged(file: string, content: string) {
  mkdirSync(path.dirname(file), { recursive: true })
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return
  writeFileSync(file, content)
}

/** Writes `files` under `dir` and removes anything else there, so an unpublished term leaves no stale file. */
function writeFolder(dir: string, files: Record<string, string>) {
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue
      const rel = path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
      if (!(rel in files)) rmSync(path.join(dir, rel))
    }
  }
  for (const [rel, content] of Object.entries(files)) writeIfChanged(path.join(dir, rel), content)
}

async function main() {
  const files = readdirSync(termsDir).filter((f) => f.endsWith('.tsx')).sort()
  const slugs = files.map(slugFromFile)
  mkdirSync(outDir, { recursive: true })
  writeIfChanged(path.join(outDir, 'slugs.ts'), renderSlugs(slugs))
  writeIfChanged(path.join(outDir, 'registry.ts'), renderRegistry(slugs))

  const { terms } = await import(pathToFileURL(path.join(outDir, 'registry.ts')).href)
  assertSlugsMatch(terms, slugs)
  writeIfChanged(path.join(outDir, 'terms-data.json'), JSON.stringify(toTermData(terms), null, 2) + '\n')

  // Agent outputs, published terms only. public/ outputs are gitignored; skills/ is committed.
  const published = publishedTerms(terms)
  writeIfChanged(path.join(publicDir, 'llms.txt'), renderLlmsTxt(terms))
  writeFolder(path.join(publicDir, 'terms'), Object.fromEntries(published.map((t) => [`${t.slug}.md`, renderTermMarkdown(t, terms)])))
  writeIfChanged(path.join(publicDir, 'api/terms.json'), JSON.stringify(renderTermsJson(terms, new Date().toISOString()), null, 2) + '\n')
  writeFolder(skillDir, renderSkill(terms))
  console.log(`generate: ${slugs.length} terms, ${published.length} published`)
}

if (process.argv.includes('--watch')) {
  // Each run is a fresh process: the term files are cached once imported.
  const run = () => spawnSync(process.execPath, [...process.execArgv, process.argv[1]], { stdio: 'inherit' })
  let timer: ReturnType<typeof setTimeout> | undefined
  run()
  watch(termsDir, () => {
    clearTimeout(timer)
    timer = setTimeout(run, 150)
  })
  console.log('generate: watching src/terms')
} else {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
