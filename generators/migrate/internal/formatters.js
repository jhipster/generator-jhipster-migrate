import { createRequire } from 'module';
import { join } from 'path';
import { pathToFileURL } from 'url';

import { flyImport } from 'fly-import';

import { GENERATOR_JHIPSTER } from '../constants.js';

const BOOTSTRAP_SUPPORT_SUBPATH = 'generators/bootstrap/support';
const BOOTSTRAP_SUPPORT = `${GENERATOR_JHIPSTER}/${BOOTSTRAP_SUPPORT_SUBPATH}`;

const pickFormatters = ({ createPrettierTransform, createESLintTransform }, source) => {
  if (!createPrettierTransform || !createESLintTransform) {
    throw new Error(`${BOOTSTRAP_SUPPORT} from ${source} does not provide createPrettierTransform and createESLintTransform`);
  }

  return { createPrettierTransform, createESLintTransform };
};

/**
 * fly-import spec of a generator-jhipster version.
 * Aliased by version, so every version has its own folder in fly-import's repository instead of replacing the previous one.
 * @param {string} version
 */
export const getGeneratorJHipsterSpec = version => `${GENERATOR_JHIPSTER}-${version}@npm:${GENERATOR_JHIPSTER}@${version}`;

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
 * Install generator-jhipster `version` with fly-import, in its repository outside the application, and import its formatters.
 * @param {string} version
 */
export const installAndImportFormatters = async version => {
  const spec = getGeneratorJHipsterSpec(version);
  return pickFormatters(await flyImport(spec, { subpath: BOOTSTRAP_SUPPORT_SUBPATH }), spec);
};
