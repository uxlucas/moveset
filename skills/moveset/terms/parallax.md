# Parallax

Also called: depth scroll, multi-speed scroll, layered scroll, background moves slower, background lags behind the content, parallax scrolling

> Layers move at different speeds while you scroll, which makes the page feel like it has depth.

Parallax is scroll-linked motion with one job: faking distance. The content scrolls at full speed while each layer behind it moves a fixed fraction of the scroll, so near things pass far things the way they do from a train window. There is no duration and no easing; the offset is the scroll distance times a ratio, and it reverses exactly when you scroll back.

## Use when

- A hero or editorial opener, where a sense of depth sets the tone before the reading starts.
- Decorative backgrounds on marketing pages: shapes, illustration, photography behind a headline.

## Avoid when

- Content people read or act on, like text, forms and controls. Anything that drifts out of step with the scroll is harder to follow and to hit.
- Large layers with big speed differences, or effects across the whole page. Motion out of step with the scroll can make people with vestibular disorders unwell.
- More than one parallax section per page. It stops being a moment and becomes a texture.
- Pages where reduced motion cannot simply flatten the layers. If the layout only works with the offset, it is not decoration.

## Prompt

```text
Add parallax to this page's top hero.

- Hero: `position: relative; overflow: clip; padding-top: 40vh`.
- Content: one opaque in-flow panel, `position: relative`, full speed, sliding over the layer.
- One layer: `position: absolute; inset: 0` (hero height), `pointer-events: none`, `aria-hidden`, before the content.
- Ratio, set once as `--ratio` on the layer: `0.4` (0.4px per 1px scrolled).
- Progress: 0 when the hero's top is at the viewport top, 1 when its bottom is; clamped.
- Layer: `translate3d(0, progress × (1 − ratio) × 100%, 0)` (60%), so n × (1 − ratio) px after n px. Linear; transform only; no `background-attachment: fixed`; static `will-change: transform`.
- Visible while the layer peeks above the panel (first 40vh of scroll); more padding, longer window.
- CSS route: `.hero { view-timeline: --hero block }`; layers: `animation: parallax linear both`, then `animation-timeline: --hero; animation-range: exit-crossing` (shorthand first); `@keyframes parallax` to `translate3d(0, calc((1 - var(--ratio)) * 100%), 0)`.
- Feature-test `CSS.supports('animation-timeline', 'scroll()')` before first paint; false: `data-fallback` on `<html>`, JS route. CSS animation only under `html:not([data-fallback])` in `@supports (animation-timeline: scroll())`.
- JS route (after the DOM exists: end of `<body>`, or after mount): passive `scroll`/`resize`, one requestAnimationFrame, hero rect per frame, ratio from `--ratio`.
- Reduced motion: no animation or transform; JS clears inline transforms and removes listeners while it matches, re-arming on `change`.
```

### Acceptance checklist

- [ ] At the top of the hero, the layers are visible above the content panel.
- [ ] Scrolled 100px into the hero, the content has moved 100px up and the back layer 40px; its computed transform is `matrix(1, 0, 0, 1, 0, 60)`.
- [ ] Scrolling back up reverses it exactly: the same scroll position always gives the same offsets, with no transition or lag.
- [ ] The content panel slides over the layers; nothing in a layer can be clicked.
- [ ] Only the layers' transforms change: the hero's height and the page's `scrollHeight` are the same at every scroll position, and the same as with the layers removed.
- [ ] With reduced motion on, the layers move with the content at every scroll position; switching the setting while the page is open flattens or restores them without a reload.
- [ ] In a browser where `CSS.supports('animation-timeline', 'scroll()')` is false (Firefox today), the JS route gives the same offsets. To check in Chromium, stub `CSS.supports` to return false before the page loads.

## Code

### CSS

```css
/* Markup: <section class="hero">
             <div class="layer layer-back" aria-hidden="true">…</div>
             <div class="hero-content">…</div>
           </section> */
.hero {
  position: relative;
  /* Moved layers never paint below the hero or make the page taller. */
  overflow: clip;
  /* The open top, where the layers show above the content. */
  padding-top: 40vh;
  view-timeline: --hero block;
}

.layer {
  position: absolute;
  inset: 0; /* the hero's height, so 100% in the keyframes is the hero too */
  pointer-events: none;
  will-change: transform;
}

/* Speed ratio: the layer moves ratio x the scroll. Set only here; the JS tab reads it. */
.layer-back { --ratio: 0.4; }

/* In front, at full speed. Opaque, so it slides over the layers. */
.hero-content {
  position: relative;
  background: var(--surface, #fff);
}

/* House rule: parallax drops the speed difference under reduced motion. */
@media (prefers-reduced-motion: no-preference) {
  /* Same test as the JS tab, which sets data-fallback when it takes over. */
  @supports (animation-timeline: scroll()) {
    html:not([data-fallback]) .layer {
      /* The shorthand resets animation-timeline, so it comes first. linear
         maps progress 1:1; both holds the ends outside the range. */
      animation: parallax linear both;
      animation-timeline: --hero;
      /* 0: the hero's top at the viewport top. 1: its bottom there. */
      animation-range: exit-crossing;
    }
  }
}

/* The layer scrolls with the hero; pushing it down (1 - ratio) of the
   scroll leaves it moving ratio x the scroll on screen. */
@keyframes parallax {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, calc((1 - var(--ratio)) * 100%), 0); }
}
```

### JS

```js
// Load at the end of `<body>`: the hero exists, and the test runs before it paints.
// Same test as the CSS @supports, so the two routes never both run.
const supported = CSS.supports('animation-timeline', 'scroll()')
const hero = document.querySelector('.hero')

if (hero && !supported) {
  document.documentElement.dataset.fallback = ''
  const layers = [...hero.querySelectorAll('.layer')]
  // The ratio lives in the CSS (--ratio), so both routes share one value.
  const ratios = layers.map((l) => parseFloat(getComputedStyle(l).getPropertyValue('--ratio')))
  // House rule: parallax drops the speed difference under reduced motion.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0

  const render = () => {
    frame = 0
    // Read every frame, never cached: resizes and late content change it.
    const box = hero.getBoundingClientRect()
    // Pixels the hero has scrolled past the viewport top, 0 to its height.
    const n = Math.min(Math.max(-box.top, 0), box.height)
    layers.forEach((layer, i) => {
      layer.style.transform = `translate3d(0, ${n * (1 - ratios[i])}px, 0)`
    })
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }

  // Follows the setting live: listeners and transforms only while motion is allowed.
  const arm = () => {
    if (reduce.matches) {
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
      frame = 0
      for (const layer of layers) layer.style.transform = ''
    } else {
      addEventListener('scroll', schedule, { passive: true })
      addEventListener('resize', schedule)
      render()
    }
  }
  reduce.addEventListener('change', arm)
  arm()
}
```

### Motion

```tsx
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

// Speed ratios: a layer moves ratio x the scroll; the content moves 1x.
const BACK = 0.4
// Pushing a layer down (1 - ratio) of the hero's height leaves it moving ratio x the scroll.
const shift = (ratio: number) => `${(1 - ratio) * 100}%`
const layer = 'pointer-events-none absolute inset-0 will-change-transform'

type Props = {
  back: ReactNode
  children: ReactNode
}

export function ParallaxHero({ back, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  // 0: the hero's top at the viewport top. 1: its bottom there.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const backY = useTransform(scrollYProgress, [0, 1], ['0%', shift(BACK)])
  // House rule: parallax drops the speed difference under reduced motion.
  const reduce = useReducedMotion()
  return (
    // pt-[40vh]: the open top, where the layers show above the content.
    <section ref={ref} className="relative overflow-clip pt-[40vh]">
      <motion.div aria-hidden className={layer} style={reduce ? undefined : { y: backY }}>
        {back}
      </motion.div>
      {/* In front, at full speed: opaque, so it slides over the layers. */}
      <div className="relative bg-[var(--surface,#fff)]">{children}</div>
    </section>
  )
}
```

## Accessibility

Parallax is decoration, and motion out of step with the scroll can make people with vestibular disorders unwell. Under reduced motion, remove the speed difference entirely so every layer moves with the content (a house rule). Keep the layers out of the reading order with aria-hidden and pointer-events: none, and never put text people need in a moving layer.

## Related

- [Scroll-linked](https://moveset.lucaslima.design/terms/scroll-linked)
- [Scroll-triggered](https://moveset.lucaslima.design/terms/scroll-triggered)

## Often confused with

- [Parallax vs Scroll-linked](https://moveset.lucaslima.design/compare/parallax-vs-scroll-linked): Parallax is one use of scroll-linked motion: layers move at different speeds to suggest depth. Scroll-linked is the general technique of tying any property to the scroll position.

Source: https://moveset.lucaslima.design/terms/parallax
