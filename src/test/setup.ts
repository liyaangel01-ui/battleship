import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only unmounts components automatically when Vitest's globals are enabled.
// This project keeps globals off and imports `describe`/`it` explicitly, so cleanup is wired
// up by hand — without it, every render in a file stacks up in the same document and queries
// start finding several copies of the same button.
afterEach(cleanup)

// The app saves its game to localStorage, which jsdom shares across the tests in a file, so a
// finished game would otherwise be reloaded by the next test instead of a fresh board.
afterEach(() => localStorage.clear())
