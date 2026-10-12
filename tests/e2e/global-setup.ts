// Compile each route once before the workers start. Next dev 500s when several
// workers hit a dynamic route cold at the same moment (generate-params race).
export default async function globalSetup() {
  for (const path of ['/', '/terms/sticky', '/compare/none-vs-none']) {
    await fetch(`http://localhost:3100${path}`).catch(() => undefined)
  }
}
