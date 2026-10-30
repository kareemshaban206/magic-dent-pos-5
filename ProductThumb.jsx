import { useEffect, useState } from 'react'

/**
 * Product picture with a graceful 🦷 fallback.
 * Shows a shimmer while loading, and swaps to the tooth icon if the URL is
 * empty or fails to load — never a broken image or a spinner that never ends.
 * `bare` drops the frame (border + background) so the picture can fill a card.
 */
export default function ProductThumb({
  src,
  name = '',
  className = '',
  rounded = 'rounded-lg',
  emojiClass = 'text-[16px]',
  bare = false,
}) {
  const url = typeof src === 'string' ? src.trim() : ''
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setFailed(false)
    setLoaded(false)
  }, [url])

  const showImage = Boolean(url) && !failed

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden ${
        bare ? '' : 'border border-slate-700/60 bg-slate-900/60'
      } ${rounded} ${className}`}
    >
      {showImage ? (
        <>
          {!loaded && (
            <span className="absolute inset-0 animate-pulse bg-slate-700/40" aria-hidden="true" />
          )}
          <img
            src={url}
            alt={name || 'صنف'}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      ) : (
        <span className={`leading-none ${emojiClass}`} role="img" aria-label={name || 'صنف'}>
          🦷
        </span>
      )}
    </div>
  )
}
