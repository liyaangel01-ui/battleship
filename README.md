# Battleship

A single-player game of Battleship played in the browser against an AI opponent.

Place your fleet, then trade shots with a hunt/target AI until one fleet is gone.

- **Play it:** [battleship-liya-angel.vercel.app](https://battleship-liya-angel.vercel.app) —
  deployed from `main` on Vercel (every pull request also gets its own preview deployment, so a
  change can be played before it is merged).
- **Bug log:** [BUGS.md](./BUGS.md) — what broke during development, how it was reproduced, and
  what stops it coming back.

## Getting started

Requires Node 22 (see `.nvmrc`).

```bash
npm ci        # install exactly the locked dependency versions
npm run dev   # start the dev server on http://localhost:5173
```

## Scripts

| Command                 | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Start the development server                               |
| `npm run build`         | Typecheck and produce the production build in `dist/`      |
| `npm run preview`       | Serve the production build locally                         |
| `npm run typecheck`     | TypeScript, no emit                                        |
| `npm run lint`          | Lint `src` and `e2e` with oxlint                           |
| `npm run format:check`  | Verify formatting (`npm run format` to fix)                |
| `npm test`              | Unit and component tests (Vitest)                          |
| `npm run test:coverage` | Tests with a coverage report                               |
| `npm run test:e2e`      | End-to-end tests against the production build (Playwright) |

## Tech stack

| Choice                       | Why                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **TypeScript**               | The game must never mis-apply its own rules; the compiler catches a whole class of mistakes before it can run |
| **React**                    | The UI is a direct function of game state, which is what React is for                                         |
| **Vite**                     | Fast dev server, minimal configuration, plain static output                                                   |
| **Tailwind CSS**             | A consistent, simple interface without inventing a CSS architecture                                           |
| **Vitest + Testing Library** | One test runner shared with the build tool; component tests exercise the real DOM                             |
| **Playwright**               | One end-to-end test that plays the game in a real browser                                                     |

## Architecture

The guiding rule is that **the game rules are pure and know nothing about React**.

```
src/
  domain/      Pure game rules: board, placement validation, firing, sinking, win detection
  ai/          The AI opponent: a single nextShot(view) function
  state/       One reducer that owns every legal state transition, plus a React hook
  components/  Presentation only: renders state, dispatches actions, contains no rules
  test/        Test setup
e2e/           Playwright end-to-end tests
```

Consequences of that rule:

- The part that must be correct 100% of the time can be tested exhaustively without
  rendering anything.
- There is exactly one place where the game can change state, so illegal moves (firing twice
  at the same square, firing before placement is finished, firing after the game is over) are
  rejected in one auditable spot.
- Randomness is injected rather than called inline, so AI behaviour and random ship placement
  are reproducible in tests.
- The AI receives only what a real opponent could see, so it structurally cannot cheat.

### How the AI opponent works

The AI uses the classic **hunt / target** strategy:

- **Hunting** — it fires at random squares where `(row + col)` is even. Because the shortest
  ship is two squares long, every ship must cover at least one square of that checkerboard,
  so skipping the other half cannot miss anything and roughly halves the search.
- **Targeting** — after a hit it works outwards from the damage, and as soon as two hits line
  up it follows that axis to the ends of the ship. When a ship sinks it goes back to hunting.

Two properties are worth knowing:

- **It cannot cheat.** It is only ever passed an `OpponentView` — its own shot history, where
  a hit does _not_ say which ship was struck (only a sinking names the ship, exactly as a real
  opponent would be told). Ship positions are not in the data it receives.
- **It stores no memory.** `nextShot(view, rng)` is a pure function that rebuilds its
  understanding by replaying the shot history each turn. With no AI state stored anywhere,
  there is nothing that can fall out of step with the board.

Over 1,000 simulated games it sinks a full fleet in **57 shots on average** (best 28, worst 100) — clearly better than random guessing (~95) and clearly worse than perfect play (17),
which is roughly where a human plays and makes for a fair game.

### Accessibility and input

The board is not a grid of coloured divs: every square is a real `<button>` whose accessible
name says where it is and what is there (`"D-4, Destroyer sunk"`), so the game is playable
without seeing it. Arrow keys walk the board and skip squares that can no longer be used, and
the result of every shot is written into an `aria-live` region as a sentence — the announcement
carries the outcome, not the colour of a square. A legend spells out what the colours mean.

### Surviving a refresh

The game is saved to `localStorage` after every move, so an accidental refresh does not lose a
battle. A saved game is treated as **untrusted input**: it is validated field by field on the
way in (`src/state/persistence.ts`), and anything unexpected — an older format, a hand-edited
ship, a square off the board — is discarded in favour of a fresh game. Persistence is a
convenience, and it is never allowed to break the game.

### Deliberate tradeoff: no backend

The game runs entirely in the browser. There is no account, no data worth keeping on a server,
and no second human to synchronise with, so the only thing a server would add is hiding
the AI's ship positions from someone who opens developer tools — at the cost of an API,
session handling and a second deployment. That complexity is not worth it for a single-player
game, and the effort is better spent on tests and polish.

The decision is deliberately reversible: because `src/domain/` is pure and framework-free, the
exact same rules module would run unchanged on a server if real multiplayer were ever wanted.

## Scope

**In scope:** manual ship placement with validation and a live preview (plus randomise and
reset conveniences), a hunt/target AI opponent, alternating turns, hit/miss/sunk feedback with
the sunk ship named, per-fleet ships-remaining tracking, a battle log, win/loss detection, a
clear game-over screen, keyboard and screen-reader support, and a game that survives a refresh.

**Intentionally excluded:** online multiplayer, accounts, difficulty selection,
drag-and-drop placement, sound, and the salvo variant. Reducing scope on purpose is preferred
to adding complexity that none of the project's goals ask for.

## Testing strategy

The suite is shaped by which mistakes would actually matter. Roughly 150 tests, of which very
few touch the DOM.

| Layer                         | What it covers                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules** (`src/domain`)      | Every placement rule and shot outcome, including the edges: last row, last column, ships that touch, repeat shots, the final hit on the final ship    |
| **Simulation** (`src/ai`)     | 500 complete games and 1,000 random fleets are played out, asserting invariants — every game ends, no square is ever fired at twice, no ship overlaps |
| **Transitions** (`src/state`) | The reducer rejects illegal moves: firing out of turn, firing after the game is over, starting before the fleet is complete                           |
| **Components**                | What the player can see and do: placement previews, hidden enemy ships, keyboard navigation, the fleet that survives a reload                         |
| **End to end** (`e2e/`)       | A real browser plays a real game against the production build, including winning it                                                                   |

Two deliberate choices are worth calling out:

- **Randomness is a parameter.** `seededRng(7)` replays an identical game, so AI behaviour and
  random placement are asserted rather than hoped for.
- **The AI is tested by simulation, not by example.** Its value is statistical, so the tests
  measure the distribution over hundreds of games instead of pinning one hand-written scenario.

## Bug log

Defects found during development are recorded in [BUGS.md](./BUGS.md) as they are found, with
reproduction steps, the root cause, the fix, and the test or habit that keeps each one from
coming back.
