import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertSlugsMatch, renderRegistry, renderSlugs, slugFromFile, toTermData } from './lib/registry'

const root = fileURLToPath(new URL('..', import.meta.url))
const termsDir = path.join(root, 'src/terms')
const outDir = path.join(root, 'src/generated')

function writeIfChanged(file: string, content: string) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return
  writeFileSync(file, content)
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
  console.log(`generate: ${slugs.length} terms`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
