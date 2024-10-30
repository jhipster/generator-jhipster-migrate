import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    hookTimeout: 40000,
    exclude: [...defaultExclude.filter(val => val !== '**/cypress/**'), '**/templates/**', '**/resources/**'],
  },
});
