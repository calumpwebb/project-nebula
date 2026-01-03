import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/target/**',
      '**/_generated/**',
      '**/convex/_generated/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow triple-slash references for type declarations
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { path: 'always', types: 'prefer-import', lib: 'always' },
      ],
      // Block direct imports - enforce middleware usage
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/_generated/server'],
              message: 'Use wrapped query/mutation/action from middleware/server instead.',
            },
          ],
        },
      ],
    },
  }
)
