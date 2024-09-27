import { setTimeout } from 'timers/promises';
import { appendFile, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { transform } from 'p-transform';
import { globby } from 'globby';
import semver from 'semver';
import gitignore from 'parse-gitignore';
import latestVersion from 'latest-version';
import { loadFile } from 'mem-fs';
import { setModifiedFileState } from 'mem-fs-editor/state';
import { createCommitTransform } from 'mem-fs-editor/transform';
import ora from 'ora';
import { ResetMode } from 'simple-git';
import BaseGenerator from 'generator-jhipster/generators/base-application';
import getNode from 'get-node';
import {
  createESLintTransform,
  createPrettierTransform,
  createRemoveUnusedImportsTransform,
} from 'generator-jhipster/generators/bootstrap/support';
import packageVersions from 'pkg-versions';

import { GENERATOR_JHIPSTER } from 'generator-jhipster';
import { GENERATOR_BOOTSTRAP } from 'generator-jhipster/generators';
import {
  ACTUAL_APPLICATION,
  BASE_APPLICATION,
  DEFAULT_CLI_OPTIONS,
  DEFAULT_CLI_OPTIONS_V7,
  GIT_DRIVER_PACKAGEJSON,
  GIT_DRIVER_PACKAGEJSON_REF,
  GIT_VERSION_NOT_ALLOW_MERGE_UNRELATED_HISTORIES,
  JSON_DRIVER_GIT_CONFIG,
  MIGRATE_CONFIG_FILE,
  MIGRATE_SOURCE_BRANCH,
  MIGRATE_TARGET_BRANCH,
  MIGRATE_TMP_FOLDER,
  SERVER_MAIN_RES_DIR,
  V7_NODE,
} from './constants.js';
import command from './command.js';
import { normalizeBlueprintName } from './internal/blueprints.js';

export default class extends BaseGenerator {
  /** @type {boolean} */
  verbose;

  constructor(args, options, features) {
    super(args, options, { jhipsterBootstrap: false, customCommitTask: true, customInstallTask: true, ...features });
  }

  async beforeQueue() {
    const bootstrapGenerator = await this.dependsOnJHipster(GENERATOR_BOOTSTRAP);
    bootstrapGenerator.upgradeCommand = true;
  }

  get [BaseGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      displayLogo() {
        this.log(chalk.green('Welcome to the JHipster Migrate Sub-Generator'));
        this.log(chalk.green('This will help migrate your current application codebase'));
      },

      assertJHipsterProject() {
        if (!this.config.existed) {
          throw new Error(
            "Could not find a valid JHipster application configuration, check if the '.yo-rc.json' file exists and if the 'generator-jhipster' key exists inside it.",
          );
        }

        if (!this.config.get('baseName')) {
          throw new Error('Current directory does not contain a JHipster project.');
        }
      },

      async assertGitPresent() {
        if (!(await this.checkGitVersion())) {
          this.log.warn('git is not found on your computer.\n', ` Install git: ${chalk.yellow('https://git-scm.com/')}`);
          throw new Error('Exiting the process.');
        }
      },

      async assertGitRepository() {
        const git = this.createGit();
        if (!(await git.checkIsRepo())) {
          await git.init().add('.').commit('initial', ['--allow-empty', '--no-verify']);
        }
      },

      async assertNoLocalChanges() {
        const result = await this.createGit().status();
        if (!result.isClean()) {
          throw new Error(
            ` local changes found.\n\tPlease commit/stash them before upgrading\n\t${result.files
              .map(file => `${file.index} ${file.path}`)
              .join('\n\t')}`,
          );
        }
      },

      createMigrationConfig() {
        this.blueprintStorage = this.createStorage(MIGRATE_CONFIG_FILE);
        this.blueprintConfig = this.blueprintStorage.createProxy();
      },

      loadOptions() {
        this.parseJHipsterCommand(command);
      },

      setDefaults() {
        this.blueprintStorage.defaults({
          sourceCli: 'jhipster',
          targetCli: 'jhipster',
          sourceVersion: 'current',
          targetVersion: 'bundled',
          sourceCliOptions: null,
          targetCliOptions: null,
        });
      },

      parseVerbose() {
        if (this.verbose) {
          this.options.askAnswered = true;
        } else {
          this.spawnCommandOptions = { stdio: 'ignore' };
        }
      },
    });
  }

  get [BaseGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async prompting() {
        if (this.verbose) {
          await this.prompt(this.prepareQuestions(command.configs));
        }
      },
    });
  }

  get [BaseGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      removeMigrateFromBlueprints() {
        delete this.options.blueprints;
        this.jhipsterConfig.blueprints = (this.jhipsterConfig.blueprints ?? [])
          .map(blueprint => ({ ...blueprint, name: normalizeBlueprintName(blueprint.name) }))
          .filter(blueprint => blueprint.name !== 'generator-jhipster-migrate');
      },
      async checkLatestBlueprintVersions() {
        const { blueprints } = this.jhipsterConfig;
        if (blueprints.length === 0) {
          this.log('No blueprints detected, skipping check of last blueprint version');
          return;
        }

        const targetBlueprints = [];
        for (const blueprint of blueprints) {
          await this.prompt([
            {
              type: 'input',
              name: 'version',
              message: `What version of ${blueprint.name} do you want to use?`,
              default: blueprint.version,
              choices: await packageVersions(blueprint.name),
            },
          ]);

          targetBlueprints.push({ name: blueprint.name, targetVersion: blueprint.version });
        }

        this.blueprintStorage.set('blueprints', targetBlueprints);
      },

      async detectCurrentBranch() {
        this.blueprintStorage.set('actualApplicationBranch', await this.createGit().revparse(['--abbrev-ref', 'HEAD']));
        this.blueprintStorage.set('sourceApplicationBranch', MIGRATE_SOURCE_BRANCH);
        this.blueprintStorage.set('targetApplicationBranch', MIGRATE_TARGET_BRANCH);
      },

      async cleanupOldMigrateSourceBranch() {
        await this.cleanupBranch(this.blueprintConfig.sourceApplicationBranch);
      },

      async cleanupOldMigrateTargetBranch() {
        await this.cleanupBranch(this.blueprintConfig.targetApplicationBranch);
      },

      async setupThreeWayDiff() {
        if (!this.verbose) return;

        const git = this.createGit();
        const THREE_WAY_DESCRIPTION = 'Three way merge';
        const DIFF3 = 'diff3';
        if ((await git.getConfig(`merge.conflictstyle`)).value?.trim() === DIFF3) {
          this.log.ok(`${chalk.green(THREE_WAY_DESCRIPTION)} already set up`);
          return;
        }

        this.log(`
 ${chalk.green(THREE_WAY_DESCRIPTION)} is recommended to merge. If selected following will be added to your global git configuration:
  ${chalk.yellow(`merge.conflictstyle = ${DIFF3}`)}
`);
        const result = await this.prompt([
          {
            type: 'confirm',
            name: 'setupThreeWayMerge',
            message: `Do you want to setup ${chalk.green(THREE_WAY_DESCRIPTION)}?`,
            default: false,
          },
        ]);

        if (!result.setupThreeWayMerge) {
          this.log.info(`${chalk.green(THREE_WAY_DESCRIPTION)} ignored`);
          return;
        }

        await git.addConfig('merge.conflictstyle', DIFF3, false, 'global');

        this.log.ok(`${THREE_WAY_DESCRIPTION} set up`);
        this.log(`
 To cleanup ${chalk.green(GIT_DRIVER_PACKAGEJSON)} run:
  ${chalk.yellow('git config --global --unset merge.conflictstyle')}
 `);
      },

      async setupGitPackageJsonDriver() {
        if (!this.verbose) return;

        const git = this.createGit();
        if (
          (await git.getConfig(`merge.${GIT_DRIVER_PACKAGEJSON_REF}.driver`)).value &&
          (await git.raw(['check-attr', 'merge', 'package.json'])).trim().endsWith(GIT_DRIVER_PACKAGEJSON_REF)
        ) {
          this.log.ok(`${chalk.green(GIT_DRIVER_PACKAGEJSON)} already set up`);
          return;
        }

        this.log(`
 ${chalk.green(GIT_DRIVER_PACKAGEJSON)} is recommended to merge ${chalk.green(
   'package.json',
 )}. If selected following will be added to your global git configuration:
  ${Object.entries(JSON_DRIVER_GIT_CONFIG)
    .map(([key, value]) => chalk.yellow(`${key} = ${value}`))
    .join('\n  ')}

 And ${chalk.green('~/.gitattributes')} will be created with:
  ${chalk.yellow(`package.json merge=${GIT_DRIVER_PACKAGEJSON_REF}`)}

 For more information see https://github.com/mshima/${GIT_DRIVER_PACKAGEJSON}.
 `);
        const result = await this.prompt([
          {
            type: 'confirm',
            name: 'setupJsonDriver',
            message: `Do you want to setup ${chalk.green(GIT_DRIVER_PACKAGEJSON)}?`,
            default: false,
          },
        ]);

        if (!result.setupJsonDriver) {
          this.log.info(`${chalk.green(GIT_DRIVER_PACKAGEJSON)} ignored`);
          return;
        }

        const cleanup = [];
        for (const [key, value] of Object.entries(JSON_DRIVER_GIT_CONFIG)) {
          if (!(await git.getConfig(key)).value) {
            await git.addConfig(key, value, false, 'global');
            cleanup.push(`git config --global --unset ${key}`);
          }
        }

        if ((await git.raw(['check-attr', 'merge', 'package.json'])).includes('unspecified')) {
          const gitattributesFile = (await git.getConfig('core.attributesfile')).value;
          await appendFile(gitattributesFile, `package.json merge=${GIT_DRIVER_PACKAGEJSON_REF}\n`);
          cleanup.push(`Remove 'package.json merge=${GIT_DRIVER_PACKAGEJSON_REF}' line from ${gitattributesFile}`);
        }

        this.log.ok(`${GIT_DRIVER_PACKAGEJSON} set up`);
        this.log(`
 To cleanup ${chalk.green(GIT_DRIVER_PACKAGEJSON)} run:
  ${chalk.yellow(cleanup.join('\n  '))}
 `);
      },
    });
  }

  get [BaseGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async prepareMigrateBranch() {
        const {
          sourceApplicationBranch,
          targetApplicationBranch,
          blueprints = [],
          sourceCli,
          sourceVersion,
          actualApplicationBranch,
          sourceCliOptions,
        } = this.blueprintConfig;

        const git = this.createGit();
        // Create and checkout migrate branch
        await git.checkout(['--orphan', sourceApplicationBranch]);
        this.log.ok(`created branch ${sourceApplicationBranch}`);

        // Remove/rename old files
        await this.cleanUp();

        if (this.verbose) {
          await this.prompt([
            {
              type: 'confirm',
              name: 'waitForEnvironment',
              message: `We are about to start generating the application using current JHipster version ${sourceVersion}. You can customize your environment now.`,
            },
          ]);
        }

        const regenerateBlueprints = blueprints.map(blueprint => ({
          name: normalizeBlueprintName(blueprint.name),
          version: blueprint.version,
        }));

        // Regenerate the project
        await this.regenerate({
          cli: sourceCli,
          jhipsterVersion: sourceVersion,
          blueprints: regenerateBlueprints,
          type: BASE_APPLICATION,
          cliOptions: (sourceCliOptions ? sourceCliOptions.split(' ') : undefined) ?? [],
        });

        // Add 1s between commits for more consistent git log
        await setTimeout(1000);

        await this.applyPrettier({ name: `applying prettier to ${BASE_APPLICATION} application`, type: BASE_APPLICATION });
        // Create the migrate target branch
        await git.checkoutLocalBranch(targetApplicationBranch);

        // Add 1s between commits for more consistent git log
        await setTimeout(1000);

        // Checkout actual branch
        await git.checkout(actualApplicationBranch);
        await this.applyPrettier({ name: `applying prettier to ${ACTUAL_APPLICATION} application`, type: ACTUAL_APPLICATION });

        // Add 1s between commits for more consistent git log
        await setTimeout(1000);

        // Create a diff to actual application
        await git
          .checkout(sourceApplicationBranch)
          .reset(actualApplicationBranch)
          .add(['.', '--', `:!${MIGRATE_TMP_FOLDER}`])
          .commit(`apply ${ACTUAL_APPLICATION} application to migration branch`, ['--allow-empty', '--no-verify']);

        const mergeOptions = [
          '--strategy',
          'ours',
          sourceApplicationBranch,
          '-m',
          `initial merge of ${sourceApplicationBranch} branch into application`,
        ];
        if (await this.checkGitVersion(GIT_VERSION_NOT_ALLOW_MERGE_UNRELATED_HISTORIES)) {
          mergeOptions.push('--allow-unrelated-histories');
        }

        // Add 1s between commits for more consistent git log
        await setTimeout(1000);

        // Register reference for merging
        await git.checkout(actualApplicationBranch).merge(mergeOptions);
        this.log.ok(`merged ${sourceApplicationBranch} into ${actualApplicationBranch}`);
      },
    });
  }

  get [BaseGenerator.DEFAULT]() {
    return this.asDefaultTaskGroup({
      async generateWithTargetVersion() {
        const {
          blueprints = [],
          targetApplicationBranch,
          targetCli,
          targetVersion: jhipsterVersion,
          targetCliOptions,
        } = this.blueprintConfig;

        await this.createGit().checkout(targetApplicationBranch);

        const regenerateBlueprints = blueprints.map(blueprint => ({
          name: blueprint.name,
          version: blueprint.targetVersion,
        }));

        // Remove/rename old files
        await this.cleanUp();

        if (this.verbose) {
          await this.prompt([
            {
              type: 'confirm',
              name: 'waitForChange',
              message: `You can change application configuration now. Continue?`,
            },
          ]);
        }

        await this.regenerate({
          cli: targetCli,
          jhipsterVersion,
          blueprints: regenerateBlueprints,
          type: 'target',
          cliOptions: (targetCliOptions ? targetCliOptions.split(' ') : undefined) ?? [],
        });
        await this.applyPrettier({ name: `applying prettier to ${targetApplicationBranch} application`, type: 'target' });
      },
    });
  }

  get [BaseGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async mergeChangesBack() {
        const { actualApplicationBranch, targetApplicationBranch } = this.blueprintConfig;
        const spinner = ora(`Merging changes back to ${actualApplicationBranch}`).start();

        try {
          await this.createGit()
            .checkout(actualApplicationBranch, ['-f'])
            .merge([targetApplicationBranch, '-m', `merging ${targetApplicationBranch} into application`])
            .reset(ResetMode.HARD);
          spinner.succeed('Migration patch applied');
        } catch (error) {
          this.log.error('Error creating migration merge', error.message);
          spinner.fail(error.message);
          this.skipInstall = true;
        }
      },
    });
  }

  get [BaseGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      removeblueprintConfig() {
        if (!this.options.writeblueprintConfig) {
          this.fs.delete(MIGRATE_CONFIG_FILE);
          this.rmRf(MIGRATE_TMP_FOLDER);
        }
      },
    });
  }

  get [BaseGenerator.INSTALL]() {
    return this.asInstallTaskGroup({
      install() {
        if (!this.options.skipInstall && !this.install) {
          this.log('Installing dependencies, please wait...');
          this.spawnSync('npm', ['install']);
        }
      },
    });
  }

  get [BaseGenerator.END]() {
    return this.asEndTaskGroup({
      async end() {
        const diff = await this.createGit().diff(['--name-only', '--diff-filter', 'U']);
        this.log.ok(chalk.bold('migrated successfully.'));
        if (diff) {
          this.log.warn(`please fix conflicts listed below and commit!\n${diff}`);
        }
      },
    });
  }

  async rmRf(file) {
    const absolutePath = this.destinationPath(file);
    if (this.verbose) {
      this.log.verboseInfo(`Removing ${absolutePath}`);
    }

    try {
      await rm(absolutePath, { recursive: true });
    } catch {
      // Ignore
    }
  }

  /**
   * Remove every generated file not related to the generation.
   */
  async cleanUp() {
    const ignoredFiles = gitignore(await readFile('.gitignore')).patterns ?? [];
    const filesToKeep = ['.yo-rc.json', '.jhipster', 'package.json', 'package-lock.json', 'node_modules', '.git', ...ignoredFiles];
    (await readdir(this.destinationPath())).forEach(file => {
      if (!filesToKeep.includes(file)) {
        this.rmRf(file);
      }
    });
    this.log.ok('cleaned up project directory');
  }

  async regenerate({ cli, jhipsterVersion, blueprints, type, cliOptions }) {
    const regenerateMessage = `regenerating ${chalk.yellow(type)} application using JHipster ${jhipsterVersion}`;
    const spinner = this.verbose ? undefined : ora(regenerateMessage);
    const packageJsonJHipsterVersion = this.getPackageJsonVersion();
    let requiresManualNode16;
    if (this.verbose) {
      this.log.info(regenerateMessage);
    }

    cliOptions = [...cliOptions, ...DEFAULT_CLI_OPTIONS.split(' ')];
    if (this.isV7(jhipsterVersion)) {
      cliOptions = [...cliOptions, ...DEFAULT_CLI_OPTIONS_V7.split(' ')];
    }

    const blueprintInfo = blueprints.length > 0 ? ` and ${blueprints.map(bp => `${bp.name}@${bp.version}`).join(', ')} ` : '';
    const message = `JHipster ${jhipsterVersion}${blueprintInfo}`;
    let spawnCommandOptions = { ...this.spawnCommandOptions };
    if (type === 'target') {
      await this.removeJHipsterVersion();
    }

    try {
      if (jhipsterVersion === 'current' && packageJsonJHipsterVersion) {
        if (this.isV7(packageJsonJHipsterVersion)) {
          cliOptions = [...cliOptions, ...DEFAULT_CLI_OPTIONS_V7.split(' ')];
          const { path: nodePath } = await getNode(V7_NODE);
          spawnCommandOptions = { ...spawnCommandOptions, execPath: nodePath, preferLocal: true };
        }

        cliOptions = ['--no', '--', cli, ...cliOptions];
        cli = 'npx';

        const installSpinner = this.verbose ? undefined : ora('running npm install');
        // Flush adapter
        await this.env.adapter.onIdle?.();
        installSpinner?.start?.();
        try {
          await this.spawnCommand('npm install', this.spawnCommandOptions);
          installSpinner?.succeed?.('npm install completed');
        } catch (error) {
          try {
            await this.rmRf('package-lock.json');
            await this.rmRf('node_modules');
            await this.spawnCommand('npm install', this.spawnCommandOptions);
            installSpinner?.succeed?.('npm install completed');
          } catch {
            installSpinner?.fail?.('npm install completed with error');
            throw error;
          }
        }
      } else if (jhipsterVersion === 'bundled') {
        const packagePath = this.env.getPackagePath('jhipster:app');
        cli = join(packagePath, 'dist/cli/jhipster.cjs');
        cliOptions = ['app', ...cliOptions];
      } else if (jhipsterVersion !== 'none') {
        if (jhipsterVersion === 'current') {
          jhipsterVersion = this.getCurrentSourceVersion();
          if (this.isV7(jhipsterVersion)) {
            cliOptions = [...cliOptions, ...DEFAULT_CLI_OPTIONS_V7.split(' ')];
            const { path: nodePath } = await getNode(V7_NODE);
            spawnCommandOptions = { ...spawnCommandOptions, execPath: nodePath, preferLocal: true };
          }
        }

        cliOptions = [
          '--package',
          `${GENERATOR_JHIPSTER}@${jhipsterVersion}`,
          ...blueprints.map(({ name, version }) => ['--package', `${name}@${version}`]).flat(),
          '--yes',
          '--',
          cli,
          ...cliOptions,
        ];
        cli = 'npx';
      }

      this.log.info(`Running ${cli} ${cliOptions.join(' ')}`);
      // Flush adapter
      await this.env.adapter.onIdle?.();
      spinner?.start?.();
      await this.spawn(cli, cliOptions, spawnCommandOptions);

      const keystore = `${SERVER_MAIN_RES_DIR}config/tls/keystore.p12`;
      this.rmRf(keystore);
      await this.createGit()
        .add(['.', '--', `:!${MIGRATE_TMP_FOLDER}`])
        .commit(`migration application generated with ${message} (${type})`, ['--allow-empty', '--no-verify']);

      if (spinner) {
        spinner.succeed(`successfully regenerated ${chalk.yellow(type)} application using ${message}`);
      } else {
        this.log.ok(`successfully regenerated ${chalk.yellow(type)} application using ${message}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`failed to regenerate ${chalk.yellow(type)} application using ${message}`);
      } else {
        this.log.error(`failed to regenerate ${chalk.yellow(type)} application using ${message}`);
      }

      throw error;
    }

    if (requiresManualNode16) {
      await this.prompt([
        {
          type: 'confirm',
          name: 'revertNode16',
          message: 'Revert node version to the previous one.',
        },
      ]);
    }
  }

  /**
   * Check git version.
   */
  async checkGitVersion(minVersion) {
    try {
      const rawVersion = await this.createGit().raw('--version');
      const gitVersion = String(rawVersion.match(/([0-9]+\.[0-9]+\.[0-9]+)/g));
      if (minVersion) {
        return semver.gte(gitVersion, minVersion);
      }

      return true;
    } catch {
      return false;
    }
  }

  getPackageJsonVersion() {
    return this.readDestinationJSON('package.json').devDependencies?.['generator-jhipster'];
  }

  getCurrentSourceVersion() {
    return this.readDestinationJSON('package.json').devDependencies?.['generator-jhipster'] ?? this.jhipsterConfig.jhipsterVersion;
  }

  async getDefaultTargetVersion() {
    return latestVersion(GENERATOR_JHIPSTER);
  }

  async applyPrettier({ type, ...options }) {
    await this.commit(
      options,
      transform(
        () => {},
        async function () {
          const files = await globby('**/*.{md,json,yml,html,cjs,mjs,js,ts,tsx,css,scss,vue,java}', { gitignore: true });
          for (const file of files) {
            const memFsFile = loadFile(file);
            setModifiedFileState(memFsFile);
            this.push(memFsFile);
          }
        },
      ),
    );

    await this.createGit()
      .add(['.', '--', `:!${MIGRATE_TMP_FOLDER}`])
      .commit(`apply updated prettier to ${type} application`, ['--allow-empty', '--no-verify']);
  }

  async removeJHipsterVersion() {
    await this.commit(
      {},
      transform(
        () => {},
        async function () {
          for (const file of ['.yo-rc.json']) {
            const memFsFile = loadFile(file);
            if (file === '.yo-rc.json') {
              const contents = JSON.parse(memFsFile.contents.toString());
              contents['generator-jhipster'].jhipsterVersion = undefined;
              memFsFile.contents = Buffer.from(JSON.stringify(contents));
            }

            setModifiedFileState(memFsFile);
            this.push(memFsFile);
          }
        },
      ),
    );
  }

  async commit(options, ...transforms) {
    await this.pipeline(
      {
        filter: () => false,
        refresh: false,
        ...options,
      },
      ...transforms,
      await createPrettierTransform.call(this, { ignoreErrors: true, prettierJava: true, prettierPackageJson: true }),
      createESLintTransform.call(this, { ignoreErrors: true, extensions: 'ts,js' }),
      createRemoveUnusedImportsTransform.call(this, { ignoreErrors: true }),
      createCommitTransform(),
    );
  }

  isV7(version) {
    return version.includes('.') && parseInt(version.split('.', 2), 10) < 8;
  }

  async cleanupBranch(branch) {
    const git = this.createGit();
    try {
      await git.revparse(['--verify', branch]);
    } catch {
      // Branch does not exist
      return;
    }

    const answers = await this.prompt([
      {
        type: 'confirm',
        name: 'deleteBranch',
        message: `Old migration branch ${branch} found. Do you want to delete it?`,
        default: false,
      },
    ]);
    if (answers.deleteBranch) {
      await git.deleteLocalBranch(branch);
    } else {
      throw new Error('Migration branch already exists');
    }
  }
}
