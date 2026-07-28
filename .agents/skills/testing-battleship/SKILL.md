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
- The hit impact burst is short (~420-450ms in newer commits, ~300ms before that); a screenshot
  taken after the usual 2s wait will not show it. Fire with a `left_click` and take the
  screenshot/`zoom` in the SAME `computer` call with no `wait` between them, then a second
  screenshot ~2s later to prove it cleared. The `zoom` action on the target cell region gives by
  far the most legible evidence.
- Objective burst check without timing luck: count
  `document.querySelectorAll('.animate-impact-flash, .animate-impact-ring, .animate-impact-spikes').length`
  — 3 on a hit, 0 on a miss. Careful: these elements stay MOUNTED for as long as the newest log
  entry is a hit (only the CSS animation ends at ~420ms), so the count proves presence/absence,
  not duration. Duration must be judged visually or from the recording.
- Sink animations (`.animate-splash-wash`, `.animate-splash-ring`, `.animate-splash-ring-late`,
  `.animate-splash-drop`) are even harder to catch than the hit burst because they are short AND
  spread over every square of the sunk ship, with a per-square `animationDelay` stagger. Techniques:
  (a) count generically with `document.querySelectorAll('[class*="animate-splash"]').length` — do NOT
  hardcode the class list, the number of primitives per square has already changed once (3 → 4).
  The invariant is `primitives × ship length` (with 4 primitives: Destroyer 8, Cruiser/Submarine 12,
  Battleship 16, Carrier 20) while `[class*="animate-impact"]` is 0. That proves both "splash covers
  the whole hull" and "no burst on a sinking shot".
  (b) also read each element's inline `style.animationDelay` — the set should be
  `index × SPLASH_STAGGER_MS` (45ms today) plus a `+110ms` late ring, which proves the ripple runs
  end to end rather than all squares firing at once.
  (c) **Preferred way to photograph it: freeze the real animations** instead of a CSS slowdown, so the
  captured frame reflects shipped timings:
  ```js
  const obs = new MutationObserver(() => {
    if (!document.querySelector('.animate-splash-wash')) return
    obs.disconnect()
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__froze = document.getAnimations().length
      document.getAnimations().forEach(a => { a.pause(); a.currentTime = 220 })
    }))
  })
  obs.observe(document.body, { childList: true, subtree: true })
  ```
  Arm this BEFORE the killing click, then `zoom` on the hull, then resume with
  `document.getAnimations().forEach(a => { try { a.play() } catch (e) {} })`.
  Gotcha: freezing immediately in the observer callback pauses 0 animations — you must wait two
  `requestAnimationFrame` ticks so the CSS animations have actually started. Check `window.__froze > 0`.
  A CSS `animation-duration` override still works as a fallback but changes timing, so say so in the
  report if you use it.
- Probing the mid-AI-turn window (AI reply is a 700ms `setTimeout` in `BattleScreen.tsx`): install
  a capture-phase `click` listener that pushes `[performance.now(), e.target.ariaLabel]` to a
  global array, then fire a shot and click "New game" in one `computer` call. Reading the array
  afterwards proves the second click really landed inside the 700ms window (e.g. 331ms apart).
  Then start a fresh battle and assert "Battle log — 0 shots" to prove the stray AI shot was
  cancelled.
- Font/typography regressions are cheapest to check via computed style: read
  `getComputedStyle(el).fontFamily` on one element per region (instruction line, helper note, legend
  label, button, log line, status, footer, game-over banner/summary) and assert they all start with
  the same stack (`ui-monospace, …`). A single stray `font-sans` shows up immediately because the
  `--font-sans` variable no longer exists.
- Reaching game over is fine to do by losing: batch parity-sweep shots and let the AI finish your
  fleet. Both endings render the same summary block, and the loss banner reads
  "You lose — your fleet is gone." At game over assert
  `document.querySelector('[aria-label="Start a new game"]') === null` and that exactly one
  "Play again" button exists.
- To focus a board square with the keyboard without firing it, click a harmless control after the
  grid (e.g. the "Battle log" `<summary>`) and press `shift+Tab` — disabled squares are skipped, so
  focus lands on the last enabled opponent square (J-10). Then arrow keys + Enter.
- Keep the browser maximised while recording, and annotate each checklist item with
  `annotate_recording` test_start/assertion pairs.
