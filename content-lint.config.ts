import type { LintConfig } from '@/lib/lint'

// Terms whose subject requires a rule the lint normally forbids.
const config: LintConfig = {
  allowLayoutProps: ['height-auto', 'layout-shift'],
  // Ease-out's compare control shows ease-in next to it on purpose; that branch's code is marked comparison only.
  allowEaseIn: ['ease-out'],
}

export default config
