---
name: testing-battleship
description: How to build, serve, and end-to-end test the single-player React/TS/Vite Battleship app (placement, full game to win/loss, responsive and keyboard checks).
---

# Testing the Battleship app

Frontend-only React + TypeScript + Vite app. No backend, no accounts, no credentials.

## Devin Secrets Needed

None.

## Run it

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
npm install
npm run build && npx vite preview --port 4173   # production build, http://localhost:4173
# or: npm run dev                                # http://localhost:5173
```

Node 22 is required; the default node on the box may be older. A preview server may already be
running on 4173 — check before starting another.

## App structure that matters for testing

- Every board square is a `<button aria-label="A-1, <state>">`, and it is `disabled` once fired.
  The stripped DOM returned with screenshots therefore gives you the _entire_ board state as
  text — use it instead of squinting at pixels to decide the next shot or to assert markers.
- Opponent silhouettes are `<svg>` elements inside the `Opponent waters` section and are only
  rendered for **sunk** ships. Counting `<svg>` in that section vs. the number of sunk enemy
  ships is the cheapest way to prove enemy ships stay hidden.
- Game state persists to `localStorage['battleship.game.v1']`, so F5 mid-game is a valid
  persistence test and a refresh will NOT reset a game you want to restart (use Play again).

## Playing a full game efficiently

A complete game can take 100+ shots, so batch actions: fire 3–5 shots in one `computer` call
with 2s waits between them (the AI replies within ~1s), then read the returned DOM to plan the
next batch. Grid geometry on a maximised 1600px window (screenshot coordinate space):
opponent column A starts at x≈79 with ~30.5px per column, row 1 at y≈258 with ~30.7px per row.
Recompute from a screenshot if the window size differs.

Strategy that finishes quickly: sweep a diagonal/parity pattern to find ships, then fire the
four neighbours of any `hit` cell until the ship sinks. Ship lengths are Carrier 5,
Battleship 4, Cruiser 3, Submarine 3, Destroyer 2 — use the remaining unfired runs in the DOM
to guess where the last ship can still fit.

## Narrow-viewport testing

Chrome on Linux refuses to shrink below ~500px wide, so `wmctrl -e` alone cannot give a 390px
viewport. Shrink the window to its minimum and add page zoom:

```bash
wmctrl -r :ACTIVE: -b remove,maximized_vert,maximized_horz
wmctrl -r :ACTIVE: -e 0,0,0,406,900     # clamps to ~532px
```

then press `ctrl+plus` twice and `ctrl+minus` once (125% zoom) → CSS viewport ≈ 388px. Verify
with `document.documentElement.scrollWidth === clientWidth` for "nothing clipped". Restore with
`ctrl+0` and `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`.

## Gotchas

- After resizing the window from the shell, Chrome may lose foreground focus and
  `browser_console` will error with "Chrome is not in the foreground" — click the page first.
- The hit impact burst lasts ~300ms; a screenshot taken after the usual 2s wait will not show
  it. Capture it immediately after the click or rely on the recording.
- Keep the browser maximised while recording, and annotate each checklist item with
  `annotate_recording` test_start/assertion pairs.
