# Design system (from the canvas)

The CSS is generated from the canvas and already exact: `design/build/css/style.css` (99 shared rules) + `page-<board>.css`. This page explains it; it does not replace it. Never retype values from here into CSS — copy the files.

## Colour
| Token | Hex | Use |
|---|---|---|
| Bone (ground) | `#ECE7DE` | page background, header (94% with blur) |
| Paper (panels) | `#F5F2EC` | buy box, bag summary, inputs |
| Ink | `#0B0B0C` | text, primary buttons, filled pips |
| Text 2 | `#3E3B35` | body copy |
| Text 3 | `#615D55` | eyebrows, meta |
| Line | `#CFC7B8` | hairlines, borders |
| Control border | `#8A8274` | chips, inputs |
| Stand-in slot | `#D9D3C8` | bone photo slots, disabled button |
| Black | `#000000` | announcement, next-drop band, footer, black photo slots |
| On black | `#F5F5F7` · `#D2D2DA` · `#A8A8B4` · lines `#34343C` `#26262C` | text and lines on black |
| Style yellow | `#F0E81C` | the only accent on black (drop code, pips on black) |
| Rule gradient | `#00E5F0 → #E600F0 55% → #F0E81C` | 1 px rules, link underline on hover, h2 underline |

## Type
Montserrat 300/400/500 (display, names, labels; uppercase with wide tracking) and Nunito Sans (body, variable, italic). Key classes: `.s-disp` (300, uppercase, 0.16em), `.s-h2` (clamp(15px,1.3vw,19px), 0.38em, gradient underline), `.s-eb` eyebrow (12px/500/0.34em, `#615D55`), `.s-name` (uppercase 0.2em), `.s-price` (tabular numbers, 0.08em).

## Layout
`.s-wrap`: max 1440, gutters 20 / 40 (≥768) / 112 (≥1280). `.s-sec`: 56 / 80 / 104 px block padding. Breakpoints used by the boards: 600, 768, 900, 1020, 1024, 1280.

## Components (classes in style.css)
Buttons `.s-btn` (+ `-p` primary ink, `-o` outline with fill-on-hover, `-l`/`-lo` on black, `-sm`), chips `.s-chip` (pressed/selected = ink, `.out` = dashed + line-through), tags `.s-tag`, icon buttons `.s-ib` + `.s-count`, edition meter `.s-ed` + `.s-pip` (`.on`, dashed for upcoming, yellow inside `.s-y`, light inside `.s-dark`/`.s-onimg`), cards `.s-card` (slow image zoom on hover), links `.s-lnk` (gradient underline grows) and `.s-ul`, inputs `.s-in` (pill on black), labels `.s-lbl`, visually hidden `.s-vh`, skip link `.s-skip`, phone menu `.s-pop`, bag drawer `.s-drawer`, countdown `.s-cd`.

## Motion
`--s-ease: cubic-bezier(0.23,1,0.32,1)`, `--s-drawer: cubic-bezier(0.32,0.72,0,1)`. Scroll reveals are CSS only (`.s-rv`, `.s-stg` with `animation-timeline: view()`), the next-drop artwork drifts (`.s-drift`), the menu and drawer enter with `@starting-style`. All off under `prefers-reduced-motion: reduce`. No JS animation libraries.

## Header logo
The wordmark is set in type ("NEVMA | STYLE") until NEVMA supplies a one-colour dark logo (OPEN-QUESTIONS). The footer uses `nevma-wordmark-white.png`.
