/**
 * The title of the game. Rendered as the page's only `h1` wherever it appears, so the
 * document keeps a single top-level heading.
 */
export function Wordmark({ className = '' }: { readonly className?: string }) {
  return (
    <h1
      className={`font-mono text-xl leading-none font-semibold tracking-[0.35em] text-chalk uppercase ${className}`}
    >
      Battleship
    </h1>
  )
}
