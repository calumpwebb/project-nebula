# Stipple Background Design

**Date:** 2026-01-03
**Status:** Approved

## Overview

Add a subtle stipple texture to the desktop app background. The pattern uses uniform 1.5px dots at 8% coverage, creating visual interest while maintaining the minimal aesthetic.

## Requirements

The pattern must:

- Display consistently across page loads
- Maintain position when the window resizes
- Generate dots on-demand for any viewport size
- Center the coordinate system on the viewport

## Implementation Approach

We generate the pattern as an SVG data URI and apply it as a CSS background. This avoids runtime canvas rendering costs and scales perfectly at any resolution.

### Coordinate System

The pattern uses an infinite grid centered on the viewport:

- Cell (0, 0) sits at viewport center
- Cell (1, 0) sits one cell to the right
- Cell (-1, 0) sits one cell to the left
- Each cell measures 500×500px

When the window resizes, the center remains at (0, 0). New cells appear at the edges.

### Dot Generation

Each cell generates dots deterministically using a seeded random number generator:

```typescript
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
```

Cell (5, -3) always produces the same dots because the seed derives from its coordinates.

### Seeded RNG

We need deterministic randomness:

```typescript
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}
```

### Visual Style

- Dot size: 1.5px radius (uniform)
- Dot color: `hsl(0, 0%, 97%)` (slightly darker than 99% background)
- Coverage: 8% of surface area
- Pattern: Random placement within each cell

## Component Structure

### StippleBackground Component

```typescript
export function StippleBackground() {
  const [backgroundImage, setBackgroundImage] = useState<string>('')

  useEffect(() => {
    const generatePattern = () => {
      const cellSize = 500
      const cells = getVisibleCells(window.innerWidth, window.innerHeight, cellSize)
      const allDots = cells.flatMap(([x, y]) => generateDotsForCell(x, y, cellSize))
      const svg = createSVG(allDots, window.innerWidth, window.innerHeight)
      setBackgroundImage(svg)
    }

    generatePattern()

    const debouncedResize = debounce(generatePattern, 250)
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [])

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundImage: `url("${backgroundImage}")` }}
    />
  )
}
```

The component:

- Generates the pattern on mount
- Regenerates when the window resizes
- Debounces resize events (250ms)
- Uses fixed positioning with -z-10 to sit behind all content

### Viewport Calculation

```typescript
function getVisibleCells(windowWidth: number, windowHeight: number, cellSize: number) {
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
```

We calculate cells from center outward, adding one cell of buffer to prevent edge gaps during resize.

### SVG Construction

```typescript
function createSVG(dots: Dot[], windowWidth: number, windowHeight: number): string {
  const circles = dots
    .map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.radius}" fill="hsl(0, 0%, 97%)" />`)
    .join('')

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${windowWidth}" height="${windowHeight}">
      <g transform="translate(${windowWidth / 2}, ${windowHeight / 2})">
        ${circles}
      </g>
    </svg>
  `)}`
}
```

The `transform="translate(...)"` centers our coordinate system at the viewport center.

## Integration

Add the component to `__root.tsx`:

```tsx
import { StippleBackground } from '../components/StippleBackground'

function RootLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <StippleBackground />
      {/* existing title bar */}
      {/* existing content */}
    </div>
  )
}
```

## Files

**Create:**

- `apps/desktop/src/components/StippleBackground.tsx`

**Modify:**

- `apps/desktop/src/routes/__root.tsx`

## Performance

- Pattern generates once on mount
- Regenerates only on resize (debounced 250ms)
- SVG scales with browser's vector renderer
- No runtime canvas operations
- Background sits on GPU layer (fixed positioning)
