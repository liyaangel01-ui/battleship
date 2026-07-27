# Battleship

A single-player game of Battleship played in the browser against an AI opponent.

> **Status: Phase 1 of 7 — project scaffold.** The application shell, test suite, continuous
> integration and deployment pipeline are in place. Gameplay is added in the following
> milestones, one reviewable pull request at a time.

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

### Deliberate tradeoff: no backend

The game runs entirely in the browser. There is no account, nothing to persist beyond the
tab, and no second human to synchronise with, so the only thing a server would add is hiding
the AI's ship positions from someone who opens developer tools — at the cost of an API,
session handling and a second deployment. That complexity is not worth it for a single-player
game, and the effort is better spent on tests and polish.

The decision is deliberately reversible: because `src/domain/` is pure and framework-free, the
exact same rules module would run unchanged on a server if real multiplayer were ever wanted.

## Scope

**In scope:** manual ship placement with validation and a live preview (plus randomise and
reset conveniences), a hunt/target AI opponent, alternating turns, hit/miss/sunk feedback with
the sunk ship named, per-fleet ships-remaining tracking, win/loss detection, and a clear
game-over screen.

**Intentionally excluded:** online multiplayer, accounts, difficulty selection,
drag-and-drop placement, sound, and the salvo variant. Reducing scope on purpose is preferred
to adding complexity that none of the project's goals ask for.

## Bug log

Defects found during development are recorded in [BUGS.md](./BUGS.md) as they are found.
