import { describe, expect, it } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { createESLintTransform, createPrettierTransform } from 'generator-jhipster/generators/bootstrap/support';

import { importFormatters } from './formatters.js';
import { getGeneratorJHipsterRepository } from './generator-jhipster.js';

describe('formatters', () => {
  it('imports the formatters of the generator-jhipster installed in the folder', async () => {
    const formatters = await importFormatters(fileURLToPath(new URL('../../..', import.meta.url)));
    expect(formatters).toEqual({ createPrettierTransform, createESLintTransform });
  });

  it('fails when generator-jhipster is not installed in the folder', async () => {
    await expect(importFormatters(join(tmpdir(), 'jhipster-migrate-not-installed'))).rejects.toThrow();
  });

  it('installs each generator-jhipster version in its repository outside the application', () => {
    const repository = getGeneratorJHipsterRepository('9.4.0');
    expect(repository.startsWith(process.cwd())).toBe(false);
    expect(repository).not.toBe(getGeneratorJHipsterRepository('9.3.0'));
  });
});
