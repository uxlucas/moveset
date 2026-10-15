# Real interface in the demos

Date: 2026-10-14

## Input

Reviewing Press Scale, the owner asked what the row of four small squares was. It was the opt-out (dense controls that change colour but never scale), and nothing on the stage said so. His conclusion went further than the row: the stages should show actual interface, the way Emil Kowalski's and Gustavo Fior's showcases do. A sidebar reads "Inbox, Today, Upcoming, Projects, Archive" with icons. A toolbar reads B, I, U, S, link. A menu reads "Dashboard, Billing & Invoices, Log out". A grey bar standing in for a label leaves the reader guessing what the component is, and a guess about the component becomes a guess about the motion.

## Decision

Every entry-page stage shows a real component with real content. Index cards keep the wireframe: at 308px a real menu or toolbar is too cramped to read, and the card's job is to show the motion, not the component (owner's call after the checkpoint).

- **Real labels and icons.** Text is text (13px on cards, 14px on the entry page, `text-ink` / `text-ink-muted`), icons are lucide at 14–16px. No grey bars where a label would be. Placeholder bars are allowed only for body copy that is genuinely not the point (a paragraph behind a sticky header), and never for the subject of the motion.
- **A recognisable component.** Pick the component the term is most often applied to: a tooltip on a formatting toolbar, a user menu under an "Options" button, a toast that says "Message sent" with an Undo, a sidebar list, a bottom sheet with a title and actions. The content should make the motion's purpose obvious without a caption.
- **Palette stays grayscale.** The `--demo-*`, `--surface`, `--line` and `--ink-*` tokens; the subject of the motion keeps the strongest contrast. No product colours, no brand marks (an app list uses neutral glyphs, not logos).
- **Verdicts stay in ink.** Comparison stages label their frames with words ("300ms fade in" / "Instant"; "right" / "too slow") and may add a lucide `Check` or `X` in `text-ink-muted` beside the label. Not red and green: the site has one accent and it marks where you are, not what is right.
- **Captions carry the numbers**, as they do now (`scale 0.97 · 150ms ease-out`). Anything else the stage needs to say is said by the component's own content, not by a caption.
- **Gestures keep their real controls.** A button you press is a button with a label ("Send"). A toast you swipe has a Dismiss control. Nothing on the entry page is a decorative stand-in for a control.
- **Cards stay wireframe.** The same layout and motion as the entry stage, drawn with the `--demo-*` bars and shapes, no text and no icons. The entry page is where the component is named.
- **Shapes match the component.** A toolbar is a pill and its buttons are circles; a primary button is a pill. Square buttons inside a pill read as wrong.
- **Two stages stay abstract.** Spring and Overshoot keep their chip on a track. Their subject is the curve, not a component, and the notification card and the Saved pill tried in pass 3 did not make the motion clearer (owner's call, 2026-10-15; reverted).
- **Every element on a comparison stage says its own rule.** If a stage shows a button that scales beside a toolbar that does not, both carry a caption (`button: scale 0.97` / `toolbar: colour only`). A reader must not have to infer one element's behaviour from the other's caption.

## What does not change

Mechanics, timings, prompts, acceptance lists and code tabs. The verification already done on those stands; a retrofit changes what is on the stage, not what it does. Each retrofit still gets a visual review (both themes, 375px, contrast, no overflow) and the term's e2e run, and a term that is published stays published unless the review finds a regression.

## Order

1. Checkpoint: Press Scale (a "Send" button and a B / I / U / S / link toolbar as the opt-out) and Duration (a tooltip on a toolbar button, a user menu under "Options", a bottom sheet), shown to the owner before anything else is converted.
2. Then the rest, two to four terms per pass, oldest first. Done in four passes (2026-10-14 to 2026-10-15); Spring and Overshoot reverted after the owner's review.

## Rejected

- **Dropping the opt-out row from Press Scale.** The opt-out is the part of the rule most often broken (every button scales). A labelled, recognisable toolbar beside a pressing button teaches it; four unlabeled squares did not.
- **Red and green verdict marks.** They are what Emil uses and they read instantly, but moveset has one accent on purpose. Words and ink marks are enough on a grayscale stage.
