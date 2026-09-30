import { readFile } from 'fs/promises';
import { join } from 'path';

import { flyInstall, getConfig } from 'fly-import';

import { GENERATOR_JHIPSTER } from '../constants.js';

/**
 * fly-import repository of a generator-jhipster version, outside the application.
 * Each version needs its own repository: generator-jhipster must be installed in a folder called generator-jhipster
 * (it derives its namespaces from the folder name), so versions cannot be aliased side by side in one repository.
 * @param {string} version
 */
export const getGeneratorJHipsterRepository = version => join(getConfig().repositoryPath, GENERATOR_JHIPSTER, version);

/**
 * Install generator-jhipster `version` with fly-import in its repository.
 * @param {string} version
 * @returns {Promise<string>} the installed package path.
 */
export const installGeneratorJHipster = async version => {
  const { realpath } = await flyInstall(`${GENERATOR_JHIPSTER}@${version}`, { repositoryPath: getGeneratorJHipsterRepository(version) });
  if (!realpath) {
    throw new Error(`Could not install ${GENERATOR_JHIPSTER}@${version}`);
  }

  return realpath;
};

/**
 * Path of the `jhipster` cli of an installed generator-jhipster package.
 * @param {string} packagePath
 */
export const getGeneratorJHipsterCli = async packagePath => {
  const { bin } = JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8'));
  const cli = typeof bin === 'string' ? bin : bin?.jhipster;
  if (!cli) {
    throw new Error(`${packagePath} does not provide a jhipster cli`);
  }

  return join(packagePath, cli);
};
