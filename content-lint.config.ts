import type { LintConfig } from '@/lib/lint'

// Terms whose subject requires a rule the lint normally forbids.
const config: LintConfig = {
  allowLayoutProps: ['height-auto', 'layout-shift'],
  allowEaseIn: [],
}

export default config
