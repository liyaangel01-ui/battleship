import type { ReactNode } from 'react'

/** The same marks the boards use, at the same scale, so the key cannot drift from the game. */
const KEYS: readonly { readonly label: string; readonly swatch: ReactNode }[] = [
  {
    label: 'Ship',
    swatch: <span className="h-2.5 w-4 bg-chalk/45" />,
  },
  {
    label: 'Hit',
    swatch: <span className="h-2.5 w-2.5 rounded-full bg-blast" />,
  },
  {
    label: 'Sunk',
    swatch: <span className="h-2.5 w-2.5 rounded-full bg-ember" />,
  },
  {
    label: 'Miss',
    swatch: <span className="h-2.5 w-2.5 rounded-full border border-fog" />,
  },
  {
    label: 'Not fired at',
    swatch: <span className="h-3 w-3 border border-line/60 bg-ink" />,
  },
]

/** What the marks on the boards mean, so the game does not have to be guessed at. */
export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.65rem] tracking-widest text-fog uppercase">
      {KEYS.map(({ label, swatch }) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-3 w-4 items-center justify-center">
            {swatch}
          </span>
          {label}
        </li>
      ))}
    </ul>
  )
}
