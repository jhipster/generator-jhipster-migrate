import { describe, expect, it } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { createESLintTransform, createPrettierTransform } from 'generator-jhipster/generators/bootstrap/support';

import { getGeneratorJHipsterSpec, importFormatters } from './formatters.js';

describe('formatters', () => {
  it('imports the formatters of the generator-jhipster installed in the folder', async () => {
    const formatters = await importFormatters(fileURLToPath(new URL('../../..', import.meta.url)));
    expect(formatters).toEqual({ createPrettierTransform, createESLintTransform });
  });

  it('fails when generator-jhipster is not installed in the folder', async () => {
    await expect(importFormatters(join(tmpdir(), 'jhipster-migrate-not-installed'))).rejects.toThrow();
  });

  it('aliases generator-jhipster by version', () => {
    expect(getGeneratorJHipsterSpec('9.4.0')).toBe('generator-jhipster-9.4.0@npm:generator-jhipster@9.4.0');
  });
});
