import { dirname } from 'path';
import untildify from 'untildify';
import { fileURLToPath } from 'url';

export const V7_NODE = '16.20.2';

export const BASE_APPLICATION = 'source';
export const ACTUAL_APPLICATION = 'actual';

export const GENERATOR_JHIPSTER = 'generator-jhipster';
export const SERVER_MAIN_RES_DIR = 'src/main/resources/';

/* Constants used throughout */
export const DEFAULT_CLI_OPTIONS = '--force --skip-install --skip-git --ignore-errors --no-insight --skip-checks';
export const DEFAULT_CLI_OPTIONS_V7 = '--with-entities --prefer-global';
export const GIT_VERSION_NOT_ALLOW_MERGE_UNRELATED_HISTORIES = '2.9.0';

export const MIGRATE_SOURCE_BRANCH = `jhipster_migrate_${BASE_APPLICATION}`;
export const MIGRATE_TARGET_BRANCH = 'jhipster_migrate_target';
export const MIGRATE_TMP_FOLDER = '.jhipster-migrate';
export const MIGRATE_CONFIG_FILE = `${MIGRATE_TMP_FOLDER}/config.json`;

export const JSON_DRIVER_GIT_CONFIG = {
  'core.attributesfile': untildify('~/.gitattributes'),
  'merge.package-json.driver': 'npx --yes git-merge-packagejson %A %O %B',
  'merge.package-json.name': 'custom merge driver for package.json files',
};

export const GIT_DRIVER_PACKAGEJSON = 'git-merge-packagejson';
export const GIT_DRIVER_PACKAGEJSON_REF = 'package-json';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
