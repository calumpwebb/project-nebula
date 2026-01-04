/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-expect-error - Scaffold: useEffect will be used in later implementation
import { useEffect, useState } from 'react'

// @ts-expect-error - Scaffold: Dot will be used in later implementation
interface Dot {
  x: number
  y: number
  radius: number
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
