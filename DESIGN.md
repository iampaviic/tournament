---
name: Tournament Manager
description: The wall sheet. A printed draw sheet that fills in as the event is played.
colors:
  wall: '#edf0f4'
  sheet: '#ffffff'
  sheet-fill: '#f3f5f8'
  sheet-edge: '#dde1e8'
  row-rule: '#e8ebf0'
  control-outline: '#c3c9d3'
  printed-line: '#8a93a2'
  print-ink: '#121417'
  ink-muted: '#535b68'
  ink-faint: '#626c7c'
  ballpoint: '#1f49c7'
  ballpoint-pressed: '#173a9e'
  ballpoint-on: '#ffffff'
  ballpoint-tint: '#eef2fd'
  ballpoint-track: '#d7e0f9'
  ballpoint-ink: '#173a9e'
  red-pen: '#c4242a'
  red-pen-tint: '#ffedea'
  red-pen-ink: '#831c1e'
  done-green: '#247b50'
  done-green-tint: '#dcfae5'
  done-green-ink: '#04250e'
  dark-wall: '#0d0e10'
  dark-sheet: '#16181b'
  dark-sheet-fill: '#1e2125'
  dark-sheet-edge: '#272a30'
  dark-row-rule: '#202328'
  dark-control-outline: '#3d424b'
  dark-printed-line: '#6c7480'
  dark-print-ink: '#f1f2f4'
  dark-ink-muted: '#a9afb9'
  dark-ink-faint: '#9097a2'
  dark-ballpoint: '#85a1f4'
  dark-ballpoint-pressed: '#a7bbf7'
  dark-ballpoint-on: '#0d0e10'
  dark-ballpoint-tint: '#19213a'
  dark-ballpoint-track: '#24335f'
  dark-ballpoint-ink: '#b4c6f8'
  dark-red-pen: '#f0696d'
  dark-red-pen-tint: '#2c1a1c'
  dark-red-pen-ink: '#f6a7a9'
  dark-done-green: '#4cc285'
  dark-done-green-tint: '#142a1e'
  dark-done-green-ink: '#8fe0b5'
typography:
  display:
    fontFamily: 'Archivo Variable, Archivo, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: 'clamp(2.75rem, 4.8vw, 4.5rem)'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.03em'
    fontVariation: "'wdth' 72"
  statement:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: 'clamp(1.75rem, 2.9vw, 2.75rem)'
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: '-0.01em'
    fontVariation: "'wdth' 80"
  title:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  section:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.2
  lead:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  name:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 650
    fontVariation: "'wdth' 88"
  label:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 550
    lineHeight: 1.2
  small:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
  code:
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace'
    fontSize: '0.8125rem'
rounded:
  tag: '4px'
  control: '6px'
  sheet: '8px'
  pill: '999px'
spacing:
  gap: '24px'
  pad: '24px'
  control-height: '32px'
  field-height: '40px'
  touch-height: '44px'
  bar-height: '48px'
  content-width: '1152px'
components:
  button:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.print-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 0.85rem'
    height: '{spacing.control-height}'
  button-hover:
    backgroundColor: '{colors.sheet-fill}'
  button-primary:
    backgroundColor: '{colors.ballpoint}'
    textColor: '{colors.ballpoint-on}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 0.85rem'
    height: '{spacing.control-height}'
  button-primary-hover:
    backgroundColor: '{colors.ballpoint-pressed}'
  button-danger:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.red-pen}'
    rounded: '{rounded.control}'
    height: '{spacing.control-height}'
  button-danger-hover:
    backgroundColor: '{colors.red-pen-tint}'
  button-small:
    typography: '{typography.small}'
    padding: '0 0.65rem'
    height: '28px'
  input:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.print-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0.5rem 0.75rem'
    height: '{spacing.field-height}'
  card:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.print-ink}'
    rounded: '{rounded.sheet}'
    padding: '{spacing.pad}'
  badge:
    backgroundColor: '{colors.sheet-fill}'
    textColor: '{colors.ink-muted}'
    typography: '{typography.small}'
    rounded: '{rounded.tag}'
    padding: '0 0.4rem'
    height: '20px'
  badge-accent:
    backgroundColor: '{colors.ballpoint-tint}'
    textColor: '{colors.ballpoint-ink}'
  badge-danger:
    backgroundColor: '{colors.red-pen-tint}'
    textColor: '{colors.red-pen-ink}'
  badge-success:
    backgroundColor: '{colors.done-green-tint}'
    textColor: '{colors.done-green-ink}'
  alert:
    backgroundColor: '{colors.sheet-fill}'
    textColor: '{colors.print-ink}'
    rounded: '{rounded.control}'
    padding: '0.65rem 0.9rem'
  alert-error:
    backgroundColor: '{colors.red-pen-tint}'
    textColor: '{colors.red-pen-ink}'
  alert-success:
    backgroundColor: '{colors.ballpoint-tint}'
    textColor: '{colors.ballpoint-ink}'
  tab:
    textColor: '{colors.ink-muted}'
    typography: '{typography.label}'
    padding: '0.6rem 0'
  tab-active:
    textColor: '{colors.print-ink}'
  match-line:
    textColor: '{colors.print-ink}'
    typography: '{typography.name}'
    padding: '0 0.5rem 0.3rem 0.1rem'
    height: '30px'
  bracket-card:
    rounded: '{rounded.tag}'
    width: '184px'
    height: '60px'
---

# Design System: Tournament Manager

## Overview

**Creative North Star: "The Wall Sheet"**

A tournament is the bracket sheet taped to the venue wall: one printed sheet that fills in as matches are played and that everyone reads the same way. Every screen is white sheet stock laid on a cool wall-grey ground, printed in near-black. Players write in ballpoint blue; the organizer's red pen marks only decisions, disputes and help. Nothing at rest is lifted off the wall; sheets are edged, not shadowed.

The working screens are dense and predictable: a 48px top bar, a 1152px column, underline tabs on one rule, and sheets of rows. The signature, used everywhere a match appears (bracket, match lists, match room, organizer queue, home page), is **names on printed lines**: each player's name sits on its own ruled line with the score at the line's end, the two lines meet in a joint at the right, and the winner's line carries on in 2px ink. Matches are not boxed. The brand mark is the same joint: two lines meeting and a blue line carrying on.

The home page is the same world at poster scale. The joint becomes a giant flat ballpoint field running off the window's right edge, the type condenses further (72% width for display, 80% for statements), and the pictures are the product's own interface fragments. Game flavour lives only in bracket themes (the TETR.IO theme is dark navy with a yellow ink); the site itself stays game-neutral.

**Key Characteristics:**

- White sheets on a cool grey wall, near-black print, flat at rest.
- One hue, ballpoint blue: full strength on small marks, pale tints for areas.
- Red pen for disputes, help and organizer decisions only.
- One variable grotesk (Archivo) with a width axis; names semi-condensed and bold.
- Names on printed lines, joints, and a winner line that carries on in ink.
- Light and dark themes from the same token names via `prefers-color-scheme`.

## Colors

A cool, near-neutral paper palette with one ballpoint blue, a red pen, and a quiet green for things that are done.

### Primary

- **Ballpoint Blue** (`ballpoint`): the players' pen. The primary action, the focus ring, links, the caret, the viewer's own line in a match ("me"), the highlighted path through a bracket, the filled part of a capacity track. In dark mode it lifts to a pale periwinkle (`dark-ballpoint`) with dark text on it.
- **Pressed Ballpoint** (`ballpoint-pressed`): hover state of primary buttons and links.
- **Ballpoint Tint / Track / Ink** (`ballpoint-tint`, `ballpoint-track`, `ballpoint-ink`): the area forms of the pen. Tint fills ready matches in the bracket, accent tags (registration, running, ready, reported) and success alerts; track is the unfilled bar of a progress track and the text selection; ink is the dark blue text on tints.

### Secondary

- **Organizer's Red Pen** (`red-pen`): disputes, help requests, danger buttons, field errors, unmet requirements, and the ringed warning alert. On the bracket, a disputed match has its number circled and its joint redrawn in 2px red.
- **Red Pen Tint / Ink** (`red-pen-tint`, `red-pen-ink`): danger tags and error alerts, dark red ink on a pale red tint.

### Tertiary

- **Done Green** (`done-green`, `done-green-tint`, `done-green-ink`): small confirmations only: the "checked in" and "secure module" tags, the live-connection dot, and met requirements. It never fills an area larger than a tag.

### Neutral

- **The Wall** (`wall`): the page ground behind every sheet.
- **The Sheet** (`sheet`): cards, panels, the bracket canvas, inputs and default buttons.
- **Sheet Fill** (`sheet-fill`): one step off the sheet: button hover, neutral tags, neutral alerts, quiet panels.
- **Sheet Edge** (`sheet-edge`): the 1px border of a sheet and the tab rule.
- **Row Rule** (`row-rule`): rules between rows inside a sheet.
- **Control Outline** (`control-outline`): outlines of inputs and buttons, the off state of switches, the scrollbar thumb.
- **Printed Line** (`printed-line`): the line a name is written on, joints and bracket connectors; input hover border.
- **Print Ink** (`print-ink`): all text, and the 2px winner line.
- **Muted / Faint Ink** (`ink-muted`, `ink-faint`): secondary text, losers' names and scores, placeholders (faint still clears 4.5:1 on the sheet).

### Named Rules

**The One Pen Rule.** Blue is the only hue on working screens. At full strength it goes on small marks only: the one primary action, your own line, the highlighted path, a focus ring. Areas take its tints.

**The Red Pen Rule.** Red appears only where an organizer must decide: disputes, help requests, destructive actions, errors and unmet requirements. Never as decoration or emphasis.

**The Poster Exception.** On the Persuade surface the pen may fill flat colour fields at poster scale (the hero joint, the closing row, the stage clause). This is the same pen drawn large, not a second palette; it does not carry over to working screens.

## Typography

**Display Font:** Archivo Variable (with Archivo, system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Archivo Variable, the same family
**Label/Mono Font:** ui-monospace stack for code and the API reference only

**Character:** One grotesk with a width axis, loaded as the `wdth` variable build. Names are set semi-condensed and bold the way names are written on a draw; everything else is set plain at full width. The home page condenses further for display.

### Hierarchy

- **Display** (800, `clamp(2.75rem, 4.8vw, 4.5rem)`, 0.95, 72% width, -0.03em): home hero headline only, two lines, each rising from behind its own baseline.
- **Statement** (750, `clamp(1.75rem, 2.9vw, 2.75rem)`, 1.15, 80% width, -0.01em): home section statements, the formats index and feature rows.
- **Title** (700, 2rem / 1.5rem under 640px, 1.2, -0.02em): the page h1, e.g. a tournament's name.
- **Section** (600, 1.125rem, 1.2): h2 section headings on working screens.
- **Lead** (400, 1.125rem, 1.5): the one introductory sentence on the home page, max ~34rem.
- **Body** (400, 0.875rem, 1.43): everything on working screens. Fields go to 1rem on coarse pointers so phones don't zoom.
- **Name** (650, 88% width): every player or entrant name, the wordmark, and matches. Winners go to 700, placeholders ("Winner of #3", "Bye") return to 100% width at 400 in muted ink.
- **Label** (550): buttons, tabs, field labels, tags.
- **Small** (0.75rem): hints, errors, tags, toolbar hints. Bracket match numbers sit at 0.6875rem.

### Named Rules

**The Draw Sheet Rule.** Only names are condensed. If it is not a person, a team or the wordmark, it is set at full width.

**The Tabular Score Rule.** Scores, match numbers, tables and anything marked `.num` use tabular figures, right-aligned at the end of their line.

## Layout

A no-sidebar shell: a 48px top bar with the wordmark at the left edge of a 1152px column (plus 1rem side padding), the page title and status under it, then underline tabs on one full-width rule. Content sits in that column with a 24px gap and 24px sheet padding. The bracket canvas is allowed to break wider than the column so the tree has room.

Breakpoints are 640px (`sm`, secondary nav links appear, title steps up from 1.5rem to 2rem) and 900px (`md`, two-column compositions such as the home hero and formats). Controls are 32px tall (28px small) and grow to 44px (36px small) on coarse pointers; fields are 40px.

The bracket is a fixed geometry, not a flowing layout: cards 184px wide and 60px tall (two 30px slots), 36px round headers, 48px between columns, 16px between rows, 48px between the winners and losers sections, and a 36px gutter left of the first column for match numbers. Connectors run from the middle of a card's joint, step at half the column gap, and land on the line of the slot they feed. The view pans and zooms inside an edged sheet with a small toolbar.

The home page is full-bleed where the joint needs to run off the window edge, and returns to the column elsewhere; sections breathe at 4rem (5rem from 900px).

## Elevation & Depth

Flat. Nothing at rest casts a shadow: depth comes from the sheet on the wall (white on cool grey), a 1px sheet edge, and tint steps (`sheet-fill`, ballpoint tint). In dark mode the same steps run from near-black wall to slightly lighter sheets.

The one exception is a layer that opens over other content while it is used: the game picker's list of suggestions. It takes the sheet colour, a control-outline edge and `--shadow-float` (an 8px-offset, 24px-blur shadow at low opacity), and closes as soon as a game is picked or the field loses focus.

### Named Rules

**The Taped Sheet Rule.** A sheet is edged, never shadowed. If something needs to read as separate, give it the sheet colour and a 1px edge on the wall, or a tint step inside a sheet.

## Shapes

Gently rounded and few: 8px for sheets, panels and the bracket frame; 6px for buttons, inputs and alerts; 4px for tags, score cells and bracket cards. Fully round forms are reserved for things that are round in the world: progress tracks and switches (999px), avatars, status dots, and the red circle around a disputed match number.

Lines are the main geometry: 1px printed lines under names, 1px joints at the right edge of a match, 2px ink for a winner, 2px blue for your own line, 2px red for a dispute. Icons are outline strokes on a 16px grid at 1.5px with round caps and joins, inline SVG.

## Components

### Buttons

Plain and exact under the hand.

- **Shape:** gently rounded (6px), 1px outline in `control-outline`, 32px tall with 0.85rem side padding.
- **Default:** sheet background with print ink; hover steps to `sheet-fill`.
- **Primary:** ballpoint fill and outline with white text; hover to `ballpoint-pressed`. One per view.
- **Danger:** red-pen text with an outline mixed 40% red into the control outline; hover fills with red-pen tint.
- **Small:** 28px tall, 0.65rem padding, small type.
- **Press / Focus:** presses sink 1px (140ms, ease-out); focus is a 2px ballpoint outline offset 2px. Disabled is 50% opacity.

### Tags (badges)

- **Style:** 20px tall, 4px radius, small type at 550, a pale tint with dark ink of the same hue.
- **Tones:** neutral (sheet fill, muted ink) for draft, completed and waiting; accent for registration, check-in, running, ready and reported; danger for disputed and help; success for checked in and secure.

### Cards / Containers

- **Corner Style:** 8px.
- **Background:** the sheet.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px sheet edge.
- **Internal Padding:** 24px; lists inside a sheet divide rows with the row rule.

### Inputs / Fields

- **Style:** sheet background, 1px control outline, 6px radius, 40px tall, 0.5rem by 0.75rem padding. Labels above at 550, hints and errors below in small type.
- **Hover / Focus:** hover darkens the outline to the printed line; focus turns it ballpoint with a 2px ballpoint outline inset 1px.
- **Error:** message in red pen beneath the field. Checkboxes and radios take the ballpoint accent colour at 1rem.

### Alerts

A message inside the block it concerns, 6px radius. Neutral on sheet fill; error in red-pen ink on red tint; success in ballpoint ink on ballpoint tint; warning ringed in red on the sheet, not filled, so it reads apart from an error.

### Navigation

The top bar: the mark and wordmark (name type, 0.9375rem, 700) on the left, bold muted links on the right that darken on hover and hide under 640px, plus the account and sign-in button. Page tabs are underline tabs on the sheet-edge rule: muted 550 text, the current tab in print ink with a 2px ballpoint underline. Tabs scroll sideways rather than wrap.

### Match Lines (signature)

Every match, anywhere, is two names on printed lines. Each line is at least 30px (44px at the room's large size), name left, score right in tabular figures. The joint is a 1px vertical at the right edge of the lower half, and a short stub carries on from it; once decided the stub becomes 2px print ink. The winner's line is 2px ink with the name and score at 700; the loser's name and score go muted; the viewer's own line is 2px ballpoint with the name in ballpoint. In the score form the score is a 4px-radius cell at the end of each line.

### Bracket

The match lines arranged as a tree on the sheet. Ready matches take the ballpoint tint; the hovered or signed-in participant's path is drawn in ballpoint; connectors that carry a decided winner are in ink. Match numbers sit in the gutter 4px left of the card, level with the first name; a disputed match has its number circled in red and its joint redrawn in 2px red. Bracket themes recolour only the bracket through their own tokens (background, card, border, text, muted, line, ink, ready, highlight, font); `default` maps them to the site's tokens.

### Motion

Quick and exact under the hand (press 140ms, hover 180ms, UI 240ms, ease-out `cubic-bezier(0.22, 1, 0.36, 1)`), slower only for things arriving: on the home page, sections reveal once on scroll (rise 24px, or settle from 0.96 scale, or a colour field opening upward from its foot), the headline lines rise from behind their baselines, and the giant joint draws from its arms to the carried line. Reduced motion collapses every transition and animation to 1ms.

## Do's and Don'ts

### Do:

- **Do** set every match as two names on printed lines with the score at the line's end, a joint at the right, and the winner's line carrying on in 2px ink.
- **Do** keep ballpoint blue at full strength for small marks (one primary action per view, your own line, the highlighted path, focus) and use its tints (`ballpoint-tint`, `ballpoint-track`) for areas.
- **Do** reserve the red pen for disputes, help, destructive actions, errors and unmet requirements.
- **Do** lay sheets on the wall with a 1px sheet edge and 8px corners; separate rows with the row rule.
- **Do** set player names at 88% width and 650 weight, and keep everything else at full width.
- **Do** use tabular figures for every score, number and table.
- **Do** keep game flavour inside bracket themes and their participant labels.
- **Do** give controls 44px on coarse pointers and set fields to 1rem there.

### Don't:

- **Don't** put a shadow on anything at rest; only a layer that opens over content while in use (the game picker's suggestions) takes `--shadow-float`.
- **Don't** box a match or a name; the printed line is the container.
- **Don't** introduce a second accent hue on working screens, or use green beyond tags, dots and met-requirement marks.
- **Don't** condense or embolden text that is not a name.
- **Don't** bring a game's colours, ranks or uppercase styling into the site's own chrome; that belongs to the theme.
- **Don't** invent photographs, logos, testimonials or user counts as imagery; pictures are the product's own interface fragments.
