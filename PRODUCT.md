# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Players (primary).** Members of competitive game communities who sign up for an event and then play it. Their jobs: find a tournament and register, check whether their linked game account meets the requirements, find their next match, talk to their opponent, report the score, and follow the bracket and standings as the event runs. They often do this on a phone, between games or on a second screen.
- **Organizers.** Members of an organization who set events up and run them, usually on a laptop: structure (one stage, or groups then a final stage), requirements, participants and seeding, check-in, starting stages, and settling disputes and help requests from the match queue.
- **Bots and integrations.** Programs, such as a Discord bot, that run tournaments through the organization's REST API with an API key.

## Product Purpose

Tournament Manager is an open-source platform for organizing tournaments, inspired by Challonge. It was started by the team that ran FERTRIS, who found no flexible, open, API-friendly alternative. Success means an organizer can run a whole two-stage event, and players can play it, without spreadsheets or a separate chat channel to sort out results.

## Positioning

Game-neutral and open source: no single game or community owns the identity. It is still made by gamers for gamers, and it looks it. What a closed host can't offer is that every admin action is also available over a documented REST API, and that sign-in and eligibility rules come from pluggable auth modules (Discord, TETR.IO and others) that organizers can require per tournament.

## Operating Context

- Organizations have a public page (current and past tournaments) and an admin area (settings, members, API keys).
- A tournament moves through draft, registration, optional check-in, in progress and completed.
- Formats: single and double elimination, round robin and Swiss, as one stage or as groups followed by a final stage.
- During play, each match has a room with live chat and score reporting. Matching reports decide the match, conflicting ones dispute it, and players can ask an organizer for help. Organizers work through a queue of disputes and help requests.
- Live updates arrive over server-sent events.

## Capabilities and Constraints

- Stack is fixed: SvelteKit (Svelte 5), TypeScript and SCSS, deployed as a Docker image under Podman behind Apache.
- The interface is in English and must stay translatable (Paraglide messages), so layouts must survive longer strings.
- Bracket themes change how brackets look per tournament. Two are installed: `default`, which follows the site, and `tetrio`, which shows rank, TR and country from linked TETR.IO accounts.
- Admin pages need a session from a trusted sign-in module.
- Open: deployment (M9) is not built yet.

## Brand Commitments

- Working name "Tournament Manager". It is open source and was started as a FER _Programsko inženjerstvo_ course project.
- No logo or mascot exists yet.
- Personality: playful, colourful and loud at the moments that matter (a result coming in, a final, a champion), with type and colour that feel at home next to games. A dry, neutral "business tool" look is the failure this commitment exists to prevent.
- Game-neutral, not personality-neutral: the site's look borrows no single game's art, logo or style, so any game's event feels at home; game-specific flavor stays in modules and bracket themes.
- Dark is the main look and the default. A light look stays fully designed and available through a theme switch.
- Organizer work screens wear the same world, calmer: less motion and decoration, the same colours and type.

## Evidence on Hand

- Real product content: brackets, standings, match rooms, chat and the API reference, all generated from live data.
- No photographs, illustrations, logos, testimonials, user counts or press exist. Future work must not invent them.

## Product Principles

1. Players first on public pages: what's happening now (my next match, the live bracket, standings) comes before anything else, and it works with a thumb on a phone.
2. Organizers get dense, predictable work screens, calmer than the player-facing pages; every action they take in the UI also exists in the API.
3. Honest state: whether something is waiting, ready, reported, disputed or done is always visible and never guessed.
4. Fun with a purpose: the site's own character peaks where something happens (a report, a win, a final) and never hides state or slows a task. Games add their own character through modules and bracket themes.
