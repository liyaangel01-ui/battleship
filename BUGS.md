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
