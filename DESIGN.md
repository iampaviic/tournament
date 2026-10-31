---
name: Tournament Manager
description: The select screen. A fighting game's select and versus screens on a deep indigo stage, where every decided match is taken by the winner's side colour.
colors:
  stage: '#0f0b22'
  panel: '#1a1535'
  panel-raised: '#221c45'
  panel-edge: '#2e2858'
  row-rule: '#262050'
  control-outline: '#6a62b4'
  joint-line: '#7d75bb'
  ink: '#f6f3ff'
  ink-muted: '#bdb6dd'
  ink-faint: '#9d96c6'
  link-cyan: '#6fd0ff'
  focus-gold: '#ffd23f'
  winner-gold: '#ffd23f'
  winner-gold-hover: '#ffe07a'
  on-gold: '#1d1500'
  gold-soft: '#2b2350'
  gold-track: '#342c66'
  gold-ink: '#ffe07a'
  gold-display: '#ffd23f'
  p1-red-orange: '#ff5a2c'
  p2-blue: '#25b9ff'
  on-side: '#140a24'
  open-violet: '#b18cff'
  on-violet: '#140a24'
  decision-pink: '#ff4d82'
  decision-pink-soft: '#3a1533'
  decision-pink-ink: '#ffa6c2'
  done-green: '#34e08b'
  done-green-soft: '#133229'
  done-green-ink: '#8ef0bf'
  light-stage: '#f2f0fa'
  light-panel: '#ffffff'
  light-panel-raised: '#f6f4fd'
  light-panel-edge: '#dfdbf0'
  light-row-rule: '#ebe8f6'
  light-control-outline: '#8f87bb'
  light-joint-line: '#8d86b3'
  light-ink: '#160d2b'
  light-ink-muted: '#514873'
  light-ink-faint: '#675f8c'
  light-link: '#0b6aa6'
  light-focus: '#160d2b'
  light-winner-gold: '#ffc61a'
  light-winner-gold-hover: '#ffd34d'
  light-gold-soft: '#fff4cc'
  light-gold-track: '#ece8f8'
  light-gold-ink: '#6b4d00'
  light-gold-display: '#a87000'
  light-p1: '#cc3a10'
  light-p2: '#0a72b0'
  light-on-side: '#ffffff'
  light-open-violet: '#6a45d1'
  light-on-violet: '#ffffff'
  light-decision-pink: '#c80f4a'
  light-decision-pink-soft: '#ffe6ee'
  light-decision-pink-ink: '#85072f'
  light-done-green: '#11804a'
  light-done-green-soft: '#ddf7e8'
  light-done-green-ink: '#0a4a2b'
  tile-1: '#ffb0dc'
  tile-2: '#a8e03a'
  tile-3: '#93f0dd'
  tile-4: '#b964f2'
  tile-5: '#ff6ec7'
  tile-6: '#e3f88a'
  tile-7: '#1ec9a7'
  tile-8: '#e6c2ff'
typography:
  display:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: 'clamp(2.75rem, 5vw, 4.5rem)'
    fontWeight: 400
    lineHeight: 1.04
  statement:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: 'clamp(1.75rem, 3vw, 2.75rem)'
    fontWeight: 400
  headline:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 400
    lineHeight: 1.12
  title:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 400
    lineHeight: 1.12
  versus-name:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: 'clamp(1.5rem, 4.2vw, 2.75rem)'
    fontWeight: 400
    lineHeight: 1.05
  versus-score:
    fontFamily: 'Dela Gothic One, Onest Variable, system-ui, sans-serif'
    fontSize: 'clamp(2rem, 6vw, 3.75rem)'
    fontWeight: 400
    lineHeight: 1
    fontFeature: 'tnum'
  subhead:
    fontFamily: 'Onest Variable, Onest, system-ui, sans-serif'
    fontSize: '1.0625rem'
    fontWeight: 650
    lineHeight: 1.2
  lead:
    fontFamily: 'Onest Variable, Onest, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
  body:
    fontFamily: 'Onest Variable, Onest, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: 'Onest Variable, Onest, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 650
    lineHeight: 1
  tag:
    fontFamily: 'Onest Variable, Onest, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.08em'
  code:
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace'
    fontSize: '0.8125rem'
rounded:
  panel: '12px'
  control: '6px'
  tag: '4px'
  track: '999px'
spacing:
  gap: '24px'
  pad: '24px'
  control-height: '34px'
  field-height: '42px'
  content-width: '1152px'
components:
  button:
    backgroundColor: '{colors.panel-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0 0.9rem'
    height: '{spacing.control-height}'
  button-hover:
    backgroundColor: '{colors.panel-edge}'
  button-primary:
    backgroundColor: '{colors.winner-gold}'
    textColor: '{colors.on-gold}'
    typography: '{typography.title}'
    rounded: '{rounded.control}'
    padding: '0 0.9rem'
    height: '{spacing.control-height}'
  button-primary-hover:
    backgroundColor: '{colors.winner-gold-hover}'
  button-danger:
    backgroundColor: '{colors.panel-raised}'
    textColor: '{colors.decision-pink}'
    rounded: '{rounded.control}'
  button-danger-hover:
    backgroundColor: '{colors.decision-pink-soft}'
  button-small:
    typography: '{typography.label}'
    padding: '0 0.7rem'
    height: '28px'
  input:
    backgroundColor: '{colors.stage}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0.5rem 0.75rem'
    height: '{spacing.field-height}'
  card:
    backgroundColor: '{colors.panel}'
    rounded: '{rounded.panel}'
    padding: '{spacing.pad}'
  chip:
    textColor: '{colors.ink-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.tag}'
    padding: '0 0.55rem'
    height: '22px'
  chip-play:
    backgroundColor: '{colors.open-violet}'
    textColor: '{colors.on-violet}'
  chip-success:
    backgroundColor: '{colors.done-green}'
    textColor: '{colors.on-side}'
  chip-danger:
    textColor: '{colors.decision-pink}'
  alert-error:
    backgroundColor: '{colors.decision-pink-soft}'
    textColor: '{colors.decision-pink-ink}'
    rounded: '{rounded.control}'
    padding: '0.65rem 0.9rem'
  alert-success:
    backgroundColor: '{colors.done-green-soft}'
    textColor: '{colors.done-green-ink}'
    rounded: '{rounded.control}'
    padding: '0.65rem 0.9rem'
  versus-side-p1:
    backgroundColor: '{colors.p1-red-orange}'
    textColor: '{colors.on-side}'
    typography: '{typography.versus-name}'
  versus-side-p2:
    backgroundColor: '{colors.p2-blue}'
    textColor: '{colors.on-side}'
    typography: '{typography.versus-name}'
  match-plate:
    backgroundColor: '{colors.panel-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    height: '32px'
  match-slot-winner-p1:
    backgroundColor: '{colors.p1-red-orange}'
    textColor: '{colors.on-side}'
  match-slot-winner-p2:
    backgroundColor: '{colors.p2-blue}'
    textColor: '{colors.on-side}'
  you-tag:
    backgroundColor: '{colors.winner-gold}'
    textColor: '{colors.on-gold}'
    typography: '{typography.tag}'
    rounded: '{rounded.tag}'
---

# Design System: Tournament Manager

## Overview

**Creative North Star: "The Select Screen"**

Every match is a main event. The world is a fighting game's character-select and versus screens set on a deep indigo stage: player one in hot red-orange on the left, player two in electric blue on the right, a gold VS in the slanted cut between them. It is held to a working product. The shell, tabs, tables, forms and lists are ordinary and predictable; what the game lends is type, palette, density and one signature move, **the winner takes the plate**: once a match is decided the winner's slot fills with its side colour and the loser's drains to a shadow of it. That move is the same on the versus plate, the next-match plate, list rows, the organizer's queue and every bracket node.

Dark is the default look. A fully designed light look (a pale violet ground, white panels, deeper side colours, ink-coloured focus) sits behind the switch in the footer and is applied before first paint from the browser's stored choice. Both looks share every rule here; only the values change, and every text pair is tested to 4.5:1 in both. Players' pages peak where something happens (a result arriving, a podium, a registration locking in). Organizer screens wear the same tokens and plates, calmer: list plates instead of versus plates and no entrance or result motion.

The world refuses the category's two defaults: the near-black esports dashboard with one neon and angled panels everywhere, and the white SaaS card grid. Diagonals appear only where two sides meet or where a state is tagged, never as panel decoration.

**Key Characteristics:**

- A deep indigo stage with violet-tinted, edged panels; no shadows at rest.
- Two side colours (P1 red-orange, P2 blue) that mean the two sides of a match and nothing else.
- Gold as the one primary action, the focus ring in the dark look, the viewer's "You", and the winner.
- Dela Gothic One for titles, names and scores; Onest for everything read.
- State as slanted chips at a -10deg skew: violet open, green done, pink-red disputed or decided by an organizer.
- Players without a picture get a character tile from an eight-colour palette that never collides with side, state or winner colours.

## Colors

A saturated arcade palette on an indigo stage, where every hue has exactly one job.

### Primary

- **Winner Gold** (`winner-gold`): the primary action's slanted plate, the "You" tag and frame, the champion's podium step, the active tab's underline, capacity bar fills, the VS, checkbox and radio accents, and selection tint. In the dark look it is also the focus ring (`focus-gold`) and the caret. Text on gold is always **On Gold** (`on-gold`), a near-black brown. Hover lifts to `winner-gold-hover`. In the light look gold deepens to `light-winner-gold`, and focus becomes ink (`light-focus`) because gold cannot ring on white.
- **Gold Ink** (`gold-ink`): gold as text, for the viewer's own name in a list plate and hovered podium names. In the light look it becomes a dark ochre (`light-gold-ink`).
- **Display Gold** (`gold-display`): gold set large as text, the second line of the home headline. Light look: `light-gold-display`.

### Secondary

- **Player One Red-Orange** (`p1-red-orange`) and **Player Two Blue** (`p2-blue`): the two sides of a match. They fill a versus side, colour the slanted tick at the head of each slot, fill a decided winner's slot, and frame a select-screen tile as a P1 or P2 cursor. Text on them is **On Side** (`on-side`), near-black in the dark look and white in the light look, where the side colours deepen to `light-p1` and `light-p2`.

### Tertiary

- **Open Violet** (`open-violet`): open to play. A match that is ready or reported, and a tournament in registration, check-in or running, carry a violet chip. Text on it is `on-violet`.
- **Done Green** (`done-green`): done. Completed matches and tournaments, checked-in participants, the locked registration chip, met requirements, the live dot. `done-green-soft` and `done-green-ink` carry success alerts.
- **Decision Pink** (`decision-pink`): disputes and organizer decisions. A disputed plate is ringed in it, help requests and organizer chat messages are chipped in it, destructive buttons are drawn in it, unmet requirements and field errors are set in it. `decision-pink-soft` and `decision-pink-ink` carry error alerts; a caution alert is ringed in it on a plain panel.
- **Link Cyan** (`link-cyan`): inline links only (`light-link` in the light look).

### Neutral

- **The Stage** (`stage`): page ground, and the field background of inputs.
- **Panel** (`panel`): cards, the versus plate's base, chat and result panels.
- **Raised Panel** (`panel-raised`): buttons, list-plate fills, an open versus slot, quiet panels and the third podium step.
- **Panel Edge** (`panel-edge`): every panel's 1px edge, header and footer rules, tab rule, and the default button's hover fill.
- **Row Rule** (`row-rule`): rules between rows inside a list.
- **Control Outline** (`control-outline`): button and input outlines at 3:1 on a panel, outlined chips, dashed open roster places, unreached bracket connectors and the scrollbar.
- **Joint Line** (`joint-line`): the hovered outline of a button or field.
- **Ink** (`ink`), **Muted Ink** (`ink-muted`), **Faint Ink** (`ink-faint`): text, secondary text, and placeholders (still 4.5:1 on a panel).

### Character Tiles

Eight tile colours (`tile-1` to `tile-8`), four families (pink, lime, teal, lilac) in a light and a deep step. A player without a picture gets one, picked from the sum of their name's character codes modulo eight; the initial is set on it in the display face in `on-gold`. The same values serve both looks.

### Named Rules

**The Two Sides Rule.** Red-orange and blue mean player one and player two of a match, nothing else. A slot no player has reached yet carries no side colour; it sits on `panel-raised` in muted ink. The mark and favicon are the one sanctioned exception: two slanted side panels are the versus screen in miniature.

**The Gold Is Earned Rule.** Gold marks the one primary action, focus in the dark look, the viewer, and the winner. A state chip is never gold: state is violet, green, pink-red or outlined.

**The Tile Neutrality Rule.** Character tiles never use a side, state or winner colour, so a tile never reads as P1, P2, a state or the champion, and the gold "You" frame shows on every tile.

**The Tested Pair Rule.** Every text colour ships only on backgrounds it is tested against at 4.5:1 in both looks: ink, muted ink and link on stage, panel and raised panel; pink and green on panels; each soft/ink pair; on-gold on gold and gold hover; on-side on both side colours and on green; on-violet on violet; faint ink on panel. A new pairing joins that list before it ships.

## Typography

**Display Font:** Dela Gothic One (with Onest Variable, system-ui)
**Body Font:** Onest Variable (with Onest, system-ui, -apple-system, Segoe UI)
**Mono Font:** ui-monospace, SF Mono, Menlo, Consolas (code only, 0.8125rem)

**Character:** a heavy, round arcade display face for whatever you look for first (titles, names on a plate, scores, ranks, the VS) against a quiet, legible grotesque for everything read and operated.

### Hierarchy

- **Display** (400, clamp(2.75rem, 5vw, 4.5rem), 1.04): the home headline only.
- **Statement** (400, clamp(1.75rem, 3vw, 2.75rem)): home section heads and the closing panel.
- **Headline** (400, 2.25rem, 1.12; 1.625rem under 640px): page titles (`h1`) and the match room's title. A tournament's name over its art runs clamp(2rem, 4vw, 2.75rem).
- **Title** (400, 1.25rem, 1.12): section heads (`h2`), the large list plate's names and scores.
- **Versus name and score** (400, clamp(1.5rem, 4.2vw, 2.75rem) and clamp(2rem, 6vw, 3.75rem)): the two names and scores on a versus plate; the medium plate steps down to clamp(1.25rem, 3vw, 2rem) and clamp(1.5rem, 4vw, 2.5rem).
- **Subhead** (650, 1.0625rem, 1.2): `h3` panel heads, in Onest.
- **Lead** (400, 1.125rem): the home page's lead sentences.
- **Body** (400, 0.9375rem, 1.43): everything read; descriptions cap at 65ch. A player's or entrant's name in a row is bold (700) so it is found first.
- **Label** (650, 0.8125rem): chip labels, hints, small buttons, bracket round heads.
- **Tag** (700, 0.75rem, 0.08em tracking): the P1/P2 and You tags and tile cursors.

### Named Rules

**The One Weight Rule.** Dela Gothic One has one weight. It is always set at 400, never bolded, and never synthesised.

**The Display For Finding Rule.** The display face carries titles, names on plates, scores, ranks and the wordmark. Running text, labels, controls (other than the gold primary plate) and table cells stay in Onest. Scores are tabular in both faces.

## Layout

A centred column of 1152px plus 1rem gutters (`.container`). Two breakpoints: 640px (`sm`) and 900px (`md`). The shell is a 56px bar on the stage under a panel-edge rule, with the mark and wordmark on the left and text navigation on the right (nav links collapse below 640px, leaving the account and actions); main content grows so a short page's footer sits at the window's foot; the footer holds the wordmark, a sentence, links and the theme switch.

Tournament pages open with the organization, the tournament name in the display face, its status chip, start time and game, then underline tabs on a full-width rule. The game's art sits behind the title, right-aligned, at 38% opacity, masked to transparent towards the left and the foot; it is hidden under 640px. The overview runs 2fr / 1fr from 900px with registration in the side column; the match room runs 3fr / 2fr (versus plate and result left, chat right). Blocks start on a 1px rule with 0.75rem above their heading. Gaps and panel padding are 24px; list rows are at least 44px; controls are 34px (44px on coarse pointers) and fields 42px.

The home page alternates asymmetric 5fr/7fr and 4fr/8fr splits and one full-bleed band.

## Elevation & Depth

Flat and edged. Panels sit on the stage with a 1px `panel-edge` border and no shadow (`--shadow: none` in both looks). Depth comes from three tonal steps (stage, panel, raised panel) and from colour taking a slot. Rings are used for meaning, not lift: the viewer's slot is inset-ringed 2px gold, a disputed plate is ringed 1px pink-red outside its border, a select-screen cursor is a 3px outline offset 2px.

### Shadow Vocabulary

- **Float** (`box-shadow: 0 12px 32px rgb(4 2 14 / 60%), 0 2px 6px rgb(4 2 14 / 40%)` dark; `0 12px 32px rgb(22 13 43 / 14%), 0 2px 6px rgb(22 13 43 / 8%)` light): only for something floating over the page.

### Named Rules

**The Edged Panel Rule.** A panel is edged, never shadowed at rest.

## Shapes

Three radii: panels 12px, controls and plates 6px, tags and chips 4px; tracks and the live dot are fully round. The one slant is -10deg (`--slant`): the gold primary plate, every state chip and the side ticks at the head of a slot are skewed by it while their labels stay upright. The versus plate's cut is a clip-path diagonal (32px wide, 36px on the medium plate from 900px, 48px on the large one) where the two sides meet. Round pips are 0.75rem squares rotated 45deg. Open roster places are dashed 2px outlines. Avatars round at 22% of their size.

### Named Rules

**The Cut Where Sides Meet Rule.** Diagonals mark where two sides meet (the versus cut, the mark) or tag a state (chips, the primary plate, side ticks). Panels, sections and images are never angled.

## Components

### Buttons

Tactile and exact: a 1px press on `:active`, 120ms colour changes.

- **Shape:** gently rounded (6px), 34px tall, 0 0.9rem padding, Onest 600.
- **Default:** raised panel fill, control outline, ink text; hover fills with the panel edge and strengthens the outline to the joint line.
- **Primary:** one per view. A gold plate skewed -10deg behind an upright label set in the display face in on-gold; hover lightens the plate to gold hover; disabled turns the plate to control outline.
- **Danger:** pink-red text and an outline mixed 55% pink-red; hover fills pink-soft.
- **Small:** 28px, 0.7rem padding, label size. On coarse pointers buttons grow to 44px (small to 36px).
- **On a gold field:** the home closing panel inverts it, an on-gold plate with gold display text.

### Chips

- **Style:** 22px tall, label type, a -10deg skewed shape behind an upright label. Neutral is an outlined 1.5px control ring with muted text (draft, roles, labels such as "Example").
- **Tones:** play (violet fill, on-violet), success (green fill, on-side), danger (1.5px pink-red ring, pink-red text). Match progress maps waiting, bye and skipped to neutral; ready and reported to play; disputed to danger; completed to success. Tournament status maps draft to neutral; registration, check-in and running to play; completed to success.

### Cards / Containers

- **Corner Style:** 12px.
- **Background:** panel on the stage.
- **Shadow Strategy:** none; see Elevation.
- **Border:** 1px panel edge.
- **Internal Padding:** 24px.

### Inputs / Fields

- **Style:** 42px, stage-coloured field inside a panel, 1px control outline, 6px radius, faint-ink placeholder; 16px text on coarse pointers so phones do not zoom.
- **Focus:** a 2px focus ring inset by 1px and the border in the focus colour (gold dark, ink light). Hover strengthens the outline to the joint line.
- **Error:** a small pink-red line under the field; alerts sit inside the block they concern (error pink-soft, success green-soft, caution ringed in pink-red on a plain panel).

### Navigation

- **Bar:** 56px, wordmark in the display face beside the mark, links in Onest 600 muted ink turning ink on hover.
- **Tabs:** underline tabs on a full-width panel-edge rule; muted links, the current one in ink with a 3px gold underline; scrolls sideways without a scrollbar on narrow screens.

### Versus Plate (signature)

Two sides meeting at a slanted cut: P1 fills the left, P2 the right, each with a P1/P2 tag (16% of its own ink), the name in the display face, the score in the display face at the outer top, and round pips beneath (one per game the leader has won, lit for each side's wins; half lit and without numbers while reported but undecided). The gold VS, stroked 4px in on-gold, sits in the cut and fades once decided. The viewer's side carries a gold "You" tag. **The winner takes the plate:** the winner's side widens to 1.5 shares and a gold knockout banner crosses the whole plate ("Name wins", display face, uppercase, edged top and bottom in on-gold, with the decided plate grown to 200px, 256px from 900px, so it sits between scores and names); the loser drains to 22% of its colour on the panel in muted ink. An unreached side is a raised panel in muted Onest. Sizes: large (168px, 210px from 900px) in the match room and on the home page; medium (128px, 148px) for the next-match plate.

### List Plate (signature)

The same match in a row: two 32px slots (48px with display-face names at the large size) on a raised panel with a 6px radius, P1 over P2, each headed by its -10deg side tick. Decided: the winner's slot fills with its side colour in on-side; the loser's text mutes. The viewer's slot is inset-ringed 2px gold and its name set in gold ink. A dispute rings the plate pink-red. The score-entry version keeps the plate and puts a 32px score field at the slot's end.

### Bracket Plates

Each bracket node is a list plate drawn by the bracket theme: two slots with 3px side ticks, the winner's slot filled with the theme's `p1`/`p2` colours (falling back to the connector ink) and text in `onSide`, a ready match backed by `gold-soft` with the line colour as its border, a dispute ringed pink-red with its match number on a pink-red chip. Connectors run 1.5px in the control outline; the line a winner carries on is 2px in muted ink; a hovered participant's path is 2px gold ink. Themes may omit `p1`, `p2` and `onSide`.

### Roster (signature)

Registration as a character-select grid of tiles (6.5rem minimum, 7.75rem from 640px, 1:1.08, 6px radius): picture or a character tile with the initial, the name on a stage-coloured strip. Cursor frames are 3px outlines offset 2px in P1, P2 or gold for the viewer, labelled by a tag in the corner; a final rank sits top-left on a stage tag in the display face. Open places are drawn as dashed tiles, up to six, then counted in one dashed tile.

### Podium

Second, first and third standing as steps that rise in order once on load; avatars 64px for the champion and 48px beside. The champion's step is gold (7rem) with the rank in the display face; third is a raised panel outlined in control.

### Live Status

A muted label with a dot: control-coloured while connecting or off, green with a spreading ring while live.

### Motion

Quick under the hand, slower only for things arriving: press 140ms, hover 180ms, UI 240ms, reveal 800ms. Easings: out `cubic-bezier(0.22, 1, 0.36, 1)`, expo `cubic-bezier(0.16, 1, 0.3, 1)`, in-out `cubic-bezier(0.76, 0, 0.24, 1)`, and slam `cubic-bezier(0.2, 0.9, 0.3, 1.25)` for things landing (the VS, the knockout banner, the registration lock). A result arriving live surges the winner's side and slams the banner down once; a page opened on a decided match shows it already taken. All motion collapses under reduced motion.

## Do's and Don'ts

### Do:

- **Do** draw every match as two slots, player one then player two, and fill the winner's slot with its side colour once decided while the loser's drains.
- **Do** keep exactly one gold primary plate per view, label upright on a -10deg plate.
- **Do** set titles, names on plates, scores and ranks in Dela Gothic One at 400, and everything read in Onest.
- **Do** mark state with a slanted chip toned by the shared progress and status maps: violet open, green done, pink-red disputed, outlined otherwise.
- **Do** edge panels with a 1px panel-edge border on the stage and leave them unshadowed.
- **Do** give organizer screens the same tokens and plates with list plates in place of versus plates and no entrance or result motion.
- **Do** test every new text-on-colour pair at 4.5:1 in both looks before shipping it.
- **Do** draw open places and unreached slots instead of leaving them out.

### Don't:

- **Don't** use red-orange or blue for anything but a match's two sides (the mark, the favicon and the error page's status digits, which echo the mark, excepted).
- **Don't** put gold on a state chip, or use side, state or winner colours for a character tile.
- **Don't** bold Dela Gothic One or set running text, labels or table cells in it.
- **Don't** angle panels, sections or images; diagonals belong to the cut between sides and to state tags.
- **Don't** add shadows to panels at rest.
- **Don't** let character peak anywhere a result, a final or a champion is not arriving, and never let it hide state or slow a task.
- **Don't** borrow any single game's art, logo or style into the site's chrome; game art appears only as a tournament's own image, faded behind its title.
