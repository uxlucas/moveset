import type { MetadataRoute } from 'next'
import data from '@/generated/terms-data.json'
import { compareSlug, isVisible, visibleConfusedPairs } from '@/lib/content'
import { SITE_URL } from '@/lib/site'
import type { TermData } from '@/lib/term-data'

const terms = data as TermData[]

// The same pages the build makes: the index, About, every visible term and every compare page between them.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    ...terms.filter((t) => isVisible(t)).map((t) => ({ url: `${SITE_URL}/terms/${t.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...visibleConfusedPairs(terms).map((p) => ({ url: `${SITE_URL}/compare/${compareSlug(p.a, p.b)}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]
}
