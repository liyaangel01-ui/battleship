import { CommandButton } from './CommandButton.tsx'

interface GameOverBannerProps {
  readonly won: boolean
  readonly shots: number
  readonly onNewGame: () => void
}

/**
 * How the game ended, announced over the board rather than tucked between the two grids.
 *
 * The overlay itself ignores the pointer so the revealed fleets stay visible and nothing behind
 * it is trapped; only the banner takes clicks.
 */
export function GameOverBanner({ won, shots, onNewGame }: GameOverBannerProps) {
  const frame = won ? 'neon-gold' : 'neon-alarm'
  const wording = won ? 'neon-gold-text' : 'neon-alarm-text'

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-6">
      <section
        role="status"
        className={`animate-banner-pop pointer-events-auto flex flex-col items-center gap-4 border-2 bg-ink px-8 py-7 text-center sm:px-14 ${frame}`}
      >
        <h2 className={`text-base font-semibold tracking-[0.12em] uppercase sm:text-xl ${wording}`}>
          {won ? 'You win — the enemy fleet is destroyed.' : 'You lose — your fleet is gone.'}
        </h2>
        <p className="text-xs text-fog">
          {shots} shots were fired in total. The full enemy fleet is now revealed.
        </p>
        <CommandButton onClick={onNewGame}>Play again</CommandButton>
      </section>
    </div>
  )
}
