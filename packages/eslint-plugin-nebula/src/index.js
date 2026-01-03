// Note: JS not TS because eslint.config.js is loaded by Node directly

const plugin = {
  meta: {
    name: 'eslint-plugin-nebula',
    version: '0.0.1',
  },
  rules: {},
  configs: {
    recommended: {
      plugins: ['nebula'],
      rules: {},
    },
  },
}

export default plugin
