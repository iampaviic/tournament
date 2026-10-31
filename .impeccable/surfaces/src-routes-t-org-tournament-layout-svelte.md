---
version: 1
slug: "src-routes-t-org-tournament-layout-svelte"
primary_target: "src/routes/t/[org]/[tournament]/+layout.svelte"
related_targets: ["src/routes/+layout.svelte","src/lib/styles/global.scss"]
---

# Tournament pages and the app shell

Scope: the whole app's shell and every working screen. That covers public tournament pages (overview, bracket, matches, match room), organization pages, profiles, the dashboard, settings, the tournament and organization admin, and the API reference. Mode: Operate. The API reference is Read, and the home page gets its own Persuade surface inside this world.

Audience and job: players first. They find their next match, follow the live bracket and report scores, often on a phone at the venue or beside the game at night. Organizers run the event from the match queue on a laptop, on calmer screens. Proof and content: only real tournament data; nothing invented.

Constraints: SvelteKit + SCSS, standard web controls, English with longer translations in mind, dark by default with a light look behind a theme switch, keyboard and screen reader use, existing routes, forms and e2e selectors keep working.

## Direction contract

THESIS: The event as a fighting game's select and versus screens, held to a working product: a standard shell, tabs, tables and forms, taking only type, palette, density and one signature move from the game. It refuses the esports dashboard of neon on black and the white SaaS card grid.

OWN-WORLD: Dark default: a deep indigo stage, violet-tinted panels, near-white ink. Player one red-orange and player two blue as the two side colours, gold for the primary action, focus and the winner, pink-red for disputes and decisions, green for done. Light look: a pale violet ground, white panels, deeper side colours. Dela Gothic One for titles, names and scores; Onest for the rest. Skewed chips for state; the gold primary button is a slanted plate.

STORY: A player sees their next match as a versus plate with their side marked, opens the room and reports; the bracket fills with colour as winners take their slots. Organizers read the same plates in calmer, denser lists, and the queue marks disputes in pink-red.

FIRST VIEWPORT: A 56px bar on the stage with the mark and wordmark. Under it the tournament's name in the display face, its status chip, game and the Overview / Bracket / Matches tabs. For a signed-in player the next-match plate comes first with "Open match room" as the gold primary; then the bracket fills the column.

FORM: Select screen, #1 on my ordered list, chosen by the user over the dealt Backglass (#7). seed:7cc18c1ad431ea32

SIGNATURE: Winner takes the plate. Every match (bracket node, list row, next match, room, queue) is two slots, player one then player two; once decided the winner's slot fills with its side colour and the loser's drains, a live match is ringed gold and a disputed one pink-red. Organizer screens keep the fill and drop the motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
