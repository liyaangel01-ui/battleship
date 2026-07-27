const KEYS = [
  { label: 'Your ship', className: 'bg-ocean-300' },
  { label: 'Hit', className: 'bg-amber-400' },
  { label: 'Sunk', className: 'bg-rose-600' },
  { label: 'Miss', className: 'bg-ocean-900 ring-1 ring-inset ring-ocean-300/40' },
  { label: 'Not fired at', className: 'bg-ocean-700/40' },
]

/** What the colours on the boards mean, so the game does not have to be guessed at. */
export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ocean-300">
      {KEYS.map(({ label, className }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-3 w-3 rounded-[2px] ${className}`} />
          {label}
        </li>
      ))}
    </ul>
  )
}
