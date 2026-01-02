/// <reference path="./env.d.ts" />

export type Environment = 'local' | 'production'

// Const object for autocompletion
export const Environment = {
  Local: 'local',
  Production: 'production',
} as const satisfies Record<string, Environment>

function parse(value: string | undefined): Environment {
  if (value === 'production') return 'production'
  return 'local' // Default to local for safety
}

/** Get the current environment from process.env.ENVIRONMENT */
export function getEnvironment(): Environment {
  // Note: For Vite apps, VITE_ENVIRONMENT is aliased to ENVIRONMENT at build time
  // via vite.config.ts define option. This keeps the code universal.
  return parse(process.env.ENVIRONMENT)
}
