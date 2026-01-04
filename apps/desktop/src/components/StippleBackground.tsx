/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-expect-error - Scaffold: useEffect will be used in later implementation
import { useEffect, useState } from 'react'

interface Dot {
  x: number
  y: number
  radius: number
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

// @ts-expect-error - Scaffold: generateDotsForCell will be used in later implementation
function generateDotsForCell(cellX: number, cellY: number, cellSize: number): Dot[] {
  const seed = hashCode(`${cellX},${cellY}`)
  const random = seededRandom(seed)

  const dotsPerCell = Math.floor((cellSize * cellSize * 0.08) / (Math.PI * 1.5 * 1.5))
  const dots: Dot[] = []

  for (let i = 0; i < dotsPerCell; i++) {
    dots.push({
      x: cellX * cellSize + random() * cellSize,
      y: cellY * cellSize + random() * cellSize,
      radius: 1.5,
    })
  }

  return dots
}

// @ts-expect-error - Scaffold: getVisibleCells will be used in later implementation
function getVisibleCells(
  windowWidth: number,
  windowHeight: number,
  cellSize: number
): [number, number][] {
  const centerX = windowWidth / 2
  const centerY = windowHeight / 2

  const cellsX = Math.ceil(centerX / cellSize) + 1
  const cellsY = Math.ceil(centerY / cellSize) + 1

  const cells: [number, number][] = []
  for (let x = -cellsX; x <= cellsX; x++) {
    for (let y = -cellsY; y <= cellsY; y++) {
      cells.push([x, y])
    }
  }

  return cells
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
