'use client'

import { useState } from 'react'

interface Props {
  src?: string | null
  alt: string
  className?: string
}

export default function ProductImage({ src, alt, className = '' }: Props) {
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    )
  }

  // K26 gaming placeholder — pure paths, zero font artifacts
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 select-none">
      <svg
        viewBox="0 0 56 52"
        className="h-11 w-11 opacity-20"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <polygon points="28,4 49,16 49,36 28,48 7,36 7,16" fill="#FFC107" />
        <path
          d="M21,15 L21,37 M21,27 L34,15 M21,27 L34,38"
          stroke="#111116"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
