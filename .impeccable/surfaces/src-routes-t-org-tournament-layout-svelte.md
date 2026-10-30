---
version: 1
slug: "src-routes-t-org-tournament-layout-svelte"
primary_target: "src/routes/t/[org]/[tournament]/+layout.svelte"
related_targets: ["src/routes/+layout.svelte","src/lib/styles/global.scss"]
---

# Tournament pages and the app shell

Scope: the whole app's shell and every working screen. That covers public tournament pages (overview, bracket, matches, match room), organization pages, the dashboard, settings, the tournament and organization admin, and the API reference. Mode: Operate. The API reference is Read, and the home page gets its own Persuade surface inside this world.

Audience and job: players first. They find their next match, follow the live bracket and report scores, often on a phone at the venue. Organizers run the event from the match queue on a laptop. Proof and content: only real tournament data; nothing invented.

Constraints: SvelteKit + SCSS, standard web controls, English with longer translations in mind, light and dark, keyboard and screen reader use, existing routes, forms and e2e selectors keep working.

Composition from Taste Skill's app sheet: style `accent-ladder` (seed 153494390), shell `no-sidebar` taken by name from the library after one shell redraw, because the public pages have three or four destinations and the bracket needs the width a sidebar would take.

## Direction contract

THESIS: A tournament is the bracket sheet taped to the venue wall: one printed sheet that fills in as matches are played and that everyone reads the same way. The screens refuse the category's dark esports dashboard and the white SaaS card grid.

OWN-WORLD: White sheet stock on a cool wall-grey ground, printed in near-black. Players' writing is ballpoint blue: the one hue, at full strength only on small marks (the primary action, your own line, a reported score), with pale blue tints for areas. Organizer red pen marks only decisions, disputes and help. One grotesk family with a width axis: names semi-condensed and bold, everything else plain.

STORY: A visitor understands the state of the event at a glance from the sheet. A player finds their own line in blue, sees whom they play next and where the winner goes, opens the match room and reports. An organizer reads the same sheet plus a desk queue of what needs their pen.

FIRST VIEWPORT: A 48px top bar on the ground, with the wordmark on the 1152px column's left edge. Under it, the tournament's name, status and the Overview / Bracket / Matches tabs on one rule. For a signed-in player, the next-match strip comes first: the two names on printed lines, the match number, a fixed status cell and "Open match room" as the one primary. Then the bracket sheet fills the rest of the column.

FORM: The wall sheet, #1 on my ordered list, chosen by the user over the dealt direction (the event credential). seed:aade31ba98cc44dd

SIGNATURE: Names on printed lines. Every match anywhere (bracket, lists, room, queue) sets each player's name on its own ruled line with the score at the line's end; the winner's line continues in 2px ink to where it leads. Nothing is boxed.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
