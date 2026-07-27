# Bug log

A living record of defects found while building this project: what went wrong, how it was
reproduced, the root cause, and how it was fixed. Entries are written as bugs are found rather
than reconstructed at the end, so the reproduction steps are the real ones.

Each entry follows the same shape:

- **Symptom** — what was observed.
- **Reproduction** — the minimal steps to see it again.
- **Root cause** — why it actually happened.
- **Fix** — what changed.
- **Prevention** — the test, type or check that now stops it coming back.

---

## BUG-001 — The lint step passed even when the code had lint problems

- **Severity:** medium (a broken quality gate, not a broken game — but it would have let real
  problems through for the rest of the project)
- **Found in:** Phase 1, while checking that each CI step actually fails when it should
- **Symptom:** `npm run lint` printed nothing and exited `0` on clean code, which looked
  correct. Deliberately introducing a lint problem produced a warning in the output but the
  command **still exited `0`**, so the CI job would have reported success.
- **Reproduction:**
  1. Create `src/probe.ts` containing a variable that is declared and never used.
  2. Run `npm run lint`.
  3. A `no-unused-vars` warning is printed, but `echo $?` reports `0`.
- **Root cause:** oxlint classifies these rules as warnings, and by default a warning does not
  affect the exit code. CI only fails a step on a non-zero exit code, so the lint job was
  effectively decorative.
- **Fix:** The `lint` script now runs `oxlint src e2e --deny-warnings`, which turns any
  warning into a non-zero exit.
- **Prevention:** Each CI step was verified by making it fail on purpose before being trusted.
  This is worth repeating for every gate added later: a quality gate that cannot fail is worse
  than no gate, because it produces false confidence.

## BUG-002 — End-to-end tests timed out waiting for a server that was already running

- **Severity:** medium (the entire end-to-end suite could not run)
- **Found in:** Phase 1, on the first run of `npm run test:e2e`
- **Symptom:** Playwright failed after a minute with
  `Timed out waiting 60000ms from config.webServer`. The preview server itself had started
  correctly and was printing its usual startup banner.
- **Reproduction:**
  1. Configure Playwright's `webServer.url` as `http://127.0.0.1:4173`.
  2. Run `npm run test:e2e`.
  3. Playwright waits the full timeout and fails, even though
     `curl http://localhost:4173/` returns `200`.
- **Root cause:** Not a Playwright problem at all. `vite preview` binds to the loopback
  _hostname_, which on this machine resolves to the IPv6 address `::1` — so nothing was
  listening on the IPv4 address `127.0.0.1` that Playwright was polling. Two names that are
  usually interchangeable were not interchangeable here.
- **Fix:** `playwright.config.ts` now uses `http://localhost:4173` for both `webServer.url`
  and `baseURL`, so it follows whichever loopback address the preview server chose.
- **Prevention:** The port and host are derived from single constants at the top of
  `playwright.config.ts`, so the test target and the server can never disagree. The end-to-end
  job runs on every pull request, so a regression here fails fast and visibly.

## BUG-003 — Simulation tests passed normally but timed out in the CI configuration

- **Severity:** medium (CI would have failed on every pull request from phase 3 onwards)
- **Found in:** Phase 3, after adding the AI simulation tests
- **Symptom:** `npm test` passed all 74 tests. `npm run test:coverage` — the command CI
  actually runs — failed two of them with `Test timed out in 5000ms`.
- **Reproduction:**
  1. Add a test that simulates hundreds of complete games, or generates thousands of random
     fleets.
  2. Run `npm test` — it passes in about 14 seconds.
  3. Run `npm run test:coverage` — the two heavy tests exceed the 5-second default timeout.
- **Root cause:** Two independent factors compounded. Vitest applies a 5-second timeout per
  test by default, and coverage instrumentation makes the code several times slower to
  execute, so tests that comfortably fit in the budget without coverage no longer did with it.
- **Fix:** The two heavy tests were given an explicit 60-second timeout, and their iteration
  counts were reduced (2,000 fleets to 1,000; 1,000 games to 500) — still far more evidence
  than any hand-written example set, at a fraction of the runtime.
- **Prevention:** Run the _exact command CI runs_ locally, not a convenient approximation.
  `npm test` and `npm run test:coverage` are not interchangeable, and only the second one is
  the gate that matters.

## BUG-004 — Component tests interfered with each other because rendered components were never unmounted

- **Severity:** high (component test results were meaningless)
- **Found in:** Phase 4, on the first component test file with more than one test in it
- **Symptom:** Eleven of thirteen new tests failed with `Found multiple elements with the role
"button" and name "Random fleet"`. The first test in the file passed; every later one saw
  several copies of the whole interface.
- **Reproduction:**
  1. Write two tests in one file that each call `render(<App />)`.
  2. Run them. The second test's queries find two of every element.
- **Root cause:** Testing Library unmounts components automatically only when Vitest's
  `globals` option is enabled. This project sets `globals: false` and imports `describe`/`it`
  explicitly, so the automatic `afterEach(cleanup)` was never registered and each render was
  appended to the same document.
- **Fix:** `src/test/setup.ts` now registers `afterEach(cleanup)` itself.
- **Prevention:** The failure was loud, which is the good case. The general lesson is that
  turning off a convenience default (`globals`) can silently switch off unrelated behaviour
  that depended on it — worth checking the first time a new kind of test is added.

## BUG-005 — The opponent's fleet panel revealed which ship a hit had struck

- **Severity:** high (it gave away information the game is built to withhold)
- **Found in:** Phase 5, while building the battle screen
- **Symptom:** The "Opponent fleet" panel showed damage per ship. Hitting one square of the
  enemy carrier lit up one segment of the carrier's row, so the player could tell which ship
  they had found and how long it was — before sinking it.
- **Reproduction:**
  1. Start a battle and fire until you get a hit.
  2. Read the opponent fleet panel: the hit is attributed to a named ship.
- **Root cause:** The panel was rendered from the full `Board`, which knows every placement.
  The AI is deliberately handed a restricted `OpponentView` so it cannot do this; the UI had
  no such restriction and quietly leaked the same information to the player.
- **Fix:** `FleetStatus` takes a `revealDamage` flag. Your own fleet shows damage; the
  opponent's shows only which ships have been sunk, and their full damage is revealed when the
  game ends. A `BattleScreen` test now asserts that a hit does not name a ship.
- **Prevention:** The lesson is that "the AI cannot cheat" and "the player cannot cheat" are
  two different guarantees, and only the first was designed in. Anything rendered from a board
  the viewer should not fully see now has to say explicitly how much of it is being revealed.

## BUG-006 — Saving the game to localStorage made tests contaminate each other

- **Severity:** medium (the tests, not the game — but tests that lie are worse than none)
- **Found in:** Phase 6, immediately after adding refresh persistence
- **Symptom:** Eight component tests failed as soon as persistence was added, including ones
  that had nothing to do with it: placement tests suddenly started with ships already on the
  board, and `starts fresh when the browser has nothing saved` found a battle in progress.
- **Reproduction:** with `afterEach(() => localStorage.clear())` removed from
  `src/test/setup.ts`, run `npx vitest run src/components` — 8 of 27 tests fail.
- **Root cause:** jsdom gives every test in a file the same `localStorage`. Each test saved its
  game on the way out, and the next test's `useGame` dutifully restored it. The tests were no
  longer independent: they passed or failed depending on what ran before them.
- **Fix:** `afterEach(() => localStorage.clear())` in the shared test setup, next to the
  existing Testing Library cleanup.
- **Prevention:** The general rule this belongs to: anything that outlives a render — storage,
  timers, module-level caches — has to be reset between tests, or the suite quietly becomes
  order-dependent. The reason it was caught at once is that the persistence tests use a fake
  storage they own, so the failures showed up as _other_ tests breaking, which is exactly the
  signal that shared state is involved.
