#!/usr/bin/env node

const { dirname, join } = require('path');
const { version, bin } = require('../package.json');

// Get package name to use as namespace.
// Allows blueprints to be aliased.
const packagePath = dirname(__dirname);
const devBlueprintPath = join(packagePath, '.blueprint');

(async () => {
  const { runJHipster, done, logger } = await import('generator-jhipster/cli');
  const executableName = Object.keys(bin)[0];

  runJHipster({
    executableName,
    executableVersion: version,
    defaultCommand: 'migrate',
    devBlueprintPath,
    commands: require('./commands.cjs'),
    printBlueprintLogo: () => {
      console.log('===================== JHipster migrate =====================');
      console.log('');
    },
    lookups: [{ packagePaths: [packagePath] }],
  }).catch(done);

  process.on('unhandledRejection', up => {
    logger.error('Unhandled promise rejection at:');
    logger.fatal(up);
  });
})();
