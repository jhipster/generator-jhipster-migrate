import chalk from 'chalk';

const choices = '(none, current, bundled, any npm version)';

import { asCommand } from 'generator-jhipster';

export default asCommand({
  options: {},
  configs: {
    sourceCli: {
      description: `Executable to use to generate the ${chalk.yellow('source')} application`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which executable should be used to generate the ${chalk.yellow('source')} application?`,
      },
      scope: 'blueprint',
    },
    targetCli: {
      description: `Executable used to generate the ${chalk.yellow('target')} application`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which executable should be used to generate the ${chalk.yellow('target')} application?`,
      },
      scope: 'blueprint',
    },
    sourceVersion: {
      description: `JHipster version to use to generate the ${chalk.yellow('source')} application ${choices} (default: current)`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which JHipster version should be used to generate the ${chalk.yellow(
          'source',
        )} application? ${choices} (default: current)`,
      },
      scope: 'blueprint',
    },
    targetVersion: {
      description: `JHipster version to use to generate the ${chalk.yellow('target')} application ${choices} (default: bundled)`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which JHipster version should be used to generate the ${chalk.yellow(
          'target',
        )} application? ${choices} (default: bundled)`,
      },
      scope: 'blueprint',
    },
    sourceCliOptions: {
      description: `Executable options to generate the ${chalk.yellow('source')} application`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which executable options to generate the ${chalk.yellow('source')} application?`,
      },
      scope: 'blueprint',
    },
    targetCliOptions: {
      description: `Executable options to generate the ${chalk.yellow('target')} application`,
      cli: {
        type: String,
      },
      prompt: {
        type: 'input',
        message: `Which executable options to generate the ${chalk.yellow('target')} application?`,
      },
      scope: 'blueprint',
    },
    verbose: {
      description: `Ask for configs, wait for config changes and shows output of the generation process`,
      cli: {
        type: Boolean,
      },
      scope: 'generator',
    },
  },
});
