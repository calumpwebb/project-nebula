/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-expect-error - Scaffold: useEffect will be used in later implementation
import { useEffect, useState } from 'react'

// @ts-expect-error - Scaffold: Dot will be used in later implementation
interface Dot {
  x: number
  y: number
  radius: number
}

// @ts-expect-error - Scaffold: hashCode will be used in later implementation
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

// @ts-expect-error - Scaffold: seededRandom will be used in later implementation
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

export function StippleBackground() {
  // @ts-expect-error - Scaffold: setBackgroundImage will be used in later implementation
  const [backgroundImage, setBackgroundImage] = useState<string>('')

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined }}
    />
  )
}
