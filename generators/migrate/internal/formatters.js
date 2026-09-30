import { createRequire } from 'module';
import { join } from 'path';
import { pathToFileURL } from 'url';

import { GENERATOR_JHIPSTER } from '../constants.js';

import { installGeneratorJHipster } from './generator-jhipster.js';

const BOOTSTRAP_SUPPORT = `${GENERATOR_JHIPSTER}/generators/bootstrap/support`;

const pickFormatters = ({ createPrettierTransform, createESLintTransform }, source) => {
  if (!createPrettierTransform || !createESLintTransform) {
    throw new Error(`${BOOTSTRAP_SUPPORT} from ${source} does not provide createPrettierTransform and createESLintTransform`);
  }

  return { createPrettierTransform, createESLintTransform };
};

/**
 * Import `createPrettierTransform` and `createESLintTransform` from the generator-jhipster resolved from `folder`.
 * @param {string} folder folder where generator-jhipster is installed (in its node_modules) or the generator-jhipster package itself.
 * @returns {Promise<{ createPrettierTransform: Function, createESLintTransform: Function }>}
 */
export const importFormatters = async folder => {
  const require = createRequire(join(folder, 'package.json'));
  return pickFormatters(await import(pathToFileURL(require.resolve(BOOTSTRAP_SUPPORT)).href), folder);
};

/**
 * Install generator-jhipster `version` with fly-import, outside the application, and import its formatters.
 * @param {string} version
 */
export const installAndImportFormatters = async version => importFormatters(await installGeneratorJHipster(version));
